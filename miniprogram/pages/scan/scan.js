const { request } = require('../../utils/api');

Page({
  data: {
    text: ''
  },

  onTextInput(event) {
    this.setData({ text: event.detail.value });
  },

  scan() {
    const text = this.data.text.trim();
    if (text.length < 10) {
      wx.showToast({ title: '请粘贴更完整的文案', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '检测中' });
    request('/risk-scan', {
      method: 'POST',
      data: {
        text,
        source_platform: 'unknown',
        save_history: false
      }
    })
      .then((res) => {
        wx.setStorageSync('last_scan_result', res);
        wx.navigateTo({ url: '/pages/result/result' });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '检测失败', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
  }
});

