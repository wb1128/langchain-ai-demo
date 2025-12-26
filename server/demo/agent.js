import { ChatOpenAI } from '@langchain/openai'
import { createToolCallingAgent, AgentExecutor } from '@langchain/classic/agents'
import { DynamicTool } from '@langchain/core/tools'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { BaseCallbackHandler } from '@langchain/core/callbacks/base'

const weatherTool = new DynamicTool({
  name: 'get_weather',
  description: "获取指定城市的当前天气信息。输入格式：'城市名'，例如：'北京' 或 '上海'。",
  func: async (input) => {
    console.log(`🌤️ [天气工具调用] 查询: ${input}`)

    // 模拟天气数据
    const weatherData = {
      北京: '晴朗，22°C，湿度40%，东南风3级',
      上海: '多云，26°C，湿度65%，东风2级',
      广州: '阵雨，30°C，湿度85%，南风4级',
      深圳: '多云转晴，29°C，湿度75%，南风3级',
    }

    await new Promise((resolve) => setTimeout(resolve, 300))

    const city = input.trim()
    return weatherData[city] || `未找到"${city}"的天气数据`
  },
})

const calculatorTool = new DynamicTool({
  name: 'calculator',
  description: "执行数学计算。输入格式：'数学表达式'，例如：'25 + 17' 或 '100 / 5'。",
  func: async (input) => {
    console.log(`🧮 [计算器工具调用] 计算: ${input}`)

    try {
      // 安全地计算数学表达式
      const result = eval(input) // 注意：实际生产环境应使用更安全的计算库
      return `计算结果: ${input} = ${result}`
    } catch (error) {
      return `计算错误: ${error.message}`
    }
  },
})
const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `你是一个有用的助手，可以查询天气和执行计算。
请根据用户的问题，选择合适的工具获取信息。
工具描述如下:
- get_weather: 获取指定城市的当前天气信息
- calculator: 执行数学计算

请按照以下格式思考:
思考: 分析问题并决定使用哪个工具
行动: 要调用的工具名称
行动输入: 工具的输入参数`,
  ],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
])

// 3. 主函数：创建并运行智能体
async function runModernAgentDemo() {
  console.log('🚀 使用新API创建智能体演示\n')
  console.log('='.repeat(60))

  try {
    // 初始化模型
    const model = new ChatOpenAI({
      model: process.env.MODEL_NAME,
      temperature: 0.7,
      apiKey: process.env.API_KEY,
      configuration: {
        baseURL: process.env.API_URL,
      },
    })

    // 准备工具
    const tools = [weatherTool, calculatorTool]

    // 4. 使用新API创建智能体 - 关键修复
    const agent = createToolCallingAgent({
      llm: model,
      tools,
      prompt, // 使用修复后的提示模板
    })

    // 5. 创建智能体执行器
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      // verbose: true, // 显示详细的思考过程
      maxIterations: 3,
    })

    // // 6. 测试智能体
    // console.log("🧪 测试1: 简单天气查询");
    // const result1 = await agentExecutor.invoke({
    //   input: "北京现在的天气怎么样？",
    // });
    // console.log("\n🤖 回答:", result1.output);

    // console.log("\n" + "=".repeat(40));

    // console.log("🧪 测试2: 数学计算");
    // const result2 = await agentExecutor.invoke({
    //   input: "计算一下 125 乘以 8 等于多少？",
    // });
    // console.log("\n🤖 回答:", result2.output);

    // console.log("\n" + "=".repeat(40));

    console.log('🧪 测试3: 组合查询')
    const result3 = await agentExecutor.invoke({
      input: '上海的天气如何？然后计算一下 22 加 18 等于多少？',
    })
    console.log('\n🤖 回答:', result3.output)
  } catch (error) {
    console.error('运行出错:', error.message)

    // 提供更详细的错误信息
    if (error.message.includes('tools')) {
      console.log('\n💡 解决方案：')
      console.log('1. 确保提示模板中不包含未提供的变量')
      console.log('2. 检查提示模板格式是否正确')
      console.log('3. 确保使用的是最新版本的 @langchain/classic')
    }
  }
}
// 8. 运行演示
await runModernAgentDemo()
