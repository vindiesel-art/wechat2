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
          // A. 先只更新总结，清空列表
          this.setData({
            summary: aiData.summary || '暂无今日摘要',
            newsList: [] 
          });

          const fullList = aiData.news_list || [];
          let currentList = [];
          
          // B. 逐条弹出逻辑 (加固版)
          // 增加间隔到 500ms，展示 10 条约需 5 秒，非常有仪式感
          const interval = 500; 

          fullList.forEach((item, index) => {
            setTimeout(() => {
              // 使用 push 方法构建新数组
              currentList.push(item);
              
              // 关键：每次 setData 只追加最新的一条数据
              this.setData({
                [`newsList[${index}]`]: item // 这种写法性能更高，且强制触发局部渲染
              });

              // 如果是最后一条，彻底关闭 Loading
              if (index === fullList.length - 1) {
                this.setData({ isLoading: false });
                wx.showToast({ title: '10条解析已就绪', icon: 'success' });
              }
            }, (index + 1) * interval);
          });
        }
      } else {
        this.setData({ isLoading: false });
        wx.showToast({ title: '数据异常', icon: 'none' });
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