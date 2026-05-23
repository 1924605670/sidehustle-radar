import json
import os
import sqlite3
from pathlib import Path
from typing import Optional


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT_DIR / "data" / "sidehustle-radar.sqlite3"
DEFAULT_DATA_DIR = ROOT_DIR / "data"


def db_path() -> Path:
    return Path(os.environ.get("SIDEHUSTLE_DB_PATH", DEFAULT_DB_PATH))


def connect(path: Optional[Path] = None) -> sqlite3.Connection:
    conn = sqlite3.connect(path or db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        create table if not exists projects (
            id text primary key,
            slug text unique not null,
            title text not null,
            aliases text not null,
            category text not null,
            risk_level text not null,
            risk_score integer not null,
            summary text not null,
            raw_json text not null,
            status text not null,
            updated_at text not null
        );

        create index if not exists idx_projects_status on projects(status);
        create index if not exists idx_projects_category on projects(category);
        create index if not exists idx_projects_risk_level on projects(risk_level);

        create table if not exists risk_rules (
            id text primary key,
            keyword text not null,
            match_type text not null,
            category text not null,
            score integer not null,
            force_level text,
            explanation text not null,
            enabled integer not null default 1,
            raw_json text not null
        );

        create table if not exists cases (
            id text primary key,
            title text not null,
            source_name text not null,
            source_url text not null,
            event_date text not null,
            related_project_ids text not null,
            related_categories text not null,
            priority integer not null default 0,
            status text not null,
            updated_at text not null,
            raw_json text not null
        );

        create index if not exists idx_cases_status on cases(status);
        create index if not exists idx_cases_priority on cases(priority);
        create index if not exists idx_cases_event_date on cases(event_date);

        create table if not exists search_logs (
            id integer primary key autoincrement,
            keyword text not null,
            result_count integer not null,
            created_at text not null default current_timestamp
        );
        """
    )
    conn.commit()


def seed_from_json(conn: sqlite3.Connection, data_dir: Path = DEFAULT_DATA_DIR) -> tuple[int, int, int]:
    init_schema(conn)
    projects = json.loads((data_dir / "projects.seed.json").read_text(encoding="utf-8"))
    risk_rules = json.loads((data_dir / "risk-keywords.seed.json").read_text(encoding="utf-8"))
    cases_path = data_dir / "cases.seed.json"
    cases = json.loads(cases_path.read_text(encoding="utf-8")) if cases_path.exists() else []

    for project in projects:
        conn.execute(
            """
            insert into projects (
                id, slug, title, aliases, category, risk_level, risk_score,
                summary, raw_json, status, updated_at
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(id) do update set
                slug = excluded.slug,
                title = excluded.title,
                aliases = excluded.aliases,
                category = excluded.category,
                risk_level = excluded.risk_level,
                risk_score = excluded.risk_score,
                summary = excluded.summary,
                raw_json = excluded.raw_json,
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (
                project["id"],
                project["slug"],
                project["title"],
                json.dumps(project.get("aliases", []), ensure_ascii=False),
                project["category"],
                project["risk_level"],
                int(project["risk_score"]),
                project["summary"],
                json.dumps(project, ensure_ascii=False),
                project.get("status", "published"),
                project.get("updated_at", ""),
            ),
        )

    for rule in risk_rules:
        conn.execute(
            """
            insert into risk_rules (
                id, keyword, match_type, category, score, force_level,
                explanation, enabled, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(id) do update set
                keyword = excluded.keyword,
                match_type = excluded.match_type,
                category = excluded.category,
                score = excluded.score,
                force_level = excluded.force_level,
                explanation = excluded.explanation,
                enabled = excluded.enabled,
                raw_json = excluded.raw_json
            """,
            (
                rule["id"],
                rule["keyword"],
                rule.get("match_type", "keyword"),
                rule["category"],
                int(rule["score"]),
                rule.get("force_level"),
                rule["explanation"],
                1 if rule.get("enabled", True) else 0,
                json.dumps(rule, ensure_ascii=False),
            ),
        )

    for case in cases:
        conn.execute(
            """
            insert into cases (
                id, title, source_name, source_url, event_date,
                related_project_ids, related_categories, priority,
                status, updated_at, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(id) do update set
                title = excluded.title,
                source_name = excluded.source_name,
                source_url = excluded.source_url,
                event_date = excluded.event_date,
                related_project_ids = excluded.related_project_ids,
                related_categories = excluded.related_categories,
                priority = excluded.priority,
                status = excluded.status,
                updated_at = excluded.updated_at,
                raw_json = excluded.raw_json
            """,
            (
                case["id"],
                case["title"],
                case["source_name"],
                case["source_url"],
                case.get("event_date", ""),
                json.dumps(case.get("related_project_ids", []), ensure_ascii=False),
                json.dumps(case.get("related_categories", []), ensure_ascii=False),
                int(case.get("priority", 0)),
                case.get("status", "published"),
                case.get("updated_at", ""),
                json.dumps(case, ensure_ascii=False),
            ),
        )

    conn.commit()
    return len(projects), len(risk_rules), len(cases)


def load_projects(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "select raw_json from projects where status = 'published' order by risk_score desc, updated_at desc"
    ).fetchall()
    return [json.loads(row["raw_json"]) for row in rows]


def load_project(conn: sqlite3.Connection, slug: str):
    row = conn.execute(
        "select raw_json from projects where status = 'published' and (slug = ? or id = ?) limit 1",
        (slug, slug),
    ).fetchone()
    return json.loads(row["raw_json"]) if row else None


def load_risk_rules(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "select raw_json from risk_rules where enabled = 1 order by score desc"
    ).fetchall()
    return [json.loads(row["raw_json"]) for row in rows]


def load_cases(conn: sqlite3.Connection, limit: int = 20) -> list[dict]:
    rows = conn.execute(
        """
        select raw_json from cases
        where status = 'published'
        order by event_date desc, priority desc, updated_at desc
        limit ?
        """,
        (limit,),
    ).fetchall()
    return [json.loads(row["raw_json"]) for row in rows]


def load_cases_for_project(conn: sqlite3.Connection, project_id: str, limit: int = 6) -> list[dict]:
    return [
        case
        for case in load_cases(conn, 200)
        if project_id in set(case.get("related_project_ids", []))
    ][:limit]


def load_cases_for_categories(
    conn: sqlite3.Connection,
    categories: set[str],
    project_ids: Optional[set[str]] = None,
    limit: int = 5,
) -> list[dict]:
    project_ids = project_ids or set()
    matched = []
    for case in load_cases(conn, 200):
        case_categories = set(case.get("related_categories", []))
        case_projects = set(case.get("related_project_ids", []))
        category_hits = len(categories & case_categories) if categories else 0
        project_hits = len(project_ids & case_projects) if project_ids else 0
        if category_hits or project_hits:
            relevance = category_hits + project_hits * 3
            matched.append((relevance, int(case.get("priority", 0)), case))
    strong_matches = [item for item in matched if item[0] >= 2]
    if strong_matches:
        matched = strong_matches
    matched.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [case for _relevance, _priority, case in matched[:limit]]
