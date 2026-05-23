const { decorateCase, decorateProject, riskText } = require('../../utils/format');
const { track } = require('../../utils/track');

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
    result.matched_projects = (result.matched_projects || []).map(decorateProject);
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
    if (result.risk_level) {
      track('result_view', {
        risk_level: result.risk_level,
        risk_score: result.risk_score,
        hit_rule_count: (result.hit_rules || []).length,
        related_case_count: result.related_cases.length,
        matched_project_count: result.matched_projects.length
      }, 'result');
    }
  },

  goScan() {
    wx.switchTab({ url: '/pages/scan/scan' });
  },

  goProjects() {
    wx.switchTab({ url: '/pages/projects/projects' });
  },

  openProject(event) {
    const slug = event.currentTarget.dataset.slug;
    track('project_detail_click', { slug, from: 'scan_result' }, 'result');
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?slug=${encodeURIComponent(slug)}`
    });
  },

  copyConclusion() {
    const result = this.data.result || {};
    const actions = (result.primary_actions || []).map((item, index) => `${index + 1}. ${item}`).join('\n');
    const questions = (result.primary_questions || []).map((item, index) => `${index + 1}. ${item}`).join('\n');
    const text = [
      `风险等级：${result.risk_level_text || '未知'}（${result.risk_score || 0}分）`,
      `判断：${result.decision_title || ''}`,
      result.possible_pattern ? `原因：${result.possible_pattern}` : '',
      actions ? `\n先做：\n${actions}` : '',
      questions ? `\n再问清楚：\n${questions}` : ''
    ].filter(Boolean).join('\n');
    wx.setClipboardData({
      data: text,
      success() {
        wx.showToast({ title: '已复制风险结论', icon: 'none' });
      }
    });
    track('copy_result_conclusion', { risk_level: result.risk_level }, 'result');
  },

  markInaccurate() {
    const result = this.data.result || {};
    track('result_feedback_inaccurate', {
      risk_level: result.risk_level,
      risk_score: result.risk_score
    }, 'result');
    wx.showToast({ title: '已记录反馈，会用于优化规则', icon: 'none' });
  },

  copySource(event) {
    const url = event.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: '已复制来源链接', icon: 'none' });
      }
    });
    track('copy_source', { from: 'result_cases' }, 'result');
  },

  onShareAppMessage() {
    const result = this.data.result || {};
    track('share_result', { risk_level: result.risk_level }, 'result');
    return {
      title: `这段副业文案风险：${result.risk_level_text || '待判断'}`,
      path: '/pages/scan/scan'
    };
  }
});
