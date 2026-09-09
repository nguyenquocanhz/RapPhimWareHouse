package com.rapphim.warehouse.service;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Chuyen phu de sang WebVTT.
 *
 * <p>The {@code <track>} cua trinh duyet chi doc duoc WebVTT, trong khi phu de tu lam
 * gan nhu luon la .srt hoac .ass. Chuyen doi phai lam o phia server: lam o trinh duyet
 * thi moi lan mo phim lai phai tai them ma chuyen doi, va con vuong CORS voi kho.</p>
 */
@Service
public class SubtitleService {

    /** Moc thoi gian cua SRT dung dau phay, WebVTT dung dau cham. */
    private static final Pattern SRT_TIME =
            Pattern.compile("(\\d{1,2}:\\d{2}:\\d{2}),(\\d{1,3})");

    /** Dong thoai trong file ASS: Dialogue: Layer,Start,End,Style,... */
    private static final Pattern ASS_DIALOGUE =
            Pattern.compile("^Dialogue:\\s*[^,]*,([^,]+),([^,]+),(?:[^,]*,){6}(.*)$");

    /** The dinh dang trong ASS, vi du {\\pos(100,200)} - bo het khi sang VTT. */
    private static final Pattern ASS_OVERRIDE = Pattern.compile("\\{[^}]*\\}");

    /**
     * Doc noi dung phu de va tra ve chuoi WebVTT.
     *
     * @param raw      byte tho cua file
     * @param filename ten file, dung de biet dinh dang goc
     */
    public String toWebVtt(byte[] raw, String filename) {
        String text = decode(raw);
        String lower = filename == null ? "" : filename.toLowerCase(Locale.ROOT);

        if (lower.endsWith(".vtt")) {
            // Da dung dinh dang, chi bao dam co dong tieu de.
            return text.startsWith("WEBVTT") ? text : "WEBVTT\n\n" + text;
        }
        if (lower.endsWith(".ass") || lower.endsWith(".ssa")) {
            return fromAss(text);
        }
        return fromSrt(text);
    }

    /**
     * Doc byte thanh chuoi.
     *
     * <p>Phu de tieng Viet hay bi luu bang bang ma cu. UTF-8 sai thi cac ky tu co dau
     * bien thanh dau hoi, nen phai thu lai bang Windows-1258 - bang ma tieng Viet cua
     * Windows - truoc khi dau hang.</p>
     */
    private String decode(byte[] raw) {
        String utf8 = new String(raw, StandardCharsets.UTF_8);
        if (!utf8.contains("�")) {
            // Bo dau BOM neu co, khong thi dong "WEBVTT" dau file se khong duoc nhan.
            return utf8.startsWith("﻿") ? utf8.substring(1) : utf8;
        }
        try {
            return new String(raw, java.nio.charset.Charset.forName("windows-1258"));
        } catch (Exception ex) {
            return utf8;
        }
    }

    private String fromSrt(String text) {
        StringBuilder out = new StringBuilder("WEBVTT\n\n");

        for (String line : text.split("\\r?\\n")) {
            Matcher matcher = SRT_TIME.matcher(line);
            if (matcher.find()) {
                // Doi ca hai moc trong cung mot dong "00:00:01,000 --> 00:00:04,000".
                out.append(matcher.replaceAll("$1.$2")).append('\n');
                continue;
            }
            // So thu tu cua SRT khong co y nghia trong VTT, bo di cho gon.
            if (line.trim().matches("\\d+")) {
                continue;
            }
            out.append(line).append('\n');
        }
        return out.toString();
    }

    private String fromAss(String text) {
        StringBuilder out = new StringBuilder("WEBVTT\n\n");

        for (String line : text.split("\\r?\\n")) {
            Matcher matcher = ASS_DIALOGUE.matcher(line.trim());
            if (!matcher.matches()) {
                continue;
            }

            String start = assTime(matcher.group(1).trim());
            String end = assTime(matcher.group(2).trim());
            String body = ASS_OVERRIDE.matcher(matcher.group(3)).replaceAll("")
                    .replace("\\N", "\n")
                    .replace("\\n", "\n")
                    .replace("\\h", " ")
                    .trim();

            if (body.isEmpty()) {
                continue;
            }
            out.append(start).append(" --> ").append(end).append('\n')
                    .append(body).append("\n\n");
        }
        return out.toString();
    }

    /** ASS ghi gio dang {@code 0:00:01.00}, WebVTT can {@code 00:00:01.000}. */
    private String assTime(String value) {
        String[] parts = value.split(":");
        if (parts.length != 3) {
            return "00:00:00.000";
        }
        String[] secs = parts[2].split("\\.");
        String centis = secs.length > 1 ? secs[1] : "0";

        return "%02d:%02d:%02d.%s".formatted(
                parseOr(parts[0]),
                parseOr(parts[1]),
                parseOr(secs[0]),
                (centis + "000").substring(0, 3));
    }

    private int parseOr(String value) {
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }
}
