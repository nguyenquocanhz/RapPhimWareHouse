package com.rapphim.warehouse.web;

import com.rapphim.warehouse.common.ApiResponse;
import com.rapphim.warehouse.dto.TvChannel;
import com.rapphim.warehouse.service.TvChannelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/**
 * Kenh truyen hinh truc tiep (nguon iptv-org), phuc vu qua server homelab de web va app
 * dung chung, co cache.
 */
@RestController
@RequestMapping("/api/v1/tv")
@Tag(name = "TV", description = "Kenh truyen hinh truc tiep")
public class TvController {

    private final TvChannelService service;

    public TvController(TvChannelService service) {
        this.service = service;
    }

    @GetMapping("/channels")
    @Operation(summary = "Danh sach kenh truyen hinh Viet Nam (nguon iptv-org)")
    public ResponseEntity<ApiResponse<List<TvChannel>>> channels() {
        List<TvChannel> channels = service.vietnamChannels();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(ApiResponse.ok(channels));
    }
}
