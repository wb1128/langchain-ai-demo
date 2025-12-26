import { ChatOpenAI } from '@langchain/openai'
import { Calculator } from '@langchain/community/tools/calculator'
import { createToolCallingAgent, AgentExecutor } from '@langchain/classic/agents'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { DynamicTool } from '@langchain/core/tools'

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.API_URL,
  },
})

// 定义一个自定义工具（Tool）
const calculatorTool = new DynamicTool({
  name: 'Calculator',
  description: '可以计算简单数学表达式，比如 2 + 3 或 10 * 5',
  func: async (args) => {
    console.log('自定义工具入参:', args)
    try {
      const result = eval(args)
      return `计算结果是: ${result}`
    } catch (err) {
      return '表达式有误，请检查输入。'
    }
  },
})
const tools = [calculatorTool]
// const tools = [new Calculator()];

const prompt = ChatPromptTemplate.fromMessages([
  ['system', '你是一个可以使用工具的助手，必要时请调用工具。'],
  ['human', '{input}'],
  new MessagesPlaceholder('agent_scratchpad'),
])

// ⭐ 使用官方 Tool Agent
const agent = await createToolCallingAgent({
  llm: model,
  tools,
  prompt,
})

const executor = new AgentExecutor({
  agent,
  tools,
  maxIterations: 5,
})

const res1 = await executor.invoke({ input: '请帮我算一下 12 * 8' })
console.log(res1.output)

const res2 = await executor.invoke({ input: '请帮我算一下 (100 + 50) / 5' })
console.log(res2.output)
