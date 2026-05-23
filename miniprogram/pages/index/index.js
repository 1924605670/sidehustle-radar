const { request } = require('../../utils/api');
const { decorateCase, decorateProject } = require('../../utils/format');

Page({
  data: {
    keyword: '',
    hotKeywords: ['刷单返利', '点赞关注日结', '小说推文', '短剧推广', 'AI 写作投稿', '无人直播'],
    stats: {
      projects: 0,
      cases: 0,
      highRisk: 0
    },
    trustNotes: ['近两年优先', '公开来源可追溯', '默认不保存原文'],
    processSteps: [
      { title: '先查项目', desc: '先看这个方向的风险级别、常见坑和真实门槛。' },
      { title: '再测文案', desc: '把广告、私聊话术或课程文案拆成风险信号。' },
      { title: '最后决定', desc: '结合案例证据和低成本验证步骤，再决定是否投入时间和钱。' }
    ],
    quickActions: [
      { key: 'projects', title: '查项目', desc: '先看风险档案' },
      { key: 'scan', title: '测文案', desc: '识别危险话术' },
      { key: 'fit', title: '做适配', desc: '先筛掉不适合的方向' }
    ],
    topProjects: [],
    starterProjects: [],
    latestCases: []
  },

  onLoad() {
    request('/hot-keywords')
      .then((res) => this.setData({ hotKeywords: res.items || this.data.hotKeywords }))
      .catch(() => {});
    this.loadHomeData();
  },

  loadHomeData() {
    Promise.all([
      request('/projects?page_size=50'),
      request('/cases?limit=4')
    ])
      .then(([projectRes, caseRes]) => {
        const projects = (projectRes.items || []).map(decorateProject);
        const highRisk = projects.filter((item) => ['high', 'extreme'].indexOf(item.risk_level) >= 0).length;
        const starterProjects = projects.filter((item) => {
          return ['low', 'medium'].indexOf(item.risk_level) >= 0
            && ['content_service', 'local_service', 'ai_side_job'].indexOf(item.category) >= 0;
        });

        this.setData({
          stats: {
            projects: projectRes.total || projects.length,
            cases: caseRes.total || (caseRes.items || []).length,
            highRisk
          },
          topProjects: projects.filter((item) => ['high', 'extreme'].indexOf(item.risk_level) >= 0).slice(0, 4),
          starterProjects: starterProjects.slice(0, 3),
          latestCases: (caseRes.items || []).map(decorateCase)
        });
      })
      .catch(() => {});
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
  },

  goSearch() {
    this.openProjects(this.data.keyword.trim());
  },

  searchTag(event) {
    const keyword = event.currentTarget.dataset.keyword;
    this.openProjects(keyword);
  },

  openProjects(keyword = '', extra = {}) {
    wx.setStorageSync('projects_search_state', {
      keyword,
      category: extra.category || '',
      risk_level: extra.risk_level || ''
    });
    wx.switchTab({ url: '/pages/projects/projects' });
  },

  goScan() {
    wx.switchTab({ url: '/pages/scan/scan' });
  },

  goFit() {
    wx.navigateTo({ url: '/pages/fit/fit' });
  },

  goCases() {
    this.openProjects('', { risk_level: 'high' });
  },

  handleQuickAction(event) {
    const action = event.currentTarget.dataset.action;
    if (action === 'scan') {
      return this.goScan();
    }
    if (action === 'fit') {
      return this.goFit();
    }
    return this.openProjects('');
  },

  openProject(event) {
    const slug = event.currentTarget.dataset.slug;
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?slug=${encodeURIComponent(slug)}`
    });
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
