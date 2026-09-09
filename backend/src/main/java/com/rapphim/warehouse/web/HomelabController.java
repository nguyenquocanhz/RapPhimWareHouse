package com.rapphim.warehouse.web;

import com.rapphim.warehouse.exception.ResourceNotFoundException;
import com.rapphim.warehouse.provider.homelab.ZCloudClient;
import com.rapphim.warehouse.service.SubtitleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * Cac endpoint rieng cho kho phim tren homelab.
 */
@RestController
@RequestMapping("/api/v1/homelab")
@Tag(name = "Homelab", description = "Kho phim rieng chay tren homelab")
public class HomelabController {

    private final ZCloudClient client;
    private final SubtitleService subtitles;

    public HomelabController(ZCloudClient client, SubtitleService subtitles) {
        this.client = client;
        this.subtitles = subtitles;
    }

    /**
     * Tra ve mot file phu de da chuyen sang WebVTT.
     *
     * <p>Phai di qua day chu khong tro thang vao kho vi hai le: the {@code <track>}
     * chi doc WebVTT trong khi phu de tu lam thuong la .srt/.ass, va kho doi xac thuc
     * ma trinh duyet thi khong duoc giu khoa cua kho.</p>
     */
    @GetMapping(value = "/subtitle", produces = "text/vtt;charset=UTF-8")
    @Operation(summary = "Tai phu de cua kho rieng, da chuyen sang WebVTT")
    public ResponseEntity<String> subtitle(
            @Parameter(description = "Khoa cua file phu de trong kho", required = true)
            @RequestParam String key) {

        byte[] raw = client.download(key);
        if (raw == null || raw.length == 0) {
            throw new ResourceNotFoundException("SUBTITLE_NOT_FOUND", "Không tìm thấy phụ đề: " + key);
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/vtt;charset=UTF-8"))
                // Phu de khong doi, cho trinh duyet giu lai de doi tap khong tai lai.
                .cacheControl(CacheControl.maxAge(Duration.ofHours(6)).cachePublic())
                .body(subtitles.toWebVtt(raw, key));
    }
}
