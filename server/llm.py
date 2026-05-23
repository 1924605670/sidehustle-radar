import json
import os
import re
import urllib.error
import urllib.request


DEFAULT_ANALYSIS = {
    "status": "disabled",
    "summary": "",
    "risk_mechanism": "",
    "confidence": "unknown",
    "extra_risk_points": [],
    "suggested_actions": [],
    "verification_questions": [],
}


def llm_enabled() -> bool:
    return os.environ.get("LLM_ENABLED", "0").lower() in {"1", "true", "yes", "on"}


def analyze_risk_with_llm(text: str, context: dict) -> dict:
    if not llm_enabled():
        return DEFAULT_ANALYSIS.copy()

    api_key = os.environ.get("LLM_API_KEY") or os.environ.get("OPENAI_API_KEY")
    base_url = os.environ.get("LLM_BASE_URL") or os.environ.get("OPENAI_BASE_URL")
    model = os.environ.get("LLM_MODEL", "gpt-4o-mini")
    if not api_key or not base_url:
        analysis = DEFAULT_ANALYSIS.copy()
        analysis["status"] = "missing_config"
        return analysis

    max_chars = int(os.environ.get("LLM_MAX_INPUT_CHARS", "1600"))
    safe_text = str(text or "")[:max_chars]
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是副业风险识别助手，只做风险解释，不推荐赚钱项目。"
                    "必须遵守：1. 不承诺收益；2. 不输出刷单、跑分、博彩、搬运规避检测等操作教程；"
                    "3. 不降低规则引擎给出的风险等级；4. 只输出 JSON。"
                ),
            },
            {
                "role": "user",
                "content": build_prompt(safe_text, context),
            },
        ],
        "temperature": 0.2,
    }

    try:
        data = post_chat_completion(base_url, api_key, payload)
        content = data["choices"][0]["message"]["content"]
        parsed = parse_json_content(content)
        return normalize_analysis(parsed)
    except (KeyError, ValueError, json.JSONDecodeError, urllib.error.URLError, TimeoutError) as exc:
        analysis = DEFAULT_ANALYSIS.copy()
        analysis["status"] = "failed"
        analysis["error"] = exc.__class__.__name__
        return analysis


def build_prompt(text: str, context: dict) -> str:
    compact_context = {
        "rule_risk_level": context.get("risk_level"),
        "rule_risk_score": context.get("risk_score"),
        "possible_pattern": context.get("possible_pattern"),
        "source_platform": context.get("source_platform_text"),
        "project_name": context.get("project_name"),
        "selected_signal_phrases": context.get("selected_signal_phrases", []),
        "hit_rules": [
            {
                "keyword": item.get("keyword"),
                "category": item.get("category"),
                "explanation": item.get("explanation"),
            }
            for item in context.get("hit_rules", [])[:8]
        ],
        "related_cases": [
            {
                "title": item.get("title"),
                "event_date": item.get("event_date"),
                "risk_points": item.get("risk_points", [])[:4],
            }
            for item in context.get("related_cases", [])[:3]
        ],
    }
    return (
        "请分析下面这段副业/兼职/课程文案的风险。"
        "输出 JSON，字段必须是："
        "summary:string, risk_mechanism:string, confidence:high|medium|low, "
        "extra_risk_points:string[], suggested_actions:string[], verification_questions:string[]。"
        "不要输出 Markdown，不要输出代码块。\n\n"
        f"规则引擎上下文：{json.dumps(compact_context, ensure_ascii=False)}\n\n"
        f"用户输入：{text}"
    )


def post_chat_completion(base_url: str, api_key: str, payload: dict) -> dict:
    url = normalize_chat_url(base_url)
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    timeout = float(os.environ.get("LLM_TIMEOUT_SECONDS", "8"))
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "authorization": f"Bearer {api_key}",
            "content-type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def normalize_chat_url(base_url: str) -> str:
    base = str(base_url or "").rstrip("/")
    if base.endswith("/chat/completions"):
        return base
    if base.endswith("/v1"):
        return f"{base}/chat/completions"
    return f"{base}/v1/chat/completions"


def parse_json_content(content: str) -> dict:
    text = str(content or "").strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.S)
    if fenced:
        text = fenced.group(1)
    return json.loads(text)


def normalize_analysis(data: dict) -> dict:
    analysis = DEFAULT_ANALYSIS.copy()
    analysis.update(
        {
            "status": "completed",
            "summary": safe_string(data.get("summary"), 160),
            "risk_mechanism": safe_string(data.get("risk_mechanism"), 260),
            "confidence": data.get("confidence") if data.get("confidence") in {"high", "medium", "low"} else "medium",
            "extra_risk_points": safe_list(data.get("extra_risk_points"), 5, 40),
            "suggested_actions": safe_list(data.get("suggested_actions"), 5, 48),
            "verification_questions": safe_list(data.get("verification_questions"), 5, 52),
        }
    )
    return analysis


def safe_string(value, max_len: int) -> str:
    return str(value or "").strip()[:max_len]


def safe_list(value, max_items: int, max_len: int) -> list[str]:
    if not isinstance(value, list):
        return []
    items = []
    for item in value:
        text = safe_string(item, max_len)
        if text and text not in items:
            items.append(text)
        if len(items) >= max_items:
            break
    return items


def merge_llm_analysis(result: dict, analysis: dict) -> dict:
    merged = dict(result)
    merged["llm_analysis"] = analysis
    merged["llm_used"] = analysis.get("status") == "completed"
    if analysis.get("status") != "completed":
        return merged

    for field, source in [
        ("suggested_actions", analysis.get("suggested_actions", [])),
        ("questions_to_verify", analysis.get("verification_questions", [])),
    ]:
        existing = list(merged.get(field, []))
        for item in source:
            if item not in existing:
                existing.append(item)
        merged[field] = existing[:8]
    return merged
