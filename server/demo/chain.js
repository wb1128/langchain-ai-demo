import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables'
import { StringOutputParser } from '@langchain/core/output_parsers'

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.API_URL,
  },
})

// 生成文章大纲
const outlinePrompt = new PromptTemplate({
  template: '请根据标题《{title}》生成一份文章大纲。',
  inputVariables: ['title'],
})

// 扩展章节内容
const contentPrompt = new PromptTemplate({
  template: '根据以下大纲扩展成完整文章内容：\n{outline}',
  inputVariables: ['outline'],
})

// 优化语言风格
const polishPrompt = new PromptTemplate({
  template: '请优化下面文章的语言风格，使其更专业流畅：\n{content}',
  inputVariables: ['content'],
})

const overallChain = RunnableSequence.from([
  // Step 0：保留 title
  RunnablePassthrough.assign({
    outline: outlinePrompt.pipe(model).pipe(new StringOutputParser()),
  }),

  // Step 1：基于 outline 生成 content
  RunnablePassthrough.assign({
    content: contentPrompt.pipe(model).pipe(new StringOutputParser()),
  }),

  // Step 2：基于 content 生成 final
  RunnablePassthrough.assign({
    final: polishPrompt.pipe(model).pipe(new StringOutputParser()),
  }),
])

const result = await overallChain.invoke({
  title: '人工智能的未来',
})

console.log(result)
