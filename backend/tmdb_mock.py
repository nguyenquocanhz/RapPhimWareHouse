"""Mock TMDB API de kiem chung tang anh xa cua TmdbClient ma khong can mang that."""

import json
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

DISCOVER = {
    "page": 2,
    "total_pages": 4521,
    "total_results": 90410,
    "results": [
        {
            "adult": False,
            "backdrop_path": "/backdrop1.jpg",
            "genre_ids": [28, 12, 878],
            "id": 550,
            "original_language": "en",
            "original_title": "Fight Club",
            "overview": "Mot nhan vien van phong mat ngu gap mot nguoi ban xa phong.",
            "popularity": 61.416,
            "poster_path": "/poster1.jpg",
            "release_date": "1999-10-15",
            "title": "Sàn Đấu Sinh Tử",
            "video": False,
            "vote_average": 8.438,
            "vote_count": 26280,
        },
        {
            "adult": False,
            "backdrop_path": None,
            "genre_ids": [18],
            "id": 278,
            "original_language": "ko",
            "original_title": "기생충",
            "overview": "",
            "popularity": 40.1,
            "poster_path": None,
            "release_date": "2019-05-30",
            "title": "Ký Sinh Trùng",
            "video": False,
            "vote_average": 8.5,
            "vote_count": 17000,
        },
    ],
}

GENRES = {
    "genres": [
        {"id": 28, "name": "Hành Động"},
        {"id": 12, "name": "Phiêu Lưu"},
        {"id": 878, "name": "Khoa Học Viễn Tưởng"},
        {"id": 18, "name": "Chính Kịch"},
    ]
}

DETAILS = {
    "id": 550,
    "imdb_id": "tt0137523",
    "title": "Sàn Đấu Sinh Tử",
    "original_title": "Fight Club",
    "overview": "Tom tat tu TMDB.",
    "tagline": "Dung noi ve no",
    "homepage": "https://example.test",
    "status": "Released",
    "release_date": "1999-10-15",
    "runtime": 139,
    "vote_average": 8.4,
    "vote_count": 26280,
    "popularity": 61.4,
    "poster_path": "/poster1.jpg",
    "backdrop_path": "/backdrop1.jpg",
    "genres": [{"id": 18, "name": "Chính Kịch"}],
    "production_countries": [{"iso_3166_1": "US", "name": "United States of America"}],
    "production_companies": [{"id": 508, "name": "Regency Enterprises"}],
    "credits": {
        "cast": [
            {"id": 819, "name": "Edward Norton", "character": "The Narrator", "order": 0,
             "profile_path": "/norton.jpg"},
        ],
        "crew": [
            {"id": 7467, "name": "David Fincher", "job": "Director", "department": "Directing"},
        ],
    },
    "external_ids": {"imdb_id": "tt0137523"},
}

# Ghi lai query cua lan goi discover gan nhat de kiem tra bo loc co duoc truyen di khong.
last_query = {}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/3/discover/movie":
            global last_query
            last_query = {k: v[0] for k, v in parse_qs(parsed.query).items()}
            return self.send_json(DISCOVER)

        if re.fullmatch(r"/3/genre/(movie|tv)/list", path):
            return self.send_json(GENRES)

        detail = re.fullmatch(r"/3/(movie|tv)/(\d+)", path)
        if detail:
            # Chi co ma 550 la ton tai, de kiem tra duoc ca nhanh khong tim thay.
            if detail.group(2) != "550":
                return self.send_json(
                    {"success": False, "status_code": 34,
                     "status_message": "The resource you requested could not be found."},
                    status=404)
            return self.send_json(DETAILS)

        if path == "/__last_query":
            return self.send_json(last_query)

        self.send_json({"success": False, "status_message": "not found"}, status=404)

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8099), Handler).serve_forever()
