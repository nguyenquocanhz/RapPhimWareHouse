package com.rapphim.warehouse.provider.homelab;

import com.rapphim.warehouse.provider.homelab.model.ZCloudModels.ObjectItem;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Doc cay file cua kho phim rieng thanh danh sach phim.
 *
 * <h2>Quy uoc thu muc</h2>
 * <pre>
 *   &lt;prefix&gt;/Thanh Khu/Thanh Khu - Tap 01.mp4
 *   &lt;prefix&gt;/Thanh Khu/Thanh Khu - Tap 01.vi.srt
 *   &lt;prefix&gt;/Thanh Khu/Season 01/E02.mkv
 * </pre>
 *
 * <p>Thu muc dau tien duoi {@code prefix} la mot bo phim; moi file video ben trong -
 * o bat ky cap nao - la mot tap. File phu de duoc gan vao tap co cung ten goc.</p>
 *
 * <p><b>Day la phan duy nhat phu thuoc vao cach dat ten file.</b> Kho moi sap xep
 * khac di thi chi phai sua lop nay, phan con lai cua nguon khong doi.</p>
 */
public final class MediaLibrary {

    /** Duoi file duoc coi la video. */
    private static final List<String> VIDEO_EXT =
            List.of(".mp4", ".mkv", ".webm", ".m4v", ".avi", ".mov", ".ts");

    /** Duoi file duoc coi la phu de. */
    private static final List<String> SUBTITLE_EXT =
            List.of(".srt", ".vtt", ".ass", ".ssa");

    /**
     * Cac cach ghi so tap thuong gap, thu lan luot tu dang ro rang nhat.
     *
     * <p>Thu tu quan trong: "S01E02" phai duoc thu truoc "02" chung chung, neu khong
     * so mua phim se bi doc nham thanh so tap.</p>
     */
    private static final List<Pattern> EPISODE_PATTERNS = List.of(
            Pattern.compile("(?i)s\\d{1,2}\\s*e\\s*(\\d{1,4})"),
            Pattern.compile("(?i)\\b(?:tap|tập|ep|episode)\\s*[._-]?\\s*(\\d{1,4})\\b"),
            Pattern.compile("(?i)\\be(\\d{1,4})\\b"),
            Pattern.compile("[\\[(](\\d{1,4})[\\])]"),
            Pattern.compile("[-_\\s](\\d{1,4})\\s*$"),
            // File phu de hay duoc dat ten tran bang so tap: "03.srt". Phai de cuoi
            // cung va bat buoc khop ca ten, neu khong no se nuot cac mau o tren.
            Pattern.compile("^(\\d{1,4})$")
    );

    /** Duoi ngon ngu hay gap ngay truoc duoi file phu de, vi du "ten.vi.srt". */
    private static final Map<String, String> LANG_NAMES = Map.of(
            "vi", "Tiếng Việt",
            "vie", "Tiếng Việt",
            "en", "English",
            "eng", "English",
            "zh", "中文",
            "chi", "中文",
            "ja", "日本語",
            "jpn", "日本語"
    );

    private MediaLibrary() {
    }

    /** Mot duong phu de nam canh file video. */
    public record LibrarySubtitle(String label, String lang, String key) {
    }

    /** Mot tap phim trong kho. */
    public record LibraryEpisode(
            int number,
            String name,
            String slug,
            String filename,
            String key,
            List<LibrarySubtitle> subtitles
    ) {
    }

    /** Mot bo phim trong kho, tuong ung mot thu muc. */
    public record LibraryTitle(
            String slug,
            String name,
            String folder,
            String modifiedAt,
            List<LibraryEpisode> episodes
    ) {
    }

    /**
     * Gom danh sach file phang thanh cac bo phim.
     *
     * @param objects toan bo file lay tu kho
     * @param prefix  thu muc goc da cau hinh, se duoc cat khoi dau moi khoa
     */
    public static List<LibraryTitle> build(List<ObjectItem> objects, String prefix) {
        // Giu thu tu xuat hien de danh sach on dinh giua cac lan goi.
        Map<String, List<ObjectItem>> byFolder = new LinkedHashMap<>();
        List<ObjectItem> flat = new ArrayList<>();

        for (ObjectItem item : objects) {
            String relative = stripPrefix(item.key(), prefix);
            int slash = relative.indexOf('/');
            if (slash <= 0) {
                // File nam thang duoi prefix, khong nam trong thu muc phim rieng: moi
                // file video la mot phim le.
                flat.add(item);
                continue;
            }
            byFolder.computeIfAbsent(relative.substring(0, slash), key -> new ArrayList<>()).add(item);
        }

        List<LibraryTitle> titles = new ArrayList<>();

        // Thu muc con la mot phim: 1 file video -> phim le, nhieu file -> phim bo.
        byFolder.forEach((folder, files) -> {
            LibraryTitle title = toTitle(folder, files, prefix);
            if (title != null) {
                titles.add(title);
            }
        });

        // File phang: moi file video la mot phim le rieng; phu de phang gan theo ten goc.
        List<ObjectItem> flatSubs = flat.stream().filter(f -> hasExtension(f.name(), SUBTITLE_EXT)).toList();
        for (ObjectItem video : flat) {
            if (hasExtension(video.name(), VIDEO_EXT)) {
                titles.add(toSingle(video, flatSubs));
            }
        }

        titles.sort(Comparator.comparing(LibraryTitle::modifiedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return dedupeSlugs(titles);
    }

    /** Mot file video nam thang duoi prefix -> mot phim le (dung mot tap). */
    private static LibraryTitle toSingle(ObjectItem video, List<ObjectItem> subs) {
        // ZCloud tra "name"/"key" la ca duong dan (vi du "Movies/phim.mp4"); lay rieng
        // ten file de ten phim khong dinh tien to thu muc.
        String file = lastSegment(video.key());
        String name = baseName(file);
        LibraryEpisode episode = new LibraryEpisode(
                0,                          // so 0 -> khong phai phim bo, hien "Full"
                name,
                slugify(name),
                file,
                video.key(),
                subtitlesFor(video, subs)
        );
        return new LibraryTitle(slugify(name), displayName(name), baseName(video.key()),
                video.lastModified(), List.of(episode));
    }

    /** Doan cuoi cua duong dan sau dau "/" cuoi cung. */
    private static String lastSegment(String path) {
        int slash = path.lastIndexOf('/');
        return slash >= 0 ? path.substring(slash + 1) : path;
    }

    /**
     * Bao dam slug duy nhat. Ten file trong kho thuong lon xon nen hai phim khac
     * nhau co the ra cung slug (vi du hai file cung chua "AV28"); trung slug thi
     * trang chi tiet se mo nham phim. Trung thi them hau to "-2", "-3"...
     */
    private static List<LibraryTitle> dedupeSlugs(List<LibraryTitle> titles) {
        Map<String, Integer> seen = new LinkedHashMap<>();
        List<LibraryTitle> out = new ArrayList<>(titles.size());
        for (LibraryTitle title : titles) {
            int count = seen.merge(title.slug(), 1, Integer::sum);
            if (count == 1) {
                out.add(title);
            } else {
                out.add(new LibraryTitle(title.slug() + "-" + count, title.name(),
                        title.folder(), title.modifiedAt(), title.episodes()));
            }
        }
        return out;
    }

    private static LibraryTitle toTitle(String folder, List<ObjectItem> files, String prefix) {
        List<ObjectItem> videos = files.stream().filter(f -> hasExtension(f.name(), VIDEO_EXT)).toList();
        if (videos.isEmpty()) {
            return null;
        }

        List<ObjectItem> subs = files.stream().filter(f -> hasExtension(f.name(), SUBTITLE_EXT)).toList();

        List<LibraryEpisode> episodes = new ArrayList<>();
        for (ObjectItem video : videos) {
            int number = episodeNumber(video.name());
            episodes.add(new LibraryEpisode(
                    number,
                    number > 0 ? "Tập %02d".formatted(number) : baseName(video.name()),
                    number > 0 ? "tap-%02d".formatted(number) : slugify(baseName(video.name())),
                    video.name(),
                    video.key(),
                    subtitlesFor(video, subs)
            ));
        }

        // Tap khong doc duoc so thi day xuong cuoi, giu nguyen thu tu tuong doi.
        episodes.sort(Comparator.comparingInt(ep -> ep.number() > 0 ? ep.number() : Integer.MAX_VALUE));

        String modified = files.stream()
                .map(ObjectItem::lastModified)
                .filter(value -> value != null && !value.isBlank())
                .max(Comparator.naturalOrder())
                .orElse(null);

        return new LibraryTitle(slugify(folder), displayName(folder), prefix + folder, modified, episodes);
    }

    /**
     * Tim cac file phu de thuoc ve mot file video.
     *
     * <p>Khop theo ten goc: {@code Thanh Khu - Tap 01.mp4} nhan
     * {@code Thanh Khu - Tap 01.vi.srt} va {@code Thanh Khu - Tap 01.srt}. Neu khong
     * co file nao trung ten thi lui ve khop theo so tap, vi nhieu nguoi dat ten file
     * phu de ngan hon han file video.</p>
     */
    private static List<LibrarySubtitle> subtitlesFor(ObjectItem video, List<ObjectItem> subs) {
        String base = baseName(video.name());
        List<LibrarySubtitle> matched = new ArrayList<>();

        for (ObjectItem sub : subs) {
            String subBase = baseName(sub.name());
            boolean sameName = subBase.equalsIgnoreCase(base) || stripLangSuffix(subBase).equalsIgnoreCase(base);
            if (sameName) {
                matched.add(toSubtitle(sub, subBase));
            }
        }

        if (matched.isEmpty()) {
            int number = episodeNumber(video.name());
            if (number > 0) {
                for (ObjectItem sub : subs) {
                    if (episodeNumber(sub.name()) == number) {
                        matched.add(toSubtitle(sub, baseName(sub.name())));
                    }
                }
            }
        }

        // Duong dau tien duoc bat san; nguoi xem doi duong khac trong trinh phat.
        List<LibrarySubtitle> result = new ArrayList<>();
        for (int index = 0; index < matched.size(); index++) {
            LibrarySubtitle sub = matched.get(index);
            result.add(index == 0 ? sub : sub);
        }
        return result;
    }

    private static LibrarySubtitle toSubtitle(ObjectItem sub, String subBase) {
        String lang = langSuffix(subBase);
        String label = lang == null
                ? "Phụ đề"
                : LANG_NAMES.getOrDefault(lang.toLowerCase(Locale.ROOT), lang.toUpperCase(Locale.ROOT));
        return new LibrarySubtitle(label, lang == null ? "vi" : lang.toLowerCase(Locale.ROOT), sub.key());
    }

    /** Doc so tap tu ten file, tra ve 0 khi khong tim thay. */
    static int episodeNumber(String filename) {
        String base = baseName(filename);
        for (Pattern pattern : EPISODE_PATTERNS) {
            Matcher matcher = pattern.matcher(base);
            if (matcher.find()) {
                try {
                    return Integer.parseInt(matcher.group(1));
                } catch (NumberFormatException ignored) {
                    // Thu mau tiep theo.
                }
            }
        }
        return 0;
    }

    /** Chuyen ten thu muc thanh slug khong dau, dung lam khoa trong URL. */
    static String slugify(String value) {
        String noMark = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');

        String slug = noMark.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+)|(-+$)", "");

        return slug.isEmpty() ? "phim" : slug;
    }

    /**
     * Ten hien thi cua bo phim.
     *
     * <p>Nhieu thu muc kem nam phat hanh trong ngoac, vi du {@code Thanh Khu (2023)}.
     * Giu nguyen - do la thong tin nguoi dat ten co y de lai.</p>
     */
    private static String displayName(String folder) {
        return folder.replace('_', ' ').trim();
    }

    private static String stripPrefix(String key, String prefix) {
        if (prefix != null && !prefix.isEmpty() && key.startsWith(prefix)) {
            return key.substring(prefix.length());
        }
        return key;
    }

    private static boolean hasExtension(String name, List<String> extensions) {
        String lower = name.toLowerCase(Locale.ROOT);
        return extensions.stream().anyMatch(lower::endsWith);
    }

    private static String baseName(String name) {
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    /** Tach duoi ngon ngu cua ten phu de: {@code "ten.vi"} tra ve {@code "vi"}. */
    private static String langSuffix(String base) {
        int dot = base.lastIndexOf('.');
        if (dot <= 0) {
            return null;
        }
        String suffix = base.substring(dot + 1);
        return suffix.length() <= 3 && suffix.chars().allMatch(Character::isLetter) ? suffix : null;
    }

    private static String stripLangSuffix(String base) {
        return langSuffix(base) == null ? base : base.substring(0, base.lastIndexOf('.'));
    }
}
