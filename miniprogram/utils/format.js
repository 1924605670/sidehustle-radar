const LEVEL_TEXT = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  extreme: '极高风险'
};

function riskText(level) {
  return LEVEL_TEXT[level] || '未知';
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
  riskText
};
