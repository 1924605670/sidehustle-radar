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
    topProjects: [],
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
      request('/cases?limit=3')
    ])
      .then(([projectRes, caseRes]) => {
        const projects = projectRes.items || [];
        const highRisk = projects.filter((item) => ['high', 'extreme'].indexOf(item.risk_level) >= 0).length;
        this.setData({
          stats: {
            projects: projectRes.total || projects.length,
            cases: caseRes.total || (caseRes.items || []).length,
            highRisk
          },
          topProjects: projects.slice(0, 4).map(decorateProject),
          latestCases: (caseRes.items || []).map(decorateCase)
        });
      })
      .catch(() => {});
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
  },

  goSearch() {
    const keyword = this.data.keyword.trim();
    wx.navigateTo({
      url: `/pages/projects/projects?q=${encodeURIComponent(keyword)}`
    });
  },

  searchTag(event) {
    const keyword = event.currentTarget.dataset.keyword;
    wx.navigateTo({
      url: `/pages/projects/projects?q=${encodeURIComponent(keyword)}`
    });
  },

  goScan() {
    wx.switchTab({
      url: '/pages/scan/scan'
    });
  },

  goProjects() {
    wx.navigateTo({
      url: '/pages/projects/projects'
    });
  },

  openProject(event) {
    const slug = event.currentTarget.dataset.slug;
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?slug=${encodeURIComponent(slug)}`
    });
  }
});
