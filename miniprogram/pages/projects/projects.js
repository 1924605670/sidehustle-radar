const { request } = require('../../utils/api');

Page({
  data: {
    keyword: '',
    loading: false,
    items: [],
    levelText: {
      low: '低风险',
      medium: '中风险',
      high: '高风险',
      extreme: '极高风险'
    }
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
    request(`/projects?q=${encodeURIComponent(this.data.keyword)}`)
      .then((res) => {
        const items = (res.items || []).map((item) => ({
          ...item,
          risk_level_text: this.data.levelText[item.risk_level] || '未知'
        }));
        this.setData({ items });
      })
      .catch(() => {
        wx.showToast({ title: '查询失败', icon: 'none' });
      })
      .finally(() => this.setData({ loading: false }));
  }
});
