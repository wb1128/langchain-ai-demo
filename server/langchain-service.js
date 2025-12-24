import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

class LangChainService {
  constructor() {
    this.llm = new ChatOpenAI({
      model: process.env.MODEL_NAME,
      apiKey: process.env.API_KEY,
      configuration: {
        baseURL: process.env.API_URL,
      },
      // temperature: 0.7,
      streaming: true, // 启用流式响应
    });
  }

  /**
   * 流式翻译服务
   * @param {string} userInput - 用户输入的文本
   * @param {string} systemPrompt - 系统提示词（可选）
   * @returns {AsyncGenerator<string>} - 返回异步生成器
   */
  async *streamTranslation(userInput, systemPrompt = null) {
    const messages = [];
    
    // 添加系统提示（如果提供的话）
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    } else {
      // 默认系统提示
      messages.push(new SystemMessage(
        "You are a helpful assistant that translates Chinese to English. Translate the user sentence accurately."
      ));
    }
    
    // 添加用户消息
    messages.push(new HumanMessage(userInput));
    
    // 调用流式API
    const stream = await this.llm.stream(messages);
    
    for await (const chunk of stream) {
      if (chunk.content) {
        yield chunk.content;
      }
    }
  }

  /**
   * 通用聊天服务
   * @param {string} userInput - 用户输入
   * @param {Array} chatHistory - 聊天历史
   * @param {string} systemPrompt - 系统提示词
   * @returns {AsyncGenerator<string>} - 返回异步生成器
   */
  async *streamChat(userInput, chatHistory = [], systemPrompt = null) {
    const messages = [];
    
    // 添加系统提示
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    
    // 添加历史消息
    if (chatHistory.length > 0) {
      for (const msg of chatHistory) {
        if (msg.role === 'user') {
          messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'assistant') {
          messages.push(new AIMessage(msg.content));
        } else if (msg.role === 'system') {
          messages.push(new SystemMessage(msg.content));
        }
      }
    }
    
    // 添加当前用户消息
    messages.push(new HumanMessage(userInput));
    
    // 调用流式API
    const stream = await this.llm.stream(messages);
    
    for await (const chunk of stream) {
      if (chunk.content) {
        yield chunk.content;
      }
    }
  }

  /**
   * 非流式翻译（兼容旧方式）
   * @param {string} userInput - 用户输入的文本
   * @param {string} systemPrompt - 系统提示词（可选）
   * @returns {Promise<string>} - 返回翻译结果
   */
  async translate(userInput, systemPrompt = null) {
    const messages = [];
    
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    } else {
      messages.push(new SystemMessage(
        "You are a helpful assistant that translates Chinese to English. Translate the user sentence accurately."
      ));
    }
    
    messages.push(new HumanMessage(userInput));
    
    const response = await this.llm.invoke(messages);
    return response.content;
  }
}

// 确保有 AIMessage 类
import { AIMessage } from "@langchain/core/messages";

export default new LangChainService();