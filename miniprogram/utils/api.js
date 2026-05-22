function apiBase() {
  const app = getApp();
  return app.globalData.apiBase;
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBase()}${path}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json'
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data || { message: '请求失败' });
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  request
};

