const { request } = require('../../utils/api');
const { decorateProject } = require('../../utils/format');

Page({
  data: {
    keyword: '',
    loading: false,
    items: [],
    total: 0,
    activeLevel: '',
    levelFilters: [
      { value: '', text: '全部' },
      { value: 'extreme', text: '极高' },
      { value: 'high', text: '高危' },
      { value: 'medium', text: '中等' },
      { value: 'low', text: '低风险' }
    ]
  },

  onLoad(query) {
    const keyword = decodeURIComponent(query.q || '');
    this.setData({ keyword });
    this.search();
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
    request(`/projects?${params.join('&')}`)
      .then((res) => {
        const items = (res.items || []).map(decorateProject);
        this.setData({ items, total: res.total || items.length });
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

  openProject(event) {
    const slug = event.currentTarget.dataset.slug;
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?slug=${encodeURIComponent(slug)}`
    });
  }
});
