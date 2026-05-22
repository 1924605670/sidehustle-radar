# 接口与数据设计

## 1. 枚举

### 1.1 风险等级

```json
{
  "low": "低风险",
  "medium": "中风险",
  "high": "高风险",
  "extreme": "极高风险"
}
```

### 1.2 项目分类

```json
[
  "high_risk_part_time",
  "ai_side_job",
  "creator_monetization",
  "content_service",
  "ecommerce",
  "local_service",
  "survey_and_task",
  "education_service",
  "other"
]
```

## 2. 数据表

### 2.1 projects

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 项目 ID |
| slug | string | URL/小程序路由标识 |
| title | string | 项目名称 |
| aliases | string[] | 别名 |
| category | string | 分类 |
| risk_level | string | 风险等级 |
| risk_score | number | 风险分 |
| summary | string | 一句话结论 |
| money_logic | string | 收益逻辑解释 |
| threshold | object | 时间、技能、资金、资源门槛 |
| suitable_for | string[] | 适合人群 |
| not_suitable_for | string[] | 不适合人群 |
| common_traps | string[] | 常见坑 |
| verification_steps | string[] | 低成本验证步骤 |
| red_flags | string[] | 红线提醒 |
| source_refs | string[] | 来源 ID |
| status | string | draft/reviewing/published/archived |
| updated_at | string | 更新时间 |

### 2.2 risk_keywords

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 规则 ID |
| keyword | string | 关键词或正则 |
| match_type | string | keyword/regex/combo |
| category | string | 风险类别 |
| score | number | 加分 |
| force_level | string/null | 强制风险等级 |
| explanation | string | 命中解释 |
| enabled | boolean | 是否启用 |

### 2.3 scan_records

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 检测记录 ID |
| anonymous_user_id | string | 匿名用户 ID |
| source_platform | string | 文案来源 |
| input_hash | string | 原文哈希 |
| input_text | string/null | 默认不保存，用户主动保存时才保存 |
| risk_score | number | 风险分 |
| risk_level | string | 风险等级 |
| hit_rule_ids | string[] | 命中规则 |
| ai_summary | string | AI 风险解释 |
| save_status | string | anonymous/saved/deleted |
| created_at | string | 创建时间 |

### 2.4 search_logs

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 记录 ID |
| anonymous_user_id | string | 匿名用户 ID |
| keyword | string | 搜索词 |
| result_count | number | 搜索结果数 |
| created_at | string | 搜索时间 |

### 2.5 feedback

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string | 反馈 ID |
| type | string | project_missing/scan_wrong/content_wrong/other |
| content | string | 反馈内容 |
| related_id | string/null | 关联项目或检测记录 |
| contact_optional | string/null | 用户自愿联系方式 |
| status | string | pending/reviewed/resolved/rejected |
| created_at | string | 创建时间 |

## 3. API 设计

### 3.1 GET /projects

用途：项目搜索与列表。

请求参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| q | string | 否 | 搜索词 |
| category | string | 否 | 分类 |
| risk_level | string | 否 | 风险等级 |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页数量 |

响应：

```json
{
  "items": [
    {
      "id": "p_brushing_rebate",
      "slug": "brushing-rebate",
      "title": "刷单返利",
      "risk_level": "extreme",
      "risk_score": 98,
      "summary": "高危，常见于先返小额再诱导垫资。"
    }
  ],
  "total": 1
}
```

### 3.2 GET /projects/:slug

用途：项目详情。

响应：返回完整 `projects` 字段。

### 3.3 POST /risk-scan

用途：文案风险检测。

请求：

```json
{
  "text": "点赞关注日结，导师带单，先完成任务返佣",
  "source_platform": "wechat_group",
  "save_history": false
}
```

响应：

```json
{
  "risk_score": 95,
  "risk_level": "extreme",
  "hit_rules": [
    {
      "id": "rk_brushing",
      "keyword": "刷单",
      "explanation": "刷单返利是高危网络兼职诈骗类型。"
    }
  ],
  "possible_pattern": "疑似刷单返利或任务返佣套路",
  "suggested_actions": [
    "不要垫资",
    "不要下载陌生 App",
    "不要提供验证码或银行卡信息"
  ],
  "questions_to_verify": [
    "是否需要先付款、充值或垫资？",
    "是否有清晰公司主体和合同？",
    "结算是否通过正规劳动或服务协议？"
  ]
}
```

### 3.4 POST /fit-test

用途：副业适配测试。

请求：

```json
{
  "answers": {
    "time_per_day": "1-2h",
    "show_face": false,
    "can_edit_video": true,
    "can_write": true,
    "willing_to_sell": false,
    "trial_budget": "0-200",
    "goal": "long_term",
    "work_type": "content"
  }
}
```

响应：

```json
{
  "recommended_project_ids": ["p_video_editing", "p_xiaohongshu_cover", "p_public_account_layout"],
  "avoid_project_ids": ["p_brushing_rebate", "p_cashout_running_points"],
  "seven_day_plan": [
    "第 1 天：选 3 个同行样例拆解。",
    "第 2-3 天：做 2 个免费样例。",
    "第 4-7 天：找 10 个潜在客户询问是否需要。"
  ],
  "disclaimer": "推荐结果仅用于降低试错成本，不代表收益承诺。"
}
```

### 3.5 POST /feedback

用途：用户反馈。

请求：

```json
{
  "type": "scan_wrong",
  "related_id": "scan_123",
  "content": "这个文案被判太高了，实际是正规活动。"
}
```

响应：

```json
{
  "ok": true
}
```

## 4. 风险检测伪代码

```js
function scanRisk(text, rules) {
  const normalized = normalize(text)
  const hits = []
  let score = 0
  let forcedLevel = null

  for (const rule of rules) {
    if (!rule.enabled) continue
    if (matchRule(normalized, rule)) {
      hits.push(rule)
      score += rule.score
      forcedLevel = maxLevel(forcedLevel, rule.force_level)
    }
  }

  const cappedScore = Math.min(score, 100)
  const levelByScore = scoreToLevel(cappedScore)
  const finalLevel = maxLevel(levelByScore, forcedLevel)

  return {
    risk_score: cappedScore,
    risk_level: finalLevel,
    hit_rules: hits
  }
}
```

