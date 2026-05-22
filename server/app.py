import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

from db import connect, init_schema, load_project, load_projects, load_risk_rules
from risk import hash_text, normalize_text, scan_risk


PUBLIC_BASE_PATH = os.environ.get("PUBLIC_BASE_PATH", "").rstrip("/")
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "18110"))


class Handler(BaseHTTPRequestHandler):
    server_version = "SideHustleRadar/0.1"

    def do_OPTIONS(self):
        self.respond_empty(204)

    def do_GET(self):
        path, query = self.route()
        if path in {"/", "/health"}:
            return self.respond(
                {
                    "ok": True,
                    "name": "SideHustle Radar API",
                    "basePath": PUBLIC_BASE_PATH,
                    "storage": "sqlite",
                }
            )
        if path == "/projects":
            return self.handle_projects(query)
        if path.startswith("/projects/"):
            return self.handle_project_detail(path)
        if path == "/hot-keywords":
            return self.respond(
                {
                    "items": [
                        "刷单返利",
                        "点赞关注日结",
                        "小说推文",
                        "短剧推广",
                        "AI 写作投稿",
                        "无人直播",
                        "海外问卷",
                        "视频剪辑接单",
                    ]
                }
            )
        return self.respond({"error": "not_found"}, 404)

    def do_POST(self):
        path, _query = self.route()
        body = self.read_json_body()
        if path == "/risk-scan":
            return self.handle_risk_scan(body)
        if path == "/fit-test":
            return self.handle_fit_test(body)
        return self.respond({"error": "not_found"}, 404)

    def route(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if PUBLIC_BASE_PATH and path == PUBLIC_BASE_PATH:
            path = "/"
        elif PUBLIC_BASE_PATH and path.startswith(PUBLIC_BASE_PATH + "/"):
            path = path[len(PUBLIC_BASE_PATH) :]
        return path or "/", parse_qs(parsed.query)

    def handle_projects(self, query):
        keyword = (query.get("q") or [""])[0]
        category = (query.get("category") or [None])[0]
        risk_level = (query.get("risk_level") or [None])[0]
        page = max(int((query.get("page") or ["1"])[0]), 1)
        page_size = min(max(int((query.get("page_size") or ["20"])[0]), 1), 50)

        normalized = normalize_text(keyword)
        with connect() as conn:
            init_schema(conn)
            projects = load_projects(conn)

        filtered = []
        for project in projects:
            if category and project["category"] != category:
                continue
            if risk_level and project["risk_level"] != risk_level:
                continue
            if normalized:
                haystack = normalize_text(
                    " ".join(
                        [
                            project.get("title", ""),
                            project.get("summary", ""),
                            *project.get("aliases", []),
                            *project.get("red_flags", []),
                            *project.get("common_traps", []),
                        ]
                    )
                )
                if normalized not in haystack:
                    continue
            filtered.append(project)

        start = (page - 1) * page_size
        items = [to_project_list_item(project) for project in filtered[start : start + page_size]]
        self.respond({"items": items, "total": len(filtered), "page": page, "page_size": page_size})

    def handle_project_detail(self, path):
        slug = unquote(path.replace("/projects/", "", 1))
        with connect() as conn:
            init_schema(conn)
            project = load_project(conn, slug)
        if not project:
            return self.respond({"error": "project_not_found"}, 404)
        return self.respond(project)

    def handle_risk_scan(self, body):
        text = str(body.get("text") or "").strip()
        if len(text) < 10:
            return self.respond(
                {"error": "text_too_short", "message": "请粘贴更完整的兼职或副业文案，至少 10 个字。"},
                400,
            )
        if len(text) > 2000:
            return self.respond({"error": "text_too_long", "message": "单次检测最多支持 2000 字。"}, 400)

        with connect() as conn:
            init_schema(conn)
            rules = load_risk_rules(conn)
        result = scan_risk(text, rules)
        result.update(
            {
                "source_platform": body.get("source_platform") or "unknown",
                "input_hash": hash_text(text),
                "saved_original_text": False,
            }
        )
        return self.respond(result)

    def handle_fit_test(self, body):
        answers = body.get("answers") or {}
        recommended = []
        if answers.get("can_edit_video") or answers.get("work_type") == "content":
            recommended.extend(["p_video_editing_service", "p_xiaohongshu_cover_design"])
        if answers.get("can_write"):
            recommended.extend(["p_ai_writing_submission", "p_resume_optimization"])
        if answers.get("willing_to_sell"):
            recommended.append("p_local_business_video")
        if not recommended:
            recommended.extend(["p_data_organizing", "p_public_account_layout", "p_ppt_template_sales"])

        deduped = list(dict.fromkeys(recommended))[:3]
        return self.respond(
            {
                "recommended_project_ids": deduped,
                "avoid_project_ids": ["p_brushing_rebate", "p_running_points", "p_gambling_arbitrage"],
                "seven_day_plan": [
                    "第 1 天：选 3 个同类案例，拆解交付物和价格。",
                    "第 2-3 天：做 2 个可展示的小样例。",
                    "第 4-5 天：找 10 个潜在用户询问是否需要类似服务。",
                    "第 6-7 天：只接低风险小单，验证是否有人愿意付费。",
                ],
                "disclaimer": "推荐结果仅用于降低试错成本，不代表收益承诺。",
            }
        )

    def read_json_body(self):
        length = int(self.headers.get("content-length") or "0")
        if length <= 0:
            return {}
        if length > 1024 * 1024:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def respond(self, payload, status=200):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("content-length", str(len(data)))
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-methods", "GET,POST,OPTIONS")
        self.send_header("access-control-allow-headers", "content-type")
        self.end_headers()
        self.wfile.write(data)

    def respond_empty(self, status=204):
        self.send_response(status)
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-methods", "GET,POST,OPTIONS")
        self.send_header("access-control-allow-headers", "content-type")
        self.end_headers()

    def log_message(self, fmt, *args):
        if os.environ.get("ACCESS_LOG", "0") == "1":
            super().log_message(fmt, *args)


def to_project_list_item(project):
    return {
        "id": project["id"],
        "slug": project["slug"],
        "title": project["title"],
        "aliases": project.get("aliases", []),
        "category": project["category"],
        "risk_level": project["risk_level"],
        "risk_score": project["risk_score"],
        "summary": project["summary"],
        "red_flags": project.get("red_flags", []),
        "updated_at": project.get("updated_at"),
    }


def main():
    with connect() as conn:
        init_schema(conn)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"SideHustle Radar API listening on http://{HOST}:{PORT}{PUBLIC_BASE_PATH or ''}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()

