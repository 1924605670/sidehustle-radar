# 项目风险卡维护模板

运营新增项目时，按此模板填写。不要写收益承诺，不要写操作教程。

```json
{
  "id": "p_example",
  "slug": "example",
  "title": "项目名称",
  "aliases": ["别名1", "别名2"],
  "category": "creator_monetization",
  "risk_level": "medium",
  "risk_score": 55,
  "summary": "一句话结论，说明能否低成本了解，以及主要风险。",
  "money_logic": "它理论上靠什么赚钱，用通俗语言解释。如果说不清楚，写收益逻辑不透明。",
  "threshold": {
    "time": "每天需要投入的时间",
    "skill": "需要的能力",
    "cost": "启动成本",
    "resource": "需要的资源"
  },
  "suitable_for": ["适合人群"],
  "not_suitable_for": ["不适合人群"],
  "common_traps": ["常见坑"],
  "verification_steps": ["低成本验证步骤"],
  "red_flags": ["出现这些情况应停止"],
  "source_refs": ["S001"],
  "status": "published",
  "updated_at": "2026-05-22"
}
```

## 文案要求

- 用“风险、门槛、验证、谨慎”表达。
- 不使用“稳赚、暴利、躺赚、日赚、内部渠道”等词。
- 不提供违法违规操作步骤。
- 对高危项目只写识别方式和停止建议。
- 对中低风险项目也必须写明不确定性和验证方法。

