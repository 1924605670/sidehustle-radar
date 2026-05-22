import json
import tempfile
import unittest
from pathlib import Path

from server.db import (
    connect,
    load_cases,
    load_cases_for_categories,
    load_cases_for_project,
    load_projects,
    load_risk_rules,
    seed_from_json,
)
from server.risk import match_combo, scan_risk


ROOT_DIR = Path(__file__).resolve().parents[2]


class RiskTests(unittest.TestCase):
    def test_combo_rule_matches_grouped_words(self):
        self.assertTrue(match_combo("下载app后充值抢单", "下载APP+充值|抢单|提现"))
        self.assertFalse(match_combo("下载app看看资料", "下载APP+充值|抢单|提现"))

    def test_seed_and_scan(self):
        with tempfile.NamedTemporaryFile(suffix=".sqlite3") as tmp:
            with connect(Path(tmp.name)) as conn:
                project_count, rule_count, case_count = seed_from_json(conn, ROOT_DIR / "data")
                self.assertGreater(project_count, 0)
                self.assertGreater(rule_count, 0)
                self.assertGreater(case_count, 0)
                self.assertGreater(len(load_projects(conn)), 0)
                self.assertGreater(len(load_cases(conn)), 0)
                self.assertGreater(
                    len(load_cases_for_project(conn, "p_brushing_rebate")),
                    0,
                )
                rules = load_risk_rules(conn)

        result = scan_risk("招聘点赞员，日结300-500，无需经验，导师带单，下载APP做任务返佣。", rules)
        self.assertEqual(result["risk_level"], "extreme")
        self.assertGreaterEqual(result["risk_score"], 80)

    def test_cases_match_scan_categories(self):
        with tempfile.NamedTemporaryFile(suffix=".sqlite3") as tmp:
            with connect(Path(tmp.name)) as conn:
                seed_from_json(conn, ROOT_DIR / "data")
                cases = load_cases_for_categories(conn, {"brushing_rebate", "payment_first"})

        self.assertGreater(len(cases), 0)
        self.assertIn("risk_points", cases[0])

    def test_normal_editing_service_copy_is_not_extreme(self):
        rules = json.loads((ROOT_DIR / "data" / "risk-keywords.seed.json").read_text(encoding="utf-8"))
        result = scan_risk("招长期视频剪辑合作，按条结算，提供素材和脚本，试剪一条后报价。", rules)
        self.assertNotEqual(result["risk_level"], "extreme")


if __name__ == "__main__":
    unittest.main()
