const { request } = require('./api');

function anonymousId() {
  let id = wx.getStorageSync('anonymous_id');
  if (!id) {
    id = `u_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    wx.setStorageSync('anonymous_id', id);
  }
  return id;
}

function track(eventName, payload = {}, page = '') {
  if (!eventName) {
    return;
  }
  request('/events', {
    method: 'POST',
    timeout: 5000,
    data: {
      event_name: eventName,
      anonymous_id: anonymousId(),
      page,
      payload
    }
  }).catch(() => {});
}

module.exports = {
  track
};
