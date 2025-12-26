import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage } from '@langchain/core/messages'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { Calculator } from '@langchain/community/tools/calculator'
import { DynamicTool } from '@langchain/core/tools'
import axios from 'axios'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const weatherTool = new DynamicTool({
  name: 'get_weather',
  description: '获取指定城市的实时天气数据，例如：北京、上海',
  func: async (args) => {
    console.log('天气工具入参:', args)

    // 检查API密钥配置
    if (!process.env.WEATHER_API_KEY) {
      return '未配置WEATHER_API_KEY环境变量，无法获取天气信息。'
    }

    try {
      // 获取城市参数（trim处理可能的空格）
      const city = args.trim()

      if (!city) {
        return '请输入有效的城市名称'
      }

      const response = await axios.get('https://api.weatherapi.com/v1/current.json', {
        params: {
          key: process.env.WEATHER_API_KEY,
          q: city,
          lang: 'zh',
        },
      })

      const { temp_c, condition } = response.data.current
      return `${city}的天气情况：\n温度：${temp_c}℃\n天气状况：${condition.text}`
    } catch (error) {
      console.error('天气API调用错误:', error)

      if (error.response) {
        // API响应错误
        const status = error.response.status
        if (status === 401) {
          return 'API密钥无效或已过期'
        } else if (status === 400) {
          return '请求参数无效，请检查城市名称是否正确'
        } else if (status === 404) {
          return '未找到该城市的天气信息'
        }
      }

      // 网络错误或其他未知错误
      return '无法获取天气信息，请稍后重试'
    }
  },
})

// 配置通义千问API
const chatModel = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  temperature: 0.7,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.API_URL,
  },
})

// 注册到Agent
const tools = [weatherTool, new Calculator()]

// 创建增强型ReAct智能体
// llm: 使用配置好的通义千问模型
// checkpointSaver: 使用记忆组件保存对话检查点
// tools: 集成计算器和搜索工具，增强AI的实际问题解决能力
const agent = createReactAgent({
  llm: chatModel,
  tools: tools,
  verbose: true, // 启用详细日志输出
})

// 对话处理函数
async function chat(input, threadId = 'default') {
  try {
    const response = await agent.invoke(
      { messages: [new HumanMessage(input)] },
      {
        configurable: {
          thread_id: threadId,
          maxIterations: 3, // 限制最大工具调用次数，防止无限循环
        },
      }
    )
    return response.messages[response.messages.length - 1].content
  } catch (error) {
    console.error('对话处理出错:', error)
    return '抱歉，处理您的请求时出现错误。'
  }
}

// 主函数
async function main() {
  try {
    // 因为WEATHER_API_KEY是国外的免费key,所以要写城市的英文缩写
    const response = await chat('今天BEIJING的天气怎么样？气温是多少度？比SHANGHAI的气温高嘛？')
    console.log('AI response: ', response)
  } catch (error) {
    console.error('执行出错:', error)
  }
}

// 运行测试程序
main()
