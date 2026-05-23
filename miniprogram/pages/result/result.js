const { decorateCase, riskText } = require('../../utils/format');

Page({
  data: {
    result: {},
    hasResult: false
  },

  onLoad() {
    const result = wx.getStorageSync('last_scan_result') || {};
    result.risk_level_text = riskText(result.risk_level);
    result.risk_class = `risk-${result.risk_level || 'medium'}`;
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
