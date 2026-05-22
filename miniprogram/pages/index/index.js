const { request } = require('../../utils/api');

Page({
  data: {
    keyword: '',
    hotKeywords: ['刷单返利', '点赞关注日结', '小说推文', '短剧推广', 'AI 写作投稿', '无人直播']
  },

  onLoad() {
    request('/hot-keywords')
      .then((res) => this.setData({ hotKeywords: res.items || this.data.hotKeywords }))
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
  }
});

