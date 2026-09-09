package com.rapphim.warehouse.exception;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;

/**
 * Nem ra khi nguon phim ben ngoai (KKPhim / NguonC / TheMovieDB) loi hoac khong phan hoi.
 */
public class UpstreamException extends RuntimeException {

    /** Loi chung, khong biet ro nguyen nhan. */
    public static final String ERROR = "UPSTREAM_ERROR";

    /** Ket noi bi cat o tang mang, gan nhu chac chan la bi chan theo ten mien. */
    public static final String BLOCKED = "UPSTREAM_BLOCKED";

    private final String provider;
    private final String code;

    public UpstreamException(String provider, String message, Throwable cause) {
        this(provider, ERROR, message, cause);
    }

    public UpstreamException(String provider, String code, String message, Throwable cause) {
        super(message, cause);
        this.provider = provider;
        this.code = code;
    }

    public UpstreamException(String provider, String message) {
        this(provider, message, null);
    }

    public String getProvider() {
        return provider;
    }

    public String getCode() {
        return code;
    }

    /**
     * Doc mot loi mang thanh cau nguoi dung hieu duoc.
     *
     * <p>Truoc day cho nay nem thang {@code ex.getMessage()} ra man hinh, nen nguoi dung
     * doc duoc nguyen van mot dong ngoai le Java - vua kho hieu vua khong noi duoc phai
     * lam gi tiep. Ba truong hop duoi day khac han nhau ve cach xu ly, nen tach ra.</p>
     *
     * <p>Rieng ma {@link #BLOCKED} con de giao dien biet ma hien them huong dan: neu chi
     * so cau chu thi moi lan sua loi nhan la giao dien lai hong tham.</p>
     *
     * @param provider ma nguon, dung cho nhat ky
     * @param label    ten nguon hien cho nguoi dung doc
     */
    public static UpstreamException network(String provider, String label, Throwable cause) {
        if (has(cause, UnknownHostException.class)) {
            return new UpstreamException(provider, BLOCKED,
                    "Không tra được tên miền của " + label + ". Máy chủ tên miền đang trả sai "
                            + "hoặc bị chặn.", cause);
        }
        if (has(cause, SocketTimeoutException.class)) {
            return new UpstreamException(provider, ERROR,
                    label + " không trả lời kịp. Thử lại sau một lát.", cause);
        }
        if (has(cause, ConnectException.class)) {
            return new UpstreamException(provider, BLOCKED,
                    "Không mở được kết nối tới " + label + ".", cause);
        }
        // Bat tay TLS dut giua chung: may chu dich van mo cong, chi cat khi thay ten mien.
        // Day la dau hieu ro nhat cua viec bi chan theo ten mien.
        if (looksCut(cause)) {
            return new UpstreamException(provider, BLOCKED,
                    "Kết nối tới " + label + " bị cắt ngay khi bắt tay.", cause);
        }
        return new UpstreamException(provider, ERROR,
                "Không lấy được dữ liệu từ " + label + ".", cause);
    }

    private static boolean looksCut(Throwable cause) {
        for (Throwable at = cause; at != null; at = at.getCause()) {
            String message = at.getMessage();
            if (message != null
                    && (message.contains("terminated the handshake")
                    || message.contains("Connection reset")
                    || message.contains("connection abort"))) {
                return true;
            }
            if (at.getClass().getName().contains("SSLHandshakeException")) {
                return true;
            }
        }
        return false;
    }

    private static boolean has(Throwable cause, Class<? extends Throwable> type) {
        for (Throwable at = cause; at != null; at = at.getCause()) {
            if (type.isInstance(at)) {
                return true;
            }
        }
        return false;
    }
}
