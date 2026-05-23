const { request } = require('../../utils/api');
const { decorateCase } = require('../../utils/format');
const { track } = require('../../utils/track');

const MODE_TIPS = {
  copy: '适合把广告、招聘话术、私聊内容直接贴进来。',
  project: '只记得项目名时，先看这个方向常见风险和关键词。',
  checklist: '当文案不完整时，用红线自查快速补充线索。'
};

Page({
  data: {
    text: '',
    projectName: '',
    activeMode: 'copy',
    activeModeTip: MODE_TIPS.copy,
    showAdvanced: false,
    formError: '',
    selectedPlatform: 'unknown',
    selectedSignals: [],
    submitting: false,
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
    this.setData({
      text: event.detail.value,
      formError: ''
    });
  },

  onProjectInput(event) {
    this.setData({
      projectName: event.detail.value,
      formError: ''
    });
  },

  switchMode(event) {
    const activeMode = event.currentTarget.dataset.mode;
    this.setData({
      activeMode,
      activeModeTip: MODE_TIPS[activeMode] || MODE_TIPS.copy,
      formError: ''
    });
  },

  selectPlatform(event) {
    this.setData({
      selectedPlatform: event.currentTarget.dataset.platform,
      formError: ''
    });
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
      signalOptions: decorateSignals(selectedSignals),
      formError: ''
    });
  },

  toggleAdvanced() {
    this.setData({ showAdvanced: !this.data.showAdvanced });
  },

  scan() {
    if (this.data.submitting) {
      return;
    }
    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.setData({ submitting: true });
    track('risk_scan_submit', {
      mode: payload.input_mode,
      platform: payload.source_platform,
      text_length: payload.raw_text.length,
      signal_count: payload.risk_signals.length
    }, 'scan');
    wx.showLoading({ title: '检测中' });
    request('/risk-scan', {
      method: 'POST',
      data: payload
    })
      .then((res) => {
        const count = wx.getStorageSync('scan_count') || 0;
        wx.setStorageSync('scan_count', count + 1);
        wx.setStorageSync('last_scan_result', res);
        track('risk_scan_success', {
          mode: payload.input_mode,
          platform: payload.source_platform,
          risk_level: res.risk_level,
          risk_score: res.risk_score,
          hit_rule_count: (res.hit_rules || []).length,
          related_case_count: (res.related_cases || []).length,
          matched_project_count: (res.matched_projects || []).length
        }, 'scan');
        wx.navigateTo({ url: '/pages/result/result' });
      })
      .catch((err) => {
        track('risk_scan_fail', {
          mode: payload.input_mode,
          message: err.message || err.errMsg || 'unknown'
        }, 'scan');
        wx.showToast({ title: err.message || '检测失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
        wx.hideLoading();
      });
  },

  buildPayload() {
    const text = this.data.text.trim();
    const projectName = this.data.projectName.trim();
    const selectedSignals = this.data.signalOptions
      .filter((item) => this.data.selectedSignals.includes(item.key));

    if (this.data.activeMode === 'copy' && text.length < 10) {
      this.setData({ formError: '请先粘贴更完整的文案，至少 10 个字。' });
      wx.showToast({ title: '请粘贴更完整的文案', icon: 'none' });
      return null;
    }
    if (this.data.activeMode === 'project' && projectName.length < 2) {
      this.setData({ formError: '请先输入项目名称，至少 2 个字。' });
      wx.showToast({ title: '请输入项目名称', icon: 'none' });
      return null;
    }
    if (this.data.activeMode === 'checklist' && selectedSignals.length === 0 && text.length < 6) {
      this.setData({ formError: '请至少勾选一个红线，或补充几句描述。' });
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

    this.setData({ formError: '' });
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
    track('scan_example_use', { text_length: text.length }, 'scan');
  },

  clearText() {
    this.setData({
      text: '',
      projectName: '',
      formError: '',
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
    track('copy_source', { from: 'scan_cases' }, 'scan');
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
