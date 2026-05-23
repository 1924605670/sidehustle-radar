const { request } = require('../../utils/api');
const { decorateCase } = require('../../utils/format');

Page({
  data: {
    text: '',
    projectName: '',
    activeMode: 'copy',
    selectedPlatform: 'unknown',
    selectedSignals: [],
    loadingCases: false,
    latestCases: [],
    modes: [
      { key: 'copy', text: '文案检测' },
      { key: 'project', text: '项目快查' },
      { key: 'checklist', text: '红线自查' }
    ],
    platforms: [
      { key: 'unknown', text: '不确定' },
      { key: 'wechat', text: '微信群' },
      { key: 'moments', text: '朋友圈' },
      { key: 'xiaohongshu', text: '小红书' },
      { key: 'douyin', text: '抖音' },
      { key: 'bilibili', text: 'B站' },
      { key: 'recruitment', text: '招聘平台' }
    ],
    signalOptions: decorateSignals([]),
    examples: [
      '点赞关注日结，导师带单，下载APP做任务返佣，做满三单即可提现。',
      'AI副业陪跑，零基础7天变现，购买课程后提供内部渠道和接单资源。',
      '短剧授权切片，保证月入过万，先交素材授权费和账号起号费。'
    ]
  },

  onLoad() {
    this.loadLatestCases();
  },

  onPullDownRefresh() {
    this.loadLatestCases().finally(() => wx.stopPullDownRefresh());
  },

  onTextInput(event) {
    this.setData({ text: event.detail.value });
  },

  onProjectInput(event) {
    this.setData({ projectName: event.detail.value });
  },

  switchMode(event) {
    this.setData({ activeMode: event.currentTarget.dataset.mode });
  },

  selectPlatform(event) {
    this.setData({ selectedPlatform: event.currentTarget.dataset.platform });
  },

  toggleSignal(event) {
    const key = event.currentTarget.dataset.key;
    const selected = new Set(this.data.selectedSignals);
    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.add(key);
    }
    const selectedSignals = Array.from(selected);
    this.setData({
      selectedSignals,
      signalOptions: decorateSignals(selectedSignals)
    });
  },

  scan() {
    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    wx.showLoading({ title: '检测中' });
    request('/risk-scan', {
      method: 'POST',
      data: payload
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

  buildPayload() {
    const text = this.data.text.trim();
    const projectName = this.data.projectName.trim();
    const selectedSignals = this.data.signalOptions
      .filter((item) => this.data.selectedSignals.includes(item.key));

    if (this.data.activeMode === 'copy' && text.length < 10) {
      wx.showToast({ title: '请粘贴更完整的文案', icon: 'none' });
      return null;
    }
    if (this.data.activeMode === 'project' && projectName.length < 2) {
      wx.showToast({ title: '请输入项目名称', icon: 'none' });
      return null;
    }
    if (this.data.activeMode === 'checklist' && selectedSignals.length === 0 && text.length < 6) {
      wx.showToast({ title: '请至少勾选一个红线', icon: 'none' });
      return null;
    }

    const parts = [];
    if (projectName) {
      parts.push(`项目名称：${projectName}`);
    }
    if (text) {
      parts.push(text);
    }
    if (selectedSignals.length) {
      parts.push(`已勾选风险信号：${selectedSignals.map((item) => item.phrase).join('；')}`);
    }

    return {
      text: parts.join('\n'),
      raw_text: text,
      project_name: projectName,
      input_mode: this.data.activeMode,
      source_platform: this.data.selectedPlatform,
      risk_signals: selectedSignals.map((item) => item.key),
      save_history: false
    };
  },

  useExample(event) {
    const text = event.currentTarget.dataset.text;
    this.setData({
      text,
      activeMode: 'copy'
    });
  },

  clearText() {
    this.setData({
      text: '',
      projectName: '',
      selectedSignals: [],
      signalOptions: decorateSignals([])
    });
  },

  loadLatestCases() {
    this.setData({ loadingCases: true });
    return request('/cases?limit=4')
      .then((res) => {
        this.setData({ latestCases: (res.items || []).map(decorateCase) });
      })
      .catch(() => {
        this.setData({ latestCases: [] });
      })
      .finally(() => this.setData({ loadingCases: false }));
  },

  copySource(event) {
    wx.setClipboardData({
      data: event.currentTarget.dataset.url,
      success() {
        wx.showToast({ title: '已复制来源链接', icon: 'none' });
      }
    });
  }
});

function decorateSignals(selectedSignals) {
  const selected = new Set(selectedSignals);
  return [
    { key: 'pay_first', text: '先交钱', phrase: '要求先付款、押金、充值或垫资' },
    { key: 'unknown_app', text: '陌生App', phrase: '要求下载陌生APP或跳到外部平台' },
    { key: 'guided_order', text: '导师带单', phrase: '导师带单、派单、抢单、补单' },
    { key: 'high_return', text: '高收益', phrase: '承诺稳赚、高日结、快速回本' },
    { key: 'sensitive_info', text: '要验证码/银行卡', phrase: '索要银行卡、验证码、身份证或人脸验证' },
    { key: 'invite_rebate', text: '拉人返佣', phrase: '通过拉人返佣、发展下线或团队裂变赚钱' },
    { key: 'copyright', text: '搬运素材', phrase: '去水印搬运、无授权切片或盗用素材' },
    { key: 'course', text: '卖课包赚', phrase: '高价课程、陪跑、内部渠道并承诺收益' }
  ].map((item) => ({
    ...item,
    active: selected.has(item.key)
  }));
}
