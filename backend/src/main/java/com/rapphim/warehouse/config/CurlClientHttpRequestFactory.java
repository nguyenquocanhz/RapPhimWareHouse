package com.rapphim.warehouse.config;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.AbstractClientHttpRequest;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpResponse;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * {@link ClientHttpRequestFactory} chay moi request qua tien ich {@code curl} cua he thong
 * thay vi HTTP client cua Java.
 *
 * <p>Ly do: VSMOV da chuyen site sang sau Cloudflare. Bo loc bot cua Cloudflare chan dung
 * van tay TLS (JA3) cua thu vien TLS trong Java (JSSE) - bat ke TLS 1.2 hay 1.3 - trong
 * khi cho openssl qua. {@code curl} dung openssl nen bat tay lot, va no khai bao trung thuc
 * la "curl": KHONG gia dang trinh duyet, KHONG nan van tay gia.</p>
 *
 * <p>Chi dung cho nguon VSMOV; cac nguon khac van dung HTTP client mac dinh cua Java.</p>
 */
public class CurlClientHttpRequestFactory implements ClientHttpRequestFactory {

    /**
     * Danh dau cuoi phan hoi de tach ma trang thai khoi than. Chuoi nay khong the xuat
     * hien trong JSON hop le nen tach an toan.
     */
    private static final String STATUS_MARKER = "\n__RAPPHIM_STATUS__:";

    private final Duration connectTimeout;
    private final Duration readTimeout;

    public CurlClientHttpRequestFactory(Duration connectTimeout, Duration readTimeout) {
        this.connectTimeout = connectTimeout;
        this.readTimeout = readTimeout;
    }

    @Override
    public ClientHttpRequest createRequest(URI uri, HttpMethod httpMethod) {
        return new CurlRequest(uri, httpMethod, connectTimeout, readTimeout);
    }

    private static final class CurlRequest extends AbstractClientHttpRequest {

        private final URI uri;
        private final HttpMethod method;
        private final Duration connectTimeout;
        private final Duration readTimeout;
        private final ByteArrayOutputStream body = new ByteArrayOutputStream();

        private CurlRequest(URI uri, HttpMethod method, Duration connectTimeout, Duration readTimeout) {
            this.uri = uri;
            this.method = method;
            this.connectTimeout = connectTimeout;
            this.readTimeout = readTimeout;
        }

        @Override
        public HttpMethod getMethod() {
            return method;
        }

        @Override
        public URI getURI() {
            return uri;
        }

        @Override
        protected OutputStream getBodyInternal(HttpHeaders headers) {
            return body;
        }

        @Override
        protected ClientHttpResponse executeInternal(HttpHeaders headers) throws IOException {
            List<String> command = new ArrayList<>();
            command.add("curl");
            command.add("-sS");            // im lang nhung van bao loi ra stderr
            command.add("--compressed");
            command.add("--connect-timeout");
            command.add(String.valueOf(Math.max(connectTimeout.toSeconds(), 1)));
            command.add("--max-time");
            command.add(String.valueOf(Math.max(readTimeout.toSeconds(), 1)));
            command.add("-X");
            command.add(method.name());
            headers.forEach((name, values) -> {
                for (String value : values) {
                    command.add("-H");
                    command.add(name + ": " + value);
                }
            });
            byte[] payload = body.toByteArray();
            if (payload.length > 0) {
                command.add("--data-binary");
                command.add("@-");         // doc than tu stdin
            }
            command.add("-w");
            command.add(STATUS_MARKER + "%{http_code}");
            command.add(uri.toString());

            Process process = new ProcessBuilder(command).start();
            if (payload.length > 0) {
                process.getOutputStream().write(payload);
            }
            process.getOutputStream().close();

            byte[] out = process.getInputStream().readAllBytes();
            byte[] errBytes = process.getErrorStream().readAllBytes();
            int exit;
            try {
                exit = process.waitFor();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                process.destroyForcibly();
                throw new IOException("Bi ngat khi cho curl", interrupted);
            }
            if (exit != 0) {
                throw new IOException("curl loi (ma " + exit + "): "
                        + new String(errBytes, StandardCharsets.UTF_8).strip());
            }

            return split(out);
        }

        private ClientHttpResponse split(byte[] out) throws IOException {
            byte[] markerBytes = STATUS_MARKER.getBytes(StandardCharsets.US_ASCII);
            int at = lastIndexOf(out, markerBytes);
            if (at < 0) {
                throw new IOException("Khong doc duoc ma trang thai tu curl");
            }
            byte[] bodyBytes = Arrays.copyOfRange(out, 0, at);
            String statusText = new String(out, at + markerBytes.length,
                    out.length - at - markerBytes.length, StandardCharsets.US_ASCII).strip();
            int status = Integer.parseInt(statusText.replaceAll("\\D.*$", ""));
            return new CurlResponse(status, bodyBytes);
        }

        private static int lastIndexOf(byte[] haystack, byte[] needle) {
            outer:
            for (int i = haystack.length - needle.length; i >= 0; i--) {
                for (int j = 0; j < needle.length; j++) {
                    if (haystack[i + j] != needle[j]) {
                        continue outer;
                    }
                }
                return i;
            }
            return -1;
        }
    }

    private static final class CurlResponse implements ClientHttpResponse {

        private final int status;
        private final byte[] body;

        private CurlResponse(int status, byte[] body) {
            this.status = status;
            this.body = body;
        }

        @Override
        public HttpStatusCode getStatusCode() {
            return HttpStatusCode.valueOf(status);
        }

        @Override
        public String getStatusText() {
            return "";
        }

        @Override
        public HttpHeaders getHeaders() {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            return headers;
        }

        @Override
        public InputStream getBody() {
            return new ByteArrayInputStream(body);
        }

        @Override
        public void close() {
            // Than da doc het vao bo nho, khong co tai nguyen phai dong.
        }
    }
}
