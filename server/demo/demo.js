import { PromptTemplate } from "@langchain/core/prompts";
import { FewShotPromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from '@langchain/openai'
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnableSequence,
  RunnablePassthrough,
  RunnableLambda,
  RunnableWithMessageHistory,
  RunnableWithMemory,
} from "@langchain/core/runnables";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import {
  InMemoryChatMessageHistory,
} from "@langchain/core/chat_history";

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod"; // LangChain 推荐使用 Zod 定义输入结构
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Calculator } from "@langchain/community/tools/calculator";


// // 单变量模板
// const template = "用{style}风格翻译以下文本：{text}";
// const prompt = new PromptTemplate({
//   template,
//   inputVariables: ["style", "text"], 
// });

// // 使用示例
// const formattedPrompt = await prompt.format({
//   style: "文言文",
//   text: "Hello world",
// });
// // 输出："用文言文风格翻译以下文本：Hello world"
// console.log(formattedPrompt);



// const examples = [
//   { input: "高兴", output: "欣喜若狂" },
//   { input: "悲伤", output: "心如刀绞" }
// ];

// const examplePrompt = new PromptTemplate({
//   template: "输入：{input}\n输出：{output}",
//   inputVariables: ["input", "output"],
// });

// const fewShotPrompt = new FewShotPromptTemplate({
//   examples,
//   examplePrompt,
//   suffix: "输入：{adjective}\n输出：", 
//   inputVariables: ["adjective"],
// });

// const res = await fewShotPrompt.format({ adjective: "愤怒" });
// console.log(res);
// /* 输出：
// 输入：高兴
// 输出：欣喜若狂

// 输入：悲伤
// 输出：心如刀绞

// 输入：愤怒
// 输出： 
// */

// // 1. Prompt
// const prompt = new PromptTemplate({
//   template: "生成关于{topic}的{num}条冷知识",
//   inputVariables: ["topic", "num"],
// });

// // 2. LLM
// const llm = new ChatOpenAI({
//   model: process.env.MODEL_NAME,
//   apiKey: process.env.API_KEY,
//   configuration: {
//     baseURL: process.env.API_URL,
//   },
// });

// // 3. Chain（Runnable）
// const chain = prompt
//   .pipe(llm)
//   .pipe(new StringOutputParser());

// // 4. 调用
// const res = await chain.invoke({
//   topic: "宇宙",
//   num: 3,
// });
// console.log(res);



/* ========== 1. 模型 ========== */

const llm = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.API_URL,
  },
});


// // 生成文章大纲
// const outlinePrompt = new PromptTemplate({
//   template: "请根据标题《{title}》生成一份文章大纲。",
//   inputVariables: ["title"],
// });

// // 扩展章节内容
// const contentPrompt = new PromptTemplate({
//   template: "根据以下大纲扩展成完整文章内容：\n{outline}",
//   inputVariables: ["outline"],
// });

// // 优化语言风格
// const polishPrompt = new PromptTemplate({
//   template: "请优化下面文章的语言风格，使其更专业流畅：\n{content}",
//   inputVariables: ["content"],
// });

// /* ========== 3. 顺序链（新版本 SequentialChain 的正确写法） ========== */

// const overallChain = RunnableSequence.from([
//   // Step 0：保留 title
//   RunnablePassthrough.assign({
//     outline: outlinePrompt.pipe(llm).pipe(new StringOutputParser()),
//   }),

//   // Step 1：基于 outline 生成 content
//   RunnablePassthrough.assign({
//     content: contentPrompt.pipe(llm).pipe(new StringOutputParser()),
//   }),

//   // Step 2：基于 content 生成 final
//   RunnablePassthrough.assign({
//     final: polishPrompt.pipe(llm).pipe(new StringOutputParser()),
//   }),
// ]);

// /* ========== 4. 调用 ========== */

// const result = await overallChain.invoke({
//   title: "人工智能的未来",
// });

// console.log(result);

// const transform = new RunnableLambda({
//   func: async (inputs) => {
//     return {
//       cleaned: inputs.text.replace(/\d+/g, ""),
//     };
//   },
// });
// // 调用
// const result = await transform.invoke({
//   text: "Hello123 World456",
// });
// console.log(result);

// const loader = new CheerioWebBaseLoader("https://www.baidu.com/");
// const docs = await loader.load();
// console.log({ docs });



// /* ========== 2. Prompt（注意这里的 history 占位） ========== */
// const prompt = ChatPromptTemplate.fromMessages([
//   ["system", "你是一个友好的中文助手。"],
//   ["placeholder", "{chat_history}"],
//   ["human", "{input}"],
// ]);

// /* ========== 3. 基础 Runnable ========== */

// const chain = prompt.pipe(llm);

// /* ========== 4. 会话存储（关键） ========== */

// // 简单示例：用内存 Map 存 session
// const messageHistories = new Map();

// function getSessionHistory(sessionId) {
//   if (!messageHistories.has(sessionId)) {
//     messageHistories.set(sessionId, new InMemoryChatMessageHistory());
//   }
//   return messageHistories.get(sessionId);
// }

// /* ========== 5. 带记忆的 Runnable（替代 ConversationChain） ========== */

// const chainWithMemory = new RunnableWithMessageHistory({
//   runnable: chain,
//   getMessageHistory: (sessionId) => getSessionHistory(sessionId),
//   inputMessagesKey: "input",
//   historyMessagesKey: "chat_history",
// });

// /* ========== 6. 连续对话调用 ========== */

// const sessionId = "user-001";

// await chainWithMemory.invoke(
//   { input: "你好！" },
//   { configurable: { sessionId } }
// );

// const res = await chainWithMemory.invoke(
//   { input: "刚才我们聊了什么？" },
//   { configurable: { sessionId } }
// );

// console.log(res.content);



