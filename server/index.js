import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import langchainService from './langchain-service.js';

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // 如果前端文件放在 public 目录

// 存储会话历史（简单内存存储，生产环境需要持久化）
const sessionHistory = new Map();

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE 翻译端点
app.post('/api/translate', async (req, res) => {
  const { text, sessionId } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: '缺少文本参数' });
  }
  
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const stream = langchainService.streamTranslation(text);
    
    for await (const chunk of stream) {
      // 发送 SSE 格式数据
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      
      // 检查客户端是否断开连接
      if (req.socket.destroyed) {
        break;
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
    
  } catch (error) {
    console.error('翻译错误:', error);
    
    // 如果响应头还没发送，发送错误信息
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// SSE 聊天端点（支持历史记录）
app.post('/api/chat', async (req, res) => {
  const { query, sessionId = 'default' } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: '缺少查询参数' });
  }
  
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // 获取或初始化会话历史
    if (!sessionHistory.has(sessionId)) {
      sessionHistory.set(sessionId, []);
    }
    const history = sessionHistory.get(sessionId);
    
    // 添加用户消息到历史
    history.push({ role: 'user', content: query });
    
    // 系统提示词（可根据需求自定义）
    const systemPrompt = "You are a helpful AI assistant. Answer the user's questions clearly and concisely.";
    
    // 获取流式响应
    const stream = langchainService.streamChat(query, history, systemPrompt);
    
    let fullResponse = '';
    
    for await (const chunk of stream) {
      fullResponse += chunk;
      
      // 发送 SSE 格式数据
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      
      // 检查客户端是否断开连接
      if (req.socket.destroyed) {
        break;
      }
    }
    
    // 添加助手回复到历史
    history.push({ role: 'assistant', content: fullResponse });
    
    // 限制历史记录长度（避免内存过大）
    if (history.length > 20) {
      sessionHistory.set(sessionId, history.slice(-10));
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
    
  } catch (error) {
    console.error('聊天错误:', error);
    
    // 如果响应头还没发送，发送错误信息
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// 非流式翻译端点（兼容旧客户端）
app.post('/api/translate-non-stream', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: '缺少文本参数' });
  }
  
  try {
    const result = await langchainService.translate(text);
    res.json({ result });
  } catch (error) {
    console.error('非流式翻译错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 清理会话历史端点
app.delete('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  sessionHistory.delete(sessionId);
  res.json({ message: '会话已清除' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`API 端点:`);
  console.log(`  POST /api/chat - SSE 聊天`);
  console.log(`  POST /api/translate - SSE 翻译`);
  console.log(`  POST /api/translate-non-stream - 非流式翻译`);
  console.log(`  DELETE /api/session/:sessionId - 清理会话`);
});