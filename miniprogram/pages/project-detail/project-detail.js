const { request } = require('../../utils/api');
const { decorateCase, decorateProject, rememberProject } = require('../../utils/format');
const { track } = require('../../utils/track');

function decisionTone(level) {
  if (level === 'extreme') {
    return 'extreme';
  }
  if (level === 'high') {
    return 'high';
  }
  if (level === 'low') {
    return 'low';
  }
  return 'medium';
}

function entriesFromThreshold(threshold) {
  const labels = {
    time: '时间',
    skill: '技能',
    cost: '成本',
    resource: '资源'
  };
  return Object.keys(labels).map((key) => ({
    label: labels[key],
    value: threshold && threshold[key] ? threshold[key] : '未明确'
  }));
}

Page({
  data: {
    loading: true,
    project: null,
    thresholdEntries: []
  },

  onLoad(query) {
    const slug = decodeURIComponent(query.slug || '');
    this.loadProject(slug);
  },

  loadProject(slug) {
    this.setData({ loading: true });
    request(`/projects/${encodeURIComponent(slug)}`)
      .then((project) => {
        const decorated = decorateProject({
          ...project,
          cases: (project.cases || []).map(decorateCase)
        });
        decorated.decision_tone = decisionTone(decorated.risk_level);
        decorated.primary_steps = (decorated.verification_steps || []).slice(0, 3);
        rememberProject(decorated);
        wx.setNavigationBarTitle({ title: project.title || '项目详情' });
        this.setData({
          project: decorated,
          thresholdEntries: entriesFromThreshold(project.threshold),
          loading: false
        });
        track('project_detail_view', {
          slug,
          risk_level: decorated.risk_level,
          case_count: decorated.cases.length
        }, 'project-detail');
      })
      .catch(() => {
        this.setData({ loading: false });
        wx.showToast({ title: '详情加载失败', icon: 'none' });
      });
  },

  goScan() {
    wx.switchTab({ url: '/pages/scan/scan' });
  },

  copyChecklist() {
    const project = this.data.project || {};
    const steps = project.verification_steps || [];
    wx.setClipboardData({
      data: steps.join('\n'),
      success() {
        wx.showToast({ title: '已复制核验清单', icon: 'none' });
      }
    });
    track('copy_checklist', { project_id: project.id, slug: project.slug }, 'project-detail');
  },

  copySource(event) {
    const url = event.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: '已复制来源链接', icon: 'none' });
      }
    });
    track('copy_source', { from: 'project_detail' }, 'project-detail');
  }
});
