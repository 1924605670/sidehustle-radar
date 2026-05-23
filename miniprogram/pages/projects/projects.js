const { request } = require('../../utils/api');
const { decorateProject } = require('../../utils/format');
const { track } = require('../../utils/track');

Page({
  data: {
    keyword: '',
    loading: false,
    items: [],
    total: 0,
    loadedOnce: false,
    activeLevel: '',
    activeCategory: '',
    filterSummary: [],
    levelFilters: [
      { value: '', text: '全部风险' },
      { value: 'extreme', text: '极高风险' },
      { value: 'high', text: '高风险' },
      { value: 'medium', text: '中风险' },
      { value: 'low', text: '低风险' }
    ],
    categoryFilters: [
      { value: '', text: '全部方向' },
      { value: 'high_risk_part_time', text: '高危套路' },
      { value: 'creator_monetization', text: '内容变现' },
      { value: 'ai_side_job', text: 'AI 副业' },
      { value: 'content_service', text: '接单服务' },
      { value: 'local_service', text: '本地服务' },
      { value: 'ecommerce', text: '电商项目' }
    ]
  },

  onLoad(query) {
    const keyword = decodeURIComponent(query.q || '');
    if (keyword) {
      this.setData({ keyword });
    }
  },

  onShow() {
    const state = wx.getStorageSync('projects_search_state');
    if (state && typeof state === 'object') {
      wx.removeStorageSync('projects_search_state');
      this.setData(
        {
          keyword: state.keyword || '',
          activeCategory: state.category || '',
          activeLevel: state.risk_level || ''
        },
        () => this.search()
      );
      return;
    }

    if (!this.data.loadedOnce) {
      this.search();
    }
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
  },

  search() {
    this.setData({ loading: true });
    const params = [`q=${encodeURIComponent(this.data.keyword)}`];
    if (this.data.activeLevel) {
      params.push(`risk_level=${this.data.activeLevel}`);
    }
    if (this.data.activeCategory) {
      params.push(`category=${this.data.activeCategory}`);
    }
    request(`/projects?${params.join('&')}`)
      .then((res) => {
        const items = (res.items || []).map(decorateProject);
        const keyword = this.data.keyword.trim();
        this.setData({
          items,
          total: res.total || items.length,
          loadedOnce: true,
          filterSummary: this.buildFilterSummary()
        });
        track('project_search', {
          has_keyword: Boolean(keyword),
          keyword_length: keyword.length,
          result_count: res.total || items.length,
          category: this.data.activeCategory,
          risk_level: this.data.activeLevel,
          empty: (res.total || items.length) === 0
        }, 'projects');
      })
      .catch(() => {
        wx.showToast({ title: '查询失败', icon: 'none' });
      })
      .finally(() => this.setData({ loading: false }));
  },

  selectLevel(event) {
    const level = event.currentTarget.dataset.level || '';
    this.setData({ activeLevel: level }, () => this.search());
  },

  selectCategory(event) {
    const category = event.currentTarget.dataset.category || '';
    this.setData({ activeCategory: category }, () => this.search());
  },

  clearKeyword() {
    this.setData({ keyword: '' }, () => this.search());
  },

  clearAllFilters() {
    this.setData(
      {
        keyword: '',
        activeCategory: '',
        activeLevel: ''
      },
      () => this.search()
    );
  },

  buildFilterSummary() {
    const summary = [];
    if (this.data.keyword.trim()) {
      summary.push(`关键词：${this.data.keyword.trim()}`);
    }
    const level = this.data.levelFilters.find((item) => item.value === this.data.activeLevel);
    const category = this.data.categoryFilters.find((item) => item.value === this.data.activeCategory);
    if (category && category.value) {
      summary.push(`方向：${category.text}`);
    }
    if (level && level.value) {
      summary.push(`风险：${level.text}`);
    }
    return summary;
  },

  goScan() {
    wx.switchTab({ url: '/pages/scan/scan' });
  },

  goFit() {
    wx.navigateTo({ url: '/pages/fit/fit' });
  },

  openProject(event) {
    const slug = event.currentTarget.dataset.slug;
    track('project_detail_click', { slug, from: 'projects' }, 'projects');
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?slug=${encodeURIComponent(slug)}`
    });
  }
});
