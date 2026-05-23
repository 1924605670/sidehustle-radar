const { request } = require('../../utils/api');
const { decorateProject } = require('../../utils/format');

Page({
  data: {
    stats: {
      projects: 0,
      cases: 0,
      scans: 0
    },
    recentProjects: [],
    quickTools: [
      { key: 'scan', title: '检测文案', desc: '把广告话术拆成风险信号' },
      { key: 'projects', title: '项目库', desc: '直接查项目风险档案' },
      { key: 'fit', title: '起步建议', desc: '先筛掉不适合的方向' },
      { key: 'feedback', title: '反馈模板', desc: '补项目或补案例时可直接用' }
    ],
    principles: [
      '凡是先交钱、充值、押金、垫资，先停止。',
      '凡是要银行卡、验证码、人脸、收款码，不参与。',
      '凡是承诺稳赚、保底、日入几百，先找真实案例。',
      '真正可验证的副业，应该能说明交付物、客户和结算方式。'
    ]
  },

  onShow() {
    this.loadLocal();
    this.loadStats();
  },

  loadLocal() {
    this.setData({
      recentProjects: (wx.getStorageSync('recent_projects') || []).map(decorateProject),
      'stats.scans': wx.getStorageSync('scan_count') || 0
    });
  },

  loadStats() {
    Promise.all([
      request('/projects?page_size=1'),
      request('/cases?limit=1')
    ])
      .then(([projectRes, caseRes]) => {
        this.setData({
          'stats.projects': projectRes.total || 0,
          'stats.cases': caseRes.total || 0
        });
      })
      .catch(() => {});
  },

  handleQuickTool(event) {
    const action = event.currentTarget.dataset.action;
    if (action === 'scan') {
      return this.goScan();
    }
    if (action === 'projects') {
      return this.goProjects();
    }
    if (action === 'fit') {
      return this.goFit();
    }
    return this.copyFeedback();
  },

  openProject(event) {
    const slug = event.currentTarget.dataset.slug;
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?slug=${encodeURIComponent(slug)}`
    });
  },

  goProjects() {
    wx.switchTab({ url: '/pages/projects/projects' });
  },

  goScan() {
    wx.switchTab({ url: '/pages/scan/scan' });
  },

  goFit() {
    wx.navigateTo({ url: '/pages/fit/fit' });
  },

  clearRecent() {
    wx.removeStorageSync('recent_projects');
    this.setData({ recentProjects: [] });
    wx.showToast({ title: '已清空', icon: 'none' });
  },

  copyFeedback() {
    wx.setClipboardData({
      data: '请补充：项目名称、看到的平台、具体文案、是否要求付费/下载App/提供信息、对应公开来源。',
      success() {
        wx.showToast({ title: '已复制反馈模板', icon: 'none' });
      }
    });
  }
});
