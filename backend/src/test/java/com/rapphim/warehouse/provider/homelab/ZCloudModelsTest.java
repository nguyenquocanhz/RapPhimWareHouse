package com.rapphim.warehouse.provider.homelab;

import com.rapphim.warehouse.provider.homelab.model.ZCloudModels.ListResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Doc JSON that cua ZCloud - ten truong ben do la snake_case nen de sai o day.
 */
@SpringBootTest
class ZCloudModelsTest {

    @Autowired
    private ObjectMapper mapper;

    private static final String SAMPLE = """
            {"prefix":"","folders":[],"items":[
              {"key":"phim/Thanh Khu/Thanh Khu - Tap 01.mp4","name":"Thanh Khu - Tap 01.mp4",
               "size":497812,"last_modified":"2026-09-01T10:00:00Z","etag":"mock"},
              {"key":"phim/Thanh Khu/Thanh Khu - Tap 01.vi.srt","name":"Thanh Khu - Tap 01.vi.srt",
               "size":202,"last_modified":"2026-09-01T10:00:00Z","etag":"mock"}
            ],"next_token":null,"truncated":false}
            """;

    @Test
    @DisplayName("Doc duoc danh sach doi tuong va gom thanh phim")
    void parsesListResponse() {
        ListResponse response = mapper.readValue(SAMPLE, ListResponse.class);

        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).name()).isEqualTo("Thanh Khu - Tap 01.mp4");
        assertThat(response.items().get(0).lastModified()).isEqualTo("2026-09-01T10:00:00Z");
        assertThat(response.nextToken()).isNull();

        var titles = MediaLibrary.build(response.items(), "phim/");
        assertThat(titles).hasSize(1);
        assertThat(titles.get(0).slug()).isEqualTo("thanh-khu");
        assertThat(titles.get(0).episodes()).hasSize(1);
        assertThat(titles.get(0).episodes().get(0).subtitles()).hasSize(1);
    }
}
