const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  // 1. 配置 API Key
  const DEEPSEEK_API_KEY = 'sk-c255d3d83f4e4d29bd3092391c27ffc4'; 
  const TIAN_API_KEY = '5c0e447976d0efaae83ee3d44b0afca1'; 
  
  const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
  const TIAN_NEWS_URL = 'https://apis.tianapi.com/caijing/index';

  try {
    // 2. 第一步：获取更多的实时财经新闻 (增加到30条，给AI充足的筛选素材)
    const newsResponse = await axios.get(TIAN_NEWS_URL, {
      params: {
        key: TIAN_API_KEY,
        num: 30 
      }
    });

    let rawNewsData = "";
    
    if (newsResponse.data && newsResponse.data.code === 200) {
      const newsList = newsResponse.data.result.newslist;
      rawNewsData = newsList.map((item, index) => {
        return `${index + 1}. 标题：${item.title}\n   内容：${item.description}`;
      }).join('\n\n');
    } else {
      console.warn("天行接口获取失败");
      rawNewsData = "暂无实时新闻，请检查API Key状态";
    }

    // 3. 第二步：修改 Prompt 指令，强制要求生成 10 条
    const aiRes = await axios.post(DEEPSEEK_URL, {
      model: "deepseek-chat",
      messages: [
        { 
          role: "system", 
          content: "你是一名资深金融分析师。请分析输入的实时新闻流，从中【精选并固定输出 10 条】对市场最具影响力的简报。必须以 JSON 格式输出。格式要求：{ 'summary': '一句话总结今日全局', 'news_list': [ { 'title': '简短标题', 'stars': 5, 'impactType': 'positive', 'impactLabel': '📈 利好', 'brief': '新闻事实精简', 'analysis': '通俗解读', 'source': '信息来源' } ] }。注意：必须凑足 10 条新闻，stars 为 1-5 整数，严禁提供建议。" 
        },
        { 
          role: "user", 
          content: `请基于以下实时新闻，生成 10 条深度分析简报：\n${rawNewsData}` 
        }
      ],
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 增加到60秒，因为生成10条数据较多，AI 响应时间会变长
    });

    const aiContent = JSON.parse(aiRes.data.choices[0].message.content);

    // 容错处理：如果 AI 还是没给够，或者格式不对
    if (!aiContent.news_list || aiContent.news_list.length === 0) {
      throw new Error("AI 未能生成有效的简报列表");
    }

    return {
      code: 0,
      data: aiContent,
      count: aiContent.news_list.length
    };

  } catch (err) {
    console.error("流程出错:", err);
    return {
      code: 500,
      msg: "分析服务暂时不可用",
      error: err.message
    };
  }
};