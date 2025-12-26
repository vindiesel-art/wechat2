// pages/index/index.js
Page({
  data: {
    summary: '点击下方按钮，启动 AI 深度财经解析',
    newsList: [],
    isLoading: false,
    theme: 'morning'
  },

  onLoad() {
    this.initTheme();
  },

  // 根据时间自动切换早晚报主题
  initTheme() {
    const hour = new Date().getHours();
    const isEvening = hour >= 18 || hour < 8;
    this.setData({
      theme: isEvening ? 'evening' : 'morning'
    });
  },

  onRefresh: function() {
    if (this.data.isLoading) return;

    this.setData({ 
      isLoading: true,
      summary: '', 
      newsList: [] 
    });
    
    wx.showLoading({ title: '千问 AI 思考中...' });

    wx.cloud.callFunction({
      name: 'getBrief'
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.code === 0) {
        const aiData = res.result.data;
        
        // 1. 打字机输出顶部摘要
        this.typeText('summary', aiData.summary, 40);

        // 2. 逐条处理新闻卡片
        const fullList = aiData.news_list || [];
        fullList.forEach((item, index) => {
          setTimeout(() => {
            // 先展示卡片外壳，分析文字先设为空
            const displayItem = { ...item, analysis: '' };
            this.setData({ [`newsList[${index}]`]: displayItem });

            // 针对这条新闻的 analysis 开启打字机
            this.typeText(`newsList[${index}].analysis`, item.analysis, 25);

            if (index === fullList.length - 1) {
              this.setData({ isLoading: false });
            }
          }, index * 800); // 每隔 0.8 秒弹出一个新卡片
        });
      }
    }).catch(err => {
      this.setData({ isLoading: false });
      wx.hideLoading();
    });
  },
  
  // 核心打字机函数
  typeText(field, content, speed) {
    let i = 0;
    let currentText = '';
    const timer = setInterval(() => {
      if (i < content.length) {
        currentText += content.charAt(i);
        this.setData({ [field]: currentText });
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
  }
});