import { ChatOpenAI } from '@langchain/openai'
import { BufferMemory } from '@langchain/classic/memory'
import { LLMChain } from '@langchain/classic/chains'
import { PromptTemplate } from '@langchain/core/prompts'

// ---------------以下是无记忆demo代码----------------
console.log('----- 无记忆对话示例 -----')
// 1️⃣ 创建 OpenAI 模型实例，temperature 控制输出随机性
const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.API_URL,
  },
})

const aiMsg = await model.invoke([
  {
    role: 'user',
    content: '我叫张三，你是谁',
  },
])
console.log(aiMsg.content)
const aiMsg1 = await model.invoke([
  {
    role: 'user',
    content: '我叫什么',
  },
])
console.log(aiMsg1.content)

// ---------------以下是有记忆demo代码----------------
console.log('\n\n\n----- 有记忆对话示例 -----')
// 2️⃣ 创建对话记忆，用于存储历史对话
const memory = new BufferMemory({ memoryKey: 'chat_history' })

// 3️⃣ 创建提示模板（中文）
// 模板里 {chat_history} 会被 BufferMemory 自动填充为历史对话
// {input} 是当前用户输入
const prompt = PromptTemplate.fromTemplate(`
以下是人类和 AI 的友好对话。AI 很健谈，会根据上下文提供尽可能详细的回答。
如果 AI 不知道答案，会如实说明。

当前对话历史：
{chat_history}
人类: {input}
AI:
`)

// 4️⃣ 创建 LLMChain，将模型、提示模板和记忆绑定
const chain = new LLMChain({ llm: model, prompt, memory })

// 5️⃣ 多轮对话示例
async function runDemo() {
  const res1 = await chain.invoke({ input: '你好，我叫小明。' })
  console.log('第一轮对话:', res1)

  // AI 会记住之前的对话
  const res2 = await chain.invoke({ input: '你记得我叫什么名字吗？' })
  console.log('第二轮对话:', res2)

  const res3 = await chain.invoke({ input: '请给我一个友好的问候。' })
  console.log('第三轮对话:', res3)
}

runDemo()
