import { ChatOpenAI } from '@langchain/openai'

// 实例化 ChatOpenAI 对象，这代表了一个具体的 LLM (大语言模型) 实例
const llm = new ChatOpenAI({
  // model: 指定要调用的具体模型名称。
  // 例如：'gpt-3.5-turbo', 'gpt-4o'，或者其他兼容 OpenAI 协议的模型名称。
  model: process.env.MODEL_NAME,
  // apiKey: 调用 API 所需的认证密钥。
  apiKey: process.env.API_KEY,
  configuration: {
    // 使用兼容 OpenAI 接口的其他厂商模型 (如 DeepSeek, Moonshot, OneAPI 等)
    baseURL: process.env.API_URL,
  },
})

const aiMsg = await llm.invoke([
  {
    role: 'user',
    content: '我叫张三，你是谁',
  },
])
console.log(aiMsg.content)
const aiMsg1 = await llm.invoke([
  {
    role: 'user',
    content: '我叫什么',
  },
])
console.log(aiMsg1.content)
