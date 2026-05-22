const { request } = require('../../utils/api');

Page({
  mockTest() {
    wx.showLoading({ title: '生成中' });
    request('/fit-test', {
      method: 'POST',
      data: {
        answers: {
          can_edit_video: true,
          can_write: false,
          willing_to_sell: false,
          work_type: 'content'
        }
      }
    })
      .then((res) => {
        wx.showModal({
          title: '推荐结果',
          content: `推荐方向：${res.recommended_project_ids.join('、')}`,
          showCancel: false
        });
      })
      .finally(() => wx.hideLoading());
  }
});

