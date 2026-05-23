const { decorateCase, riskText } = require('../../utils/format');

function decisionTone(level) {
  if (level === 'extreme') {
    return 'extreme';
  }
  if (level === 'high') {
    return 'high';
  }
  if (level === 'low') {
    return 'low';
  }
  return 'medium';
}

function decisionTitle(level) {
  if (level === 'extreme') {
    return '建议直接停止，不要付款或继续沟通';
  }
  if (level === 'high') {
    return '先暂停投入，把主体和交付核清楚';
  }
  if (level === 'medium') {
    return '可以小步验证，但不要先交钱';
  }
  return '暂未命中强风险，仍要核实结算和主体';
}

Page({
  data: {
    result: {},
    hasResult: false
  },

  onLoad() {
    const result = wx.getStorageSync('last_scan_result') || {};
    result.risk_level_text = riskText(result.risk_level);
    result.risk_class = `risk-${result.risk_level || 'medium'}`;
    result.decision_tone = decisionTone(result.risk_level);
    result.decision_title = decisionTitle(result.risk_level);
    result.primary_actions = (result.suggested_actions || []).slice(0, 3);
    result.primary_questions = (result.questions_to_verify || []).slice(0, 2);
    result.related_cases = (result.related_cases || []).map(decorateCase);
    result.selected_signal_phrases = result.selected_signal_phrases || [];
    result.llm_analysis = result.llm_analysis || {};
    result.llm_analysis.extra_risk_points = result.llm_analysis.extra_risk_points || [];
    result.llm_analysis.suggested_actions = result.llm_analysis.suggested_actions || [];
    result.llm_analysis.verification_questions = result.llm_analysis.verification_questions || [];
    result.has_llm_analysis = result.llm_analysis.status === 'completed';
    result.input_mode_text = {
      copy: '文案检测',
      project: '项目快查',
      checklist: '红线自查'
    }[result.input_mode] || '风险检测';
    this.setData({
      result,
      hasResult: Boolean(result.risk_level)
    });
  },

  goScan() {
    wx.switchTab({ url: '/pages/scan/scan' });
  },

  goProjects() {
    wx.switchTab({ url: '/pages/projects/projects' });
  },

  copySource(event) {
    const url = event.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: '已复制来源链接', icon: 'none' });
      }
    });
  }
});
