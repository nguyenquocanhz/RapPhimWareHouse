package com.rapphim.warehouse.service;

import com.rapphim.warehouse.dto.MovieDetail;
import com.rapphim.warehouse.dto.TmdbCast;
import com.rapphim.warehouse.dto.TmdbDetail;
import com.rapphim.warehouse.dto.Taxonomy;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.StringWriter;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Sinh file NFO cho trinh quan ly thu vien phim (Kodi, Jellyfin, Emby).
 *
 * <p>File duoc dung bang DOM roi serialize, khong ghep chuoi tay, nen moi ky tu
 * dac biet trong ten phim va noi dung deu duoc escape dung chuan XML.</p>
 *
 * <p>Metadata cua nguon phim luon co san. Neu TMDB duoc cau hinh va goi duoc thi
 * cac truong cua TMDB (tom tat, thoi luong, diem, dien vien, anh do phan giai cao)
 * se duoc uu tien vi day du hon.</p>
 */
@Service
public class NfoService {

    /** Noi dung tu nguon phim la HTML nen phai lam sach truoc khi dua vao the plot. */
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]*>");

    /**
     * @param movie chi tiet phim lay tu nguon
     * @param tmdb  metadata TMDB neu lay duoc, co the rong
     * @return noi dung file NFO dang XML
     */
    public String build(MovieDetail movie, Optional<TmdbDetail> tmdb) {
        boolean series = isSeries(movie, tmdb);
        Document document = newDocument();

        Element root = document.createElement(series ? "tvshow" : "movie");
        document.appendChild(root);

        TmdbDetail extra = tmdb.orElse(null);

        text(document, root, "title", movie.name());
        text(document, root, "originaltitle", movie.originName());
        text(document, root, "sorttitle", movie.name());

        String plot = firstNonBlank(
                extra == null ? null : extra.overview(),
                stripHtml(movie.content()));
        text(document, root, "plot", plot);
        text(document, root, "outline", plot);

        if (extra != null) {
            text(document, root, "tagline", extra.tagline());
        }

        Integer year = resolveYear(movie, extra);
        if (year != null) {
            text(document, root, "year", String.valueOf(year));
        }
        if (extra != null) {
            text(document, root, "premiered", extra.releaseDate());
            if (extra.runtime() != null && extra.runtime() > 0) {
                text(document, root, "runtime", String.valueOf(extra.runtime()));
            }
        }

        appendRatings(document, root, movie, extra);
        appendUniqueIds(document, root, movie, extra);

        // The loai: uu tien cach phan loai cua TMDB vi chuan hoa tot hon.
        List<String> genres = (extra != null && !extra.genres().isEmpty())
                ? extra.genres()
                : names(movie.categories());
        genres.forEach(genre -> text(document, root, "genre", genre));

        List<String> countries = (extra != null && !extra.countries().isEmpty())
                ? extra.countries()
                : names(movie.countries());
        countries.forEach(country -> text(document, root, "country", country));

        if (extra != null) {
            extra.studios().forEach(studio -> text(document, root, "studio", studio));
        }

        List<String> directors = (extra != null && !extra.directors().isEmpty())
                ? extra.directors()
                : movie.directors();
        directors.forEach(director -> text(document, root, "director", director));

        if (series) {
            if (extra != null && extra.numberOfSeasons() != null) {
                text(document, root, "season", String.valueOf(extra.numberOfSeasons()));
            }
            String episodes = extra != null && extra.numberOfEpisodes() != null
                    ? String.valueOf(extra.numberOfEpisodes())
                    : movie.episodeTotal();
            text(document, root, "episode", episodes);
            text(document, root, "status", statusOf(movie, extra));
        }

        appendArtwork(document, root, movie, extra);
        appendActors(document, root, movie, extra);

        text(document, root, "trailer", movie.trailerUrl());
        text(document, root, "source", movie.provider());

        return serialize(document);
    }

    /** Ten file goi y cho client khi tai ve. */
    public String fileNameFor(MovieDetail movie) {
        String slug = (movie.slug() == null || movie.slug().isBlank()) ? "movie" : movie.slug();
        return slug + ".nfo";
    }

    // ------------------------------------------------------------------ tung khoi

    private void appendRatings(Document document, Element root, MovieDetail movie, TmdbDetail extra) {
        Element ratings = document.createElement("ratings");
        boolean any = false;

        Double tmdbScore = extra != null ? extra.voteAverage()
                : (movie.tmdb() != null ? movie.tmdb().voteAverage() : null);
        Integer tmdbVotes = extra != null ? extra.voteCount()
                : (movie.tmdb() != null ? movie.tmdb().voteCount() : null);

        if (tmdbScore != null && tmdbScore > 0) {
            ratings.appendChild(rating(document, "themoviedb", tmdbScore, tmdbVotes, true));
            any = true;
        }

        if (movie.imdb() != null && movie.imdb().voteAverage() != null && movie.imdb().voteAverage() > 0) {
            ratings.appendChild(
                    rating(document, "imdb", movie.imdb().voteAverage(), movie.imdb().voteCount(), !any));
            any = true;
        }

        if (any) {
            root.appendChild(ratings);
        }
    }

    private Element rating(Document document, String name, Double value, Integer votes, boolean isDefault) {
        Element rating = document.createElement("rating");
        rating.setAttribute("name", name);
        rating.setAttribute("max", "10");
        rating.setAttribute("default", String.valueOf(isDefault));
        text(document, rating, "value", String.valueOf(value));
        if (votes != null) {
            text(document, rating, "votes", String.valueOf(votes));
        }
        return rating;
    }

    /** uniqueid la thu Kodi / Jellyfin dung de khop phim, nen luon ghi neu co. */
    private void appendUniqueIds(Document document, Element root, MovieDetail movie, TmdbDetail extra) {
        String tmdbId = extra != null ? extra.id()
                : (movie.tmdb() != null ? movie.tmdb().id() : null);
        if (tmdbId != null && !tmdbId.isBlank()) {
            Element id = document.createElement("uniqueid");
            id.setAttribute("type", "tmdb");
            id.setAttribute("default", "true");
            id.setTextContent(tmdbId);
            root.appendChild(id);
        }

        String imdbId = extra != null && extra.imdbId() != null
                ? extra.imdbId()
                : (movie.imdb() != null ? movie.imdb().id() : null);
        if (imdbId != null && !imdbId.isBlank()) {
            Element id = document.createElement("uniqueid");
            id.setAttribute("type", "imdb");
            id.setAttribute("default", String.valueOf(tmdbId == null || tmdbId.isBlank()));
            id.setTextContent(imdbId);
            root.appendChild(id);
        }
    }

    private void appendArtwork(Document document, Element root, MovieDetail movie, TmdbDetail extra) {
        String poster = firstNonBlank(
                extra == null ? null : extra.posterUrl(),
                movie.posterUrl());
        if (poster != null) {
            Element thumb = document.createElement("thumb");
            thumb.setAttribute("aspect", "poster");
            thumb.setTextContent(poster);
            root.appendChild(thumb);
        }

        String backdrop = firstNonBlank(
                extra == null ? null : extra.backdropUrl(),
                movie.thumbUrl());
        if (backdrop != null) {
            Element fanart = document.createElement("fanart");
            Element thumb = document.createElement("thumb");
            thumb.setTextContent(backdrop);
            fanart.appendChild(thumb);
            root.appendChild(fanart);
        }
    }

    private void appendActors(Document document, Element root, MovieDetail movie, TmdbDetail extra) {
        if (extra != null && !extra.cast().isEmpty()) {
            for (TmdbCast member : extra.cast()) {
                Element actor = document.createElement("actor");
                text(document, actor, "name", member.name());
                text(document, actor, "role", member.character());
                if (member.order() != null) {
                    text(document, actor, "order", String.valueOf(member.order()));
                }
                text(document, actor, "thumb", member.profileUrl());
                root.appendChild(actor);
            }
            return;
        }

        // Khong co TMDB thi chi co ten dien vien tu nguon phim, khong co vai dien.
        int order = 0;
        for (String name : movie.actors()) {
            Element actor = document.createElement("actor");
            text(document, actor, "name", name);
            text(document, actor, "order", String.valueOf(order++));
            root.appendChild(actor);
        }
    }

    // ------------------------------------------------------------------ tien ich

    private boolean isSeries(MovieDetail movie, Optional<TmdbDetail> tmdb) {
        if (tmdb.isPresent()) {
            return "tv".equalsIgnoreCase(tmdb.get().type());
        }
        String type = movie.type();
        return type != null && !"single".equalsIgnoreCase(type);
    }

    private Integer resolveYear(MovieDetail movie, TmdbDetail extra) {
        if (movie.year() != null) {
            return movie.year();
        }
        if (extra != null && extra.releaseDate() != null && extra.releaseDate().length() >= 4) {
            try {
                return Integer.valueOf(extra.releaseDate().substring(0, 4));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String statusOf(MovieDetail movie, TmdbDetail extra) {
        if (extra != null && extra.status() != null && !extra.status().isBlank()) {
            return extra.status();
        }
        return "completed".equalsIgnoreCase(movie.status()) ? "Ended" : "Continuing";
    }

    private List<String> names(List<Taxonomy> items) {
        return items.stream().map(Taxonomy::name).toList();
    }

    private String stripHtml(String html) {
        if (html == null || html.isBlank()) {
            return null;
        }
        String text = HTML_TAG.matcher(html).replaceAll(" ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replaceAll("\\s+", " ")
                .trim();
        return text.isEmpty() ? null : text;
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return (second != null && !second.isBlank()) ? second : null;
    }

    /** Bo qua the khi gia tri rong, tranh sinh ra the trong trong file NFO. */
    private void text(Document document, Element parent, String name, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        Element element = document.createElement(name);
        element.setTextContent(value);
        parent.appendChild(element);
    }

    private Document newDocument() {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            Document document = factory.newDocumentBuilder().newDocument();
            document.setXmlStandalone(true);
            return document;
        } catch (ParserConfigurationException ex) {
            throw new IllegalStateException("Khong khoi tao duoc bo dung XML", ex);
        }
    }

    private String serialize(Document document) {
        try {
            Transformer transformer = TransformerFactory.newInstance().newTransformer();
            transformer.setOutputProperty(OutputKeys.INDENT, "yes");
            transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            transformer.setOutputProperty(OutputKeys.STANDALONE, "yes");
            transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2");

            StringWriter writer = new StringWriter();
            transformer.transform(new DOMSource(document), new StreamResult(writer));
            return writer.toString();
        } catch (TransformerException ex) {
            throw new IllegalStateException("Khong ghi duoc file NFO", ex);
        }
    }
}
