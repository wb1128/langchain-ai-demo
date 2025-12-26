import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'

const llm = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.API_URL,
  },
})

const template = '用1句话介绍 {topic} 的核心特点：'
const prompt = new PromptTemplate({
  template,
  inputVariables: ['topic'],
})

const promptText = await prompt.format({
  topic: '百度',
})
console.log('生成的提示词:', promptText)

const chain = prompt.pipe(llm)
const aiMsg = await chain.invoke({
  topic: '百度',
})
console.log('模型输出:', aiMsg.content)
