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
