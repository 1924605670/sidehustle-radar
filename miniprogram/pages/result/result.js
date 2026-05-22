Page({
  data: {
    result: {},
    levelText: {
      low: '低风险',
      medium: '中风险',
      high: '高风险',
      extreme: '极高风险'
    }
  },

  onLoad() {
    const result = wx.getStorageSync('last_scan_result') || {};
    result.risk_level_text = this.data.levelText[result.risk_level] || '未知';
    this.setData({
      result
    });
  }
});
