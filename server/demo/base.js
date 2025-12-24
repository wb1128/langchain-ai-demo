import { ChatOpenAI } from '@langchain/openai'
import { createAgent, tool } from 'langchain'
import * as z from 'zod'

const getWeather = tool((input) => `It's always sunny in ${input.city}!`, {
  name: 'get_weather',
  description: 'Get the weather for a given city',
  schema: z.object({
    city: z.string().describe('The city to get the weather for'),
  }),
})

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.API_URL,
  },
})

const agent = createAgent({
  model: model,
  tools: [getWeather],
})

const response = await agent.invoke({
  messages: [{ role: 'user', content: "What's the weather in Tokyo?" }],
})

// const assistantMessage = response.messages[response.messages.length - 1].content;
// console.log(`\n[助手回复] ${assistantMessage}\n`);
// console.log("完整消息流:");
// response.messages.forEach((msg, i) => {
//     console.log(msg)
//   console.log(`[${i + 1}] ${msg.name}:`, msg.content || msg.tool_calls);
// });

import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages'

function printMessageInChinese(message) {
  if (message instanceof HumanMessage) {
    console.log(`[用户] ${message.content}`)
  } else if (message instanceof AIMessage) {
    // 检查是否包含工具调用（即 AI 决定要调用工具）
    if (message.toolCalls && message.toolCalls.length > 0) {
      const calls = message.toolCalls
        .map((tc) => `${tc.name}(${JSON.stringify(tc.args)})`)
        .join(', ')
      console.log(`[AI - 工具调用请求] 将调用: ${calls}`)
    } else {
      console.log(`[AI] ${message.content}`)
    }
  } else if (message instanceof ToolMessage) {
    console.log(`[工具结果] 工具 "${message.name}" 返回: ${message.content}`)
  } else {
    console.log(`[未知消息类型] ${message.constructor.name}:`, message.content)
  }
}

for (const msg of response.messages) {
  printMessageInChinese(msg)
}
