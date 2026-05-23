const LEVEL_TEXT = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  extreme: '极高风险'
};

const CATEGORY_TEXT = {
  high_risk_part_time: '高危套路',
  creator_monetization: '内容变现',
  ai_side_job: 'AI 副业',
  survey_and_task: '任务平台',
  ecommerce: '电商项目',
  content_service: '接单服务',
  local_service: '本地服务',
  game_service: '游戏服务'
};

function riskText(level) {
  return LEVEL_TEXT[level] || '未知';
}

function categoryText(category) {
  return CATEGORY_TEXT[category] || '其他方向';
}

function decisionText(level) {
  if (level === 'extreme') {
    return '建议直接避开';
  }
  if (level === 'high') {
    return '先看证据再决定';
  }
  if (level === 'medium') {
    return '先小步验证';
  }
  return '可先低成本试单';
}

function decorateCase(item) {
  const riskPoints = item.risk_points || [];
  return {
    ...item,
    risk_points_preview: riskPoints.slice(0, 4),
    source_label: [item.source_name, item.event_date].filter(Boolean).join(' · ')
  };
}

function decorateProject(item) {
  const redFlags = item.red_flags || [];
  return {
    ...item,
    risk_level_text: riskText(item.risk_level),
    risk_class: `risk-${item.risk_level || 'medium'}`,
    category_text: categoryText(item.category),
    decision_text: decisionText(item.risk_level),
    red_flags_preview: redFlags.slice(0, 4),
    top_case: item.top_case ? decorateCase(item.top_case) : null
  };
}

function rememberProject(project) {
  if (!project || !project.id) {
    return;
  }
  const current = wx.getStorageSync('recent_projects') || [];
  const next = [
    decorateProject(project),
    ...current.filter((item) => item.id !== project.id)
  ].slice(0, 8);
  wx.setStorageSync('recent_projects', next);
}

module.exports = {
  LEVEL_TEXT,
  decorateCase,
  decorateProject,
  rememberProject,
  riskText,
  categoryText,
  decisionText
};
