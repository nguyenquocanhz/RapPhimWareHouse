package com.rapphim.warehouse.service;

import com.rapphim.warehouse.config.AdminProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Nhat ky cac thay doi tren trang quan tri.
 *
 * <h2>"Ai" o day nghia la gi</h2>
 * <p>He thong khong co tai khoan nguoi dung, chi co mot khoa quan tri chung. Nen khong
 * ghi duoc <i>ten nguoi</i>; thu gan nhat co the ghi la <b>dia chi mang</b> va trinh
 * duyet da goi. Trong mot may nha thi tung do du de phan biet "minh vua sua" voi "co
 * ai do trong nha vua sua".</p>
 *
 * <p>Dia chi doc tu {@code X-Forwarded-For} do may chu Next chuyen tiep - ban than
 * backend chi thay dia chi cua container web. Header do <b>gia duoc</b> neu ai do goi
 * thang vao API, nen day la nhat ky de xem lai chu khong phai bang chung.</p>
 *
 * <h2>Khong bao gio ghi gia tri khoa</h2>
 * <p>Chi ghi <i>ten</i> khoa va da dat hay da xoa. Ghi ca gia tri thi nhat ky tro thanh
 * noi ro ri khoa - dung cai ma no dang di bao ve.</p>
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    /** Giu lai bay nhieu muc gan nhat; cu hon thi rot di. */
    private static final int MAX_ENTRIES = 200;

    private final AdminProperties admin;
    private final ObjectMapper mapper;

    /** Muc moi nhat nam dau, de doc ra khong phai dao nguoc. */
    private final Deque<Entry> entries = new ArrayDeque<>();

    public AuditService(AdminProperties admin, ObjectMapper mapper) {
        this.admin = admin;
        this.mapper = mapper;
        load();
    }

    /**
     * Mot lan thay doi.
     *
     * @param at      thoi diem, dang ISO-8601
     * @param action  viec da lam, vi du {@code source.save}
     * @param target  doi tuong bi tac dong: ma nguon hoac ten khoa
     * @param actor   dia chi mang cua nguoi goi
     * @param agent   trinh duyet da goi, cat ngan
     * @param ok      thanh cong hay that bai
     * @param detail  loi nhan them, vi du ly do that bai
     */
    public record Entry(
            String at,
            String action,
            String target,
            String actor,
            String agent,
            boolean ok,
            String detail
    ) {
    }

    public synchronized List<Entry> recent(int limit) {
        return entries.stream().limit(Math.max(1, Math.min(limit, MAX_ENTRIES))).toList();
    }

    /** Ghi mot muc va luu ngay xuong dia. */
    public synchronized void record(HttpServletRequest request,
                                    String action,
                                    String target,
                                    boolean ok,
                                    String detail) {

        Entry entry = new Entry(
                Instant.now().toString(),
                action,
                target,
                actorOf(request),
                agentOf(request),
                ok,
                detail);

        entries.addFirst(entry);
        while (entries.size() > MAX_ENTRIES) {
            entries.removeLast();
        }

        // Ghi hong thi chi ghi canh bao, khong nem loi: mat mot dong nhat ky khong dang
        // de lam hong chinh thao tac vua thanh cong.
        try {
            persist();
        } catch (Exception ex) {
            log.warn("Không ghi được nhật ký quản trị: {}", ex.getMessage());
        }
    }

    /**
     * Dia chi cua nguoi goi.
     *
     * <p>Uu tien {@code X-Forwarded-For} vi backend nam sau may chu Next; khong co thi
     * lui ve dia chi ket noi truc tiep.</p>
     */
    private String actorOf(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // Header co the co nhieu dia chi noi bang dau phay; dia chi dau la nguoi goi.
            return forwarded.split(",")[0].trim();
        }
        String remote = request.getRemoteAddr();
        return remote == null ? "khong ro" : remote;
    }

    private String agentOf(HttpServletRequest request) {
        String agent = request.getHeader("User-Agent");
        if (agent == null || agent.isBlank()) {
            return "khong ro";
        }
        return agent.length() > 120 ? agent.substring(0, 120) : agent;
    }

    // ------------------------------------------------------------------ luu tru

    private Path file() {
        Path sources = Path.of(admin.sourcesFile());
        Path parent = sources.getParent();
        return parent == null ? Path.of("audit.json") : parent.resolve("audit.json");
    }

    private void load() {
        Path path = file();
        if (!Files.exists(path)) {
            return;
        }
        try {
            Entry[] saved = mapper.readValue(Files.readString(path), Entry[].class);
            for (Entry entry : saved) {
                entries.addLast(entry);
            }
            log.info("Đã nạp {} mục nhật ký từ {}", entries.size(), path);
        } catch (Exception ex) {
            log.warn("Không đọc được {}: {}", path, ex.getMessage());
        }
    }

    private void persist() throws IOException {
        Path path = file();
        Path parent = path.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        Files.writeString(path, mapper.writeValueAsString(new ArrayList<>(entries)));
    }
}
