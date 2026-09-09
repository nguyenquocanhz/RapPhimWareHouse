package com.rapphim.warehouse.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Chuyen phu de sang WebVTT - the &lt;track&gt; cua trinh duyet chi doc duoc dinh dang nay.
 */
class SubtitleServiceTest {

    private final SubtitleService service = new SubtitleService();

    @Test
    @DisplayName("SRT: doi dau phay cua moc thoi gian thanh dau cham va bo so thu tu")
    void convertsSrt() {
        String srt = """
                1
                00:00:01,000 --> 00:00:04,500
                Thánh Khư mở đầu.

                2
                00:01:10,250 --> 00:01:12,000
                Dòng thứ hai.
                """;

        String vtt = service.toWebVtt(srt.getBytes(StandardCharsets.UTF_8), "tap-01.srt");

        assertThat(vtt).startsWith("WEBVTT");
        assertThat(vtt).contains("00:00:01.000 --> 00:00:04.500");
        assertThat(vtt).contains("00:01:10.250 --> 00:01:12.000");
        assertThat(vtt).contains("Thánh Khư mở đầu.");
        // So thu tu cua SRT khong con y nghia trong VTT.
        assertThat(vtt).doesNotContain("\n1\n");
    }

    @Test
    @DisplayName("ASS: lay dong thoai, bo the dinh dang, chuan hoa moc thoi gian")
    void convertsAss() {
        String ass = """
                [Script Info]
                Title: Thanh Khu

                [V4+ Styles]
                Format: Name, Fontname
                Style: Default,Arial

                [Events]
                Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
                Dialogue: 0,0:00:02.50,0:00:05.00,Default,,0,0,0,,{\\pos(190,230)}Câu thoại đầu
                Dialogue: 0,0:00:06.00,0:00:08.25,Default,,0,0,0,,Hai dòng\\Ntrong một câu
                Comment: 0,0:00:09.00,0:00:10.00,Default,,0,0,0,,Không phải thoại
                """;

        String vtt = service.toWebVtt(ass.getBytes(StandardCharsets.UTF_8), "tap-01.ass");

        assertThat(vtt).startsWith("WEBVTT");
        assertThat(vtt).contains("00:00:02.500 --> 00:00:05.000");
        assertThat(vtt).contains("Câu thoại đầu");
        // The {\pos(...)} la lenh dat vi tri, khong duoc hien ra man hinh.
        assertThat(vtt).doesNotContain("\\pos");
        // \N trong ASS la xuong dong.
        assertThat(vtt).contains("Hai dòng\ntrong một câu");
        // Dong Comment khong phai thoai.
        assertThat(vtt).doesNotContain("Không phải thoại");
    }

    @Test
    @DisplayName("VTT san thi giu nguyen, chi them dong tieu de neu thieu")
    void keepsExistingVtt() {
        String body = "00:00:01.000 --> 00:00:02.000\nXin chào\n";

        assertThat(service.toWebVtt(body.getBytes(StandardCharsets.UTF_8), "a.vtt"))
                .startsWith("WEBVTT")
                .contains("Xin chào");

        String already = "WEBVTT\n\n" + body;
        assertThat(service.toWebVtt(already.getBytes(StandardCharsets.UTF_8), "a.vtt"))
                .isEqualTo(already);
    }

    @Test
    @DisplayName("Bo dau BOM de dong WEBVTT nam dau file")
    void stripsByteOrderMark() {
        String withBom = "﻿WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nXin chào\n";

        assertThat(service.toWebVtt(withBom.getBytes(StandardCharsets.UTF_8), "a.vtt"))
                .startsWith("WEBVTT");
    }
}
