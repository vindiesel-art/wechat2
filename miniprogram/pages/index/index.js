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

    // 1. 初始化状态
    this.setData({ 
      isLoading: true,
      summary: 'AI 正在深度检索实时资讯...',
      newsList: [] // 清空旧列表
    });
    
    wx.showLoading({ title: 'AI 正在解析中...' });

    // 2. 调用云函数
    wx.cloud.callFunction({
      name: 'getBrief',
      data: {
        type: this.data.theme
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.code === 0) {
        const aiData = res.result.data;
        
        if (aiData) {
          // 1. 先展示摘要，并清空列表容器，防止旧数据干扰
          this.setData({
            summary: aiData.summary || '暂无今日摘要',
            newsList: [] 
          });
    
          const fullList = aiData.news_list || [];
          
          // 2. 使用数据路径动态更新
          // 这种方式不会替换整个数组，而是逐条往数组末尾追加
          fullList.forEach((item, index) => {
            setTimeout(() => {
              // 关键点：使用 ['newsList[' + index + ']'] 这种字符串路径
              // 强制小程序每一轮都触发一次独立的渲染流程
              this.setData({
                [`newsList[${index}]`]: item
              });
    
              // 如果是最后一条，结束加载状态
              if (index === fullList.length - 1) {
                this.setData({ isLoading: false });
                wx.showToast({ title: '更新完成', icon: 'success' });
              }
            }, (index + 1) * 450); // 10条数据，每条间隔450ms，整体体感最舒适
          });
        }
      }
    }).catch(err => {
      wx.hideLoading();
      this.setData({ isLoading: false });
      wx.showModal({
        title: '分析失败',
        content: '可能是 API 额度不足或网络波动，请检查云函数日志。',
        showCancel: false
      });
      console.error(err);
    });
  }
});