import hashlib
import re
import unicodedata
from typing import Optional


LEVEL_WEIGHT = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "extreme": 4,
}


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(text or ""))).lower()


def max_level(a: Optional[str], b: Optional[str]) -> Optional[str]:
    if not a:
        return b
    if not b:
        return a
    return b if LEVEL_WEIGHT[b] > LEVEL_WEIGHT[a] else a


def score_to_level(score: int) -> str:
    if score >= 81:
        return "extreme"
    if score >= 61:
        return "high"
    if score >= 31:
        return "medium"
    return "low"


def match_combo(normalized: str, expression: str) -> bool:
    groups = [
        [normalize_text(word) for word in part.split("|") if normalize_text(word)]
        for part in expression.split("+")
    ]
    return all(any(word in normalized for word in group) for group in groups)


def match_rule(normalized: str, rule: dict) -> bool:
    match_type = rule.get("match_type", "keyword")
    keyword = rule.get("keyword", "")
    if match_type == "combo":
        return match_combo(normalized, keyword)
    if match_type == "regex":
        return re.search(keyword, normalized, flags=re.IGNORECASE) is not None
    return normalize_text(keyword) in normalized


def scan_risk(text: str, rules: list[dict]) -> dict:
    normalized = normalize_text(text)
    hits = []
    score = 0
    forced_level = None

    for rule in rules:
        if rule.get("enabled") is False:
            continue
        if not match_rule(normalized, rule):
            continue

        hits.append(
            {
                "id": rule["id"],
                "keyword": rule["keyword"],
                "category": rule["category"],
                "score": int(rule.get("score", 0)),
                "force_level": rule.get("force_level"),
                "explanation": rule["explanation"],
            }
        )
        score += int(rule.get("score", 0))
        forced_level = max_level(forced_level, rule.get("force_level"))

    risk_score = min(score, 100)
    risk_level = max_level(score_to_level(risk_score), forced_level)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "hit_rules": hits,
        "possible_pattern": infer_pattern(hits, risk_level),
        "suggested_actions": build_suggested_actions(hits, risk_level),
        "questions_to_verify": build_questions(),
    }


def infer_pattern(hits: list[dict], risk_level: str) -> str:
    categories = {hit["category"] for hit in hits}
    if "illegal_fund_flow" in categories:
        return "疑似跑分、代收款或资金流转风险"
    if "gambling" in categories:
        return "疑似博彩或彩票套利风险"
    if "brushing_rebate" in categories:
        return "疑似刷单返利或任务返佣套路"
    if "payment_first" in categories:
        return "疑似先收费、押金或垫资风险"
    if "pyramid" in categories:
        return "疑似拉人返佣或团队裂变风险"
    if "copyright" in categories:
        return "疑似版权或平台规则风险"
    if risk_level == "low":
        return "暂未命中明显高危信号，但仍建议核实主体和结算规则"
    return "存在多个可疑信号，建议谨慎核实后再继续"


def build_suggested_actions(hits: list[dict], risk_level: str) -> list[str]:
    categories = {hit["category"] for hit in hits}
    actions = []

    def add(action: str) -> None:
        if action not in actions:
            actions.append(action)

    if risk_level in {"extreme", "high"}:
        add("不要转账、充值、垫资或支付押金")
    if {"sensitive_info", "illegal_fund_flow"} & categories:
        add("不要提供银行卡、验证码、身份证或人脸验证")
    if "external_app" in categories:
        add("不要下载陌生 App 或在陌生平台输入支付信息")
    if {"copyright", "platform_abuse"} & categories:
        add("先核实平台规则和素材授权，不要使用搬运或规避检测方法")

    add("核实公司主体、合同、结算方式和售后责任")
    add("先做低成本验证，不购买承诺收益的课程或工具")
    return actions


def build_questions() -> list[str]:
    return [
        "是否要求先付款、充值、押金或垫资？",
        "是否承诺稳赚、保底、高日结或快速回本？",
        "是否要求下载陌生 App、进私聊群或提供敏感信息？",
        "是否有清晰的公司主体、合同和结算方式？",
        "这个项目的收益是否来自真实服务/商品，而不是拉人或继续收费？",
    ]


def risk_signal_phrases(signal_ids: list[str]) -> list[str]:
    mapping = {
        "pay_first": "要求先付款、押金、充值或垫资",
        "unknown_app": "要求下载陌生 App 或跳到外部平台",
        "guided_order": "导师带单、派单、抢单、补单",
        "high_return": "承诺稳赚、高日结、快速回本",
        "sensitive_info": "索要银行卡、验证码、身份证或人脸验证",
        "invite_rebate": "通过拉人返佣、发展下线或团队裂变赚钱",
        "copyright": "去水印搬运、无授权切片或盗用素材",
        "course": "高价课程、陪跑、内部渠道并承诺收益",
    }
    return [mapping[signal_id] for signal_id in signal_ids if signal_id in mapping]


def platform_text(platform: str) -> str:
    mapping = {
        "unknown": "不确定来源",
        "wechat": "微信群",
        "moments": "朋友圈",
        "xiaohongshu": "小红书",
        "douyin": "抖音",
        "bilibili": "B站",
        "recruitment": "招聘平台",
    }
    return mapping.get(platform or "unknown", platform or "不确定来源")


def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
