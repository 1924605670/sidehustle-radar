const { request } = require('../../utils/api');
const { decorateProject } = require('../../utils/format');

function buildQuestions() {
  return [
    {
      key: 'time_budget',
      title: '每周能稳定投入多久？',
      selectedIndex: -1,
      options: [
        { value: 'less_3h', text: '3 小时以内', desc: '优先选低成本、少交付的小任务。' },
        { value: '3_7h', text: '3-7 小时', desc: '可以做内容或轻服务验证。' },
        { value: '7h_plus', text: '7 小时以上', desc: '可尝试更完整的交付型项目。' }
      ]
    },
    {
      key: 'skill_profile',
      title: '你现在更接近哪种能力？',
      selectedIndex: -1,
      options: [
        { value: 'edit_video', text: '剪视频/做图', desc: '适合先做可展示样例。', payload: { can_edit_video: true } },
        { value: 'write', text: '写作/整理', desc: '适合简历、文案、资料整理。', payload: { can_write: true } },
        { value: 'sell', text: '沟通/销售', desc: '适合本地商家服务验证。', payload: { willing_to_sell: true } },
        { value: 'none', text: '还不确定', desc: '先从低风险工具型服务开始。' }
      ]
    },
    {
      key: 'work_type',
      title: '你更愿意做哪类副业？',
      selectedIndex: -1,
      options: [
        { value: 'content', text: '内容创作', desc: '短视频、图文、投稿类方向。' },
        { value: 'service', text: '接单服务', desc: '明确交付物，收益更可验证。' },
        { value: 'data', text: '资料整理', desc: '门槛低，但要避开收费陷阱。' }
      ]
    },
    {
      key: 'risk_preference',
      title: '你的风险底线是什么？',
      selectedIndex: -1,
      options: [
        { value: 'no_money_first', text: '绝不先交钱', desc: '避开押金、资料费、充值任务。' },
        { value: 'low_cost', text: '只接受低成本', desc: '先做样例验证，不囤货不买课。' },
        { value: 'can_learn', text: '愿意学习', desc: '可以投入时间，但不接受收益承诺。' }
      ]
    }
  ];
}

Page({
  data: {
    loading: false,
    questions: buildQuestions(),
    result: null
  },

  selectOption(event) {
    const questionIndex = Number(event.currentTarget.dataset.questionIndex);
    const optionIndex = Number(event.currentTarget.dataset.optionIndex);
    const questions = this.data.questions.map((question, index) => ({
      ...question,
      selectedIndex: index === questionIndex ? optionIndex : question.selectedIndex
    }));
    this.setData({ questions });
  },

  submit() {
    const missing = this.data.questions.some((question) => question.selectedIndex < 0);
    if (missing) {
      wx.showToast({ title: '请先完成所有选择', icon: 'none' });
      return;
    }

    const answers = {};
    this.data.questions.forEach((question) => {
      const option = question.options[question.selectedIndex];
      answers[question.key] = option.value;
      Object.assign(answers, option.payload || {});
    });

    this.setData({ loading: true });
    request('/fit-test', {
      method: 'POST',
      data: { answers }
    })
      .then((res) => {
        this.setData({
          result: {
            ...res,
            recommended_projects: (res.recommended_projects || []).map(decorateProject),
            avoid_projects: (res.avoid_projects || []).map(decorateProject)
          }
        });
      })
      .catch(() => {
        wx.showToast({ title: '生成失败', icon: 'none' });
      })
      .finally(() => this.setData({ loading: false }));
  },

  reset() {
    this.setData({
      questions: buildQuestions(),
      result: null
    });
  },

  openProject(event) {
    const slug = event.currentTarget.dataset.slug;
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?slug=${encodeURIComponent(slug)}`
    });
  }
});
