import argparse
import tempfile
from pathlib import Path

from db import connect, seed_from_json


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=None)
    parser.add_argument("--data-dir", type=Path, default=Path("data"))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    db_file = args.db
    if args.check:
        tmp = tempfile.NamedTemporaryFile(suffix=".sqlite3")
        db_file = Path(tmp.name)

    if db_file:
        db_file.parent.mkdir(parents=True, exist_ok=True)

    with connect(db_file) as conn:
        project_count, rule_count, case_count = seed_from_json(conn, args.data_dir)

    print(f"Seeded {project_count} projects, {rule_count} risk rules, and {case_count} cases.")


if __name__ == "__main__":
    main()
