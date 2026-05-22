const { request } = require('../../utils/api');

Page({
  data: {
    text: '',
    examples: [
      '点赞关注日结，导师带单，下载APP做任务返佣，做满三单即可提现。',
      '招聘视频剪辑兼职，按条结算，提供素材和脚本，试剪一条后报价。',
      '虚拟币搬砖套利，保证收益，充值越多返利越高。'
    ]
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
        const count = wx.getStorageSync('scan_count') || 0;
        wx.setStorageSync('scan_count', count + 1);
        wx.setStorageSync('last_scan_result', res);
        wx.navigateTo({ url: '/pages/result/result' });
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '检测失败', icon: 'none' });
      })
      .finally(() => wx.hideLoading());
  },

  useExample(event) {
    const text = event.currentTarget.dataset.text;
    this.setData({ text });
  },

  clearText() {
    this.setData({ text: '' });
  }
});
