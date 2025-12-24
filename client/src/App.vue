<template>
  <div class="app-container">
    <!-- 导航栏 -->
    <header class="header">
      <h1>AI 智能助手</h1>
      <div class="header-controls">
        <button @click="clearChat" class="btn-clear">清空对话</button>
        <div class="model-info">
          <span>模型: {{ modelName }}</span>
        </div>
      </div>
    </header>

    <div class="main-content">
      <!-- 侧边栏（可选） -->
      <aside class="sidebar" v-if="showSidebar">
        <div class="sidebar-section">
          <h3>功能选择</h3>
          <div class="function-list">
            <button 
              v-for="func in functions" 
              :key="func.id"
              @click="selectFunction(func)"
              :class="{ active: selectedFunction === func.id }"
              class="func-btn"
            >
              {{ func.name }}
            </button>
          </div>
        </div>
        
        <div class="sidebar-section">
          <h3>会话管理</h3>
          <input 
            v-model="sessionId" 
            placeholder="会话ID"
            class="session-input"
          />
          <button @click="newSession" class="btn-new-session">新会话</button>
        </div>
      </aside>

      <!-- 主聊天区域 -->
      <main class="chat-area">
        <!-- 消息列表 -->
        <div class="messages-container" ref="messagesContainer">
          <div v-if="messages.length === 0" class="empty-state">
            <div class="empty-icon">🤖</div>
            <h3>欢迎使用 AI 助手</h3>
            <p>选择功能开始对话，或直接输入问题</p>
            <div class="quick-actions">
              <button 
                v-for="action in quickActions" 
                :key="action.text"
                @click="sendQuickAction(action.text)"
                class="quick-action-btn"
              >
                {{ action.text }}
              </button>
            </div>
          </div>

          <div v-for="(message, index) in messages" :key="index" class="message-wrapper">
            <!-- 用户消息 -->
            <div v-if="message.role === 'user'" class="message user-message">
              <div class="avatar user-avatar">👤</div>
              <div class="message-content">
                <div class="message-text">{{ message.content }}</div>
                <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              </div>
            </div>

            <!-- AI 消息 -->
            <div v-else-if="message.role === 'assistant'" class="message ai-message">
              <div class="avatar ai-avatar">🤖</div>
              <div class="message-content">
                <div class="message-text" v-html="formatMessage(message.content)"></div>
                <div class="message-footer">
                  <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                  <button 
                    v-if="message.content"
                    @click="copyToClipboard(message.content)"
                    class="copy-btn"
                    :title="copiedIndex === index ? '已复制' : '复制'"
                  >
                    {{ copiedIndex === index ? '✅' : '📋' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 系统消息 -->
            <div v-else-if="message.role === 'system'" class="message system-message">
              <div class="avatar system-avatar">ℹ️</div>
              <div class="message-content">
                <div class="message-text">{{ message.content }}</div>
              </div>
            </div>
          </div>

          <!-- 加载指示器 -->
          <div v-if="loading" class="loading-indicator">
            <div class="typing-animation">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
            </div>
            <span>AI 正在思考...</span>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <div class="input-controls">
            <button 
              @click="toggleSidebar" 
              class="sidebar-toggle"
              :title="showSidebar ? '隐藏侧边栏' : '显示侧边栏'"
            >
              {{ showSidebar ? '◀' : '▶' }}
            </button>
            
            <div class="function-indicator" v-if="selectedFunction">
              当前功能: {{ getFunctionName(selectedFunction) }}
            </div>
          </div>

          <div class="input-wrapper">
            <textarea
              ref="textareaRef"
              v-model="inputText"
              placeholder="输入您的问题..."
              rows="1"
              @keydown.enter.exact.prevent="handleSend"
              @keydown.enter.shift.exact.prevent="handleShiftEnter"
              @input="autoResize"
              :disabled="loading"
              class="message-input"
            />
            
            <div class="input-actions">
              <button 
                @click="handleSend" 
                :disabled="!canSend"
                class="send-btn"
                :class="{ loading: loading }"
              >
                <span v-if="loading">停止</span>
                <span v-else>发送</span>
              </button>
            </div>
          </div>

          <!-- 功能提示 -->
          <div class="function-tips" v-if="selectedFunctionTips">
            {{ selectedFunctionTips }}
          </div>
        </div>
      </main>
    </div>

    <!-- 设置面板 -->
    <div v-if="showSettings" class="settings-panel">
      <div class="settings-content">
        <h3>设置</h3>
        <div class="settings-item">
          <label>API 地址:</label>
          <input v-model="apiBaseUrl" />
        </div>
        <div class="settings-item">
          <label>会话 ID:</label>
          <input v-model="sessionId" />
        </div>
        <button @click="showSettings = false">关闭</button>
      </div>
    </div>

    <!-- 通知 -->
    <transition name="fade">
      <div v-if="notification.show" class="notification" :class="notification.type">
        {{ notification.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'

// 响应式数据
const messages = ref([])
const inputText = ref('')
const loading = ref(false)
const showSidebar = ref(true)
const showSettings = ref(false)
const sessionId = ref('default')
const apiBaseUrl = ref('http://localhost:3000')
const modelName = ref('GPT-3.5 Turbo')
const textareaRef = ref(null)
const messagesContainer = ref(null)
const copiedIndex = ref(-1)
const abortController = ref(null)

// 通知系统
const notification = ref({
  show: false,
  message: '',
  type: 'info'
})

// 功能列表
const functions = ref([
  { id: 'chat', name: '智能对话', tips: '与 AI 进行一般性对话' },
  { id: 'translate', name: '翻译助手', tips: '将中文翻译成英文' },
  { id: 'code', name: '编程助手', tips: '代码编写与调试' },
  { id: 'write', name: '写作助手', tips: '文章写作与润色' }
])

const selectedFunction = ref('chat')

// 快速操作
const quickActions = ref([
  { text: '帮我写一篇关于人工智能的文章' },
  { text: '翻译："你好，世界！"' },
  { text: '用 Python 实现快速排序' },
  { text: '解释什么是机器学习' }
])

// 计算属性
const canSend = computed(() => {
  return inputText.value.trim() !== '' && !loading.value
})

const selectedFunctionTips = computed(() => {
  const func = functions.value.find(f => f.id === selectedFunction.value)
  return func ? func.tips : ''
})

// 方法
function getFunctionName(id) {
  const func = functions.value.find(f => f.id === id)
  return func ? func.name : '未知'
}

function selectFunction(func) {
  selectedFunction.value = func.id
  showNotification(`已切换到: ${func.name}`, 'info')
  
  // 如果是翻译功能，添加系统消息
  if (func.id === 'translate') {
    messages.value.push({
      role: 'system',
      content: '现在进入翻译模式，请输入要翻译的中文文本。',
      timestamp: new Date()
    })
  }
}

function sendQuickAction(text) {
  inputText.value = text
  handleSend()
}

async function handleSend() {
  if (!canSend.value) {
    if (loading.value) {
      stopGeneration()
    }
    return
  }

  const text = inputText.value.trim()
  inputText.value = ''
  
  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: text,
    timestamp: new Date()
  })
  
  loading.value = true
  
  // 添加占位符消息
  const aiMessageIndex = messages.value.length
  messages.value.push({
    role: 'assistant',
    content: '',
    timestamp: new Date()
  })
  
  scrollToBottom()
  
  try {
    abortController.value = new AbortController()
    
    // 添加超时处理
    const timeoutId = setTimeout(() => {
      if (loading.value) {
        abortController.value?.abort()
        showNotification('请求超时', 'error')
      }
    }, 30000) // 30秒超时
    
    let endpoint = '/api/chat'
    let body = { 
      query: text,
      sessionId: sessionId.value
    }
    
    if (selectedFunction.value === 'translate') {
      endpoint = '/api/translate'
      body = { text }
    }
    
    const response = await fetch(`${apiBaseUrl.value}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: abortController.value.signal
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    // 处理 SSE 流 - 改进版本
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let aiContent = ''
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('Stream completed')
          break
        }
        
        buffer += decoder.decode(value, { stream: true })
        
        // 按行分割
        const lines = buffer.split('\n')
        
        // 保留最后一行（可能是不完整的）
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          
          // 跳过空行
          if (!trimmedLine) continue
          
          // 检查是否是数据行
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6).trim()
            
            // 检查是否是结束标记
            if (data === '[DONE]') {
              console.log('Received [DONE] signal')
              break
            }
            
            try {
              const parsed = JSON.parse(data)
              
              if (parsed.error) {
                throw new Error(parsed.error)
              }
              
              if (parsed.content) {
                aiContent += parsed.content
                
                // 更新消息内容
                messages.value[aiMessageIndex] = {
                  role: 'assistant',
                  content: aiContent,
                  timestamp: new Date()
                }
                
                scrollToBottom()
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e, 'Raw data:', data)
            }
          }
        }
        
        // 检查是否需要停止
        if (abortController.value?.signal.aborted) {
          console.log('Request aborted by user')
          reader.cancel()
          break
        }
      }
    } finally {
      reader.releaseLock()
      clearTimeout(timeoutId)
    }
    
    showNotification('生成完成', 'success')
    
  } catch (error) {
    console.error('Request failed:', error)
    
    if (error.name === 'AbortError') {
      messages.value[aiMessageIndex] = {
        role: 'assistant',
        content: aiContent || '[已停止]',
        timestamp: new Date()
      }
      showNotification('已停止生成', 'info')
    } else {
      messages.value[aiMessageIndex] = {
        role: 'assistant',
        content: `抱歉，出错了: ${error.message}`,
        timestamp: new Date()
      }
      showNotification(`错误: ${error.message}`, 'error')
    }
  } finally {
    loading.value = false
    abortController.value = null
    scrollToBottom()
  }
}

function stopGeneration() {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
  loading.value = false
}

function handleShiftEnter() {
  const textarea = textareaRef.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  inputText.value = 
    inputText.value.substring(0, start) + 
    '\n' + 
    inputText.value.substring(end)
  
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1
    autoResize()
  })
}

function autoResize() {
  const textarea = textareaRef.value
  if (!textarea) return
  
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
}

function formatMessage(content) {
  if (!content) return ''
  // 安全地解析 Markdown
  return marked.parse(content, {
    breaks: true,
    gfm: true
  })
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
}

function clearChat() {
  if (loading.value) {
    if (!confirm('正在生成中，确定要清空吗？')) return
    stopGeneration()
  }
  
  messages.value = []
  showNotification('对话已清空', 'info')
  
  // 如果是翻译模式，重新添加系统消息
  if (selectedFunction.value === 'translate') {
    messages.value.push({
      role: 'system',
      content: '现在进入翻译模式，请输入要翻译的中文文本。',
      timestamp: new Date()
    })
  }
}

function newSession() {
  sessionId.value = 'session_' + Date.now()
  clearChat()
  showNotification(`新会话: ${sessionId.value}`, 'info')
}

function toggleSidebar() {
  showSidebar.value = !showSidebar.value
}

async function copyToClipboard(content, index) {
  try {
    await navigator.clipboard.writeText(content)
    copiedIndex.value = index
    showNotification('已复制到剪贴板', 'success')
    
    setTimeout(() => {
      copiedIndex.value = -1
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
    showNotification('复制失败', 'error')
  }
}

function showNotification(message, type = 'info') {
  notification.value = {
    show: true,
    message,
    type
  }
  
  setTimeout(() => {
    notification.value.show = false
  }, 3000)
}

// 监听消息变化，自动滚动
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

// 生命周期
onMounted(() => {
  // 初始化系统消息
  messages.value.push({
    role: 'system',
    content: '您好！我是 AI 助手，请问有什么可以帮您？',
    timestamp: new Date()
  })
  
  // 测试连接
  testConnection()
})

onUnmounted(() => {
  stopGeneration()
})

async function testConnection() {
  try {
    const response = await fetch(`${apiBaseUrl.value}/api/health`)
    if (response.ok) {
      showNotification('已连接到服务器', 'success')
    }
  } catch (error) {
    showNotification('无法连接到服务器', 'error')
  }
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.header-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background: rgba(255, 255, 255, 0.95);
  border-right: 1px solid #e5e5e5;
  padding: 1rem;
  overflow-y: auto;
  transition: transform 0.3s ease;
}

.sidebar-section {
  margin-bottom: 2rem;
}

.sidebar-section h3 {
  margin-bottom: 1rem;
  color: #333;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.function-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.func-btn {
  padding: 0.75rem 1rem;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.func-btn:hover {
  background: #e8e8e8;
}

.func-btn.active {
  background: #667eea;
  color: white;
}

.session-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.btn-new-session {
  width: 100%;
  padding: 0.5rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background: linear-gradient(to bottom, #ffffff, #f8f9fa);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin-bottom: 0.5rem;
  color: #333;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 2rem;
}

.quick-action-btn {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  background: #e0e0e0;
  transform: translateY(-1px);
}

.message-wrapper {
  margin-bottom: 1.5rem;
}

.message {
  display: flex;
  max-width: 80%;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-message {
  margin-left: auto;
  flex-direction: row-reverse;
}

.ai-message {
  margin-right: auto;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.user-avatar {
  background: #667eea;
  color: white;
  margin-left: 0.75rem;
}

.ai-avatar {
  background: #4CAF50;
  color: white;
  margin-right: 0.75rem;
}

.system-avatar {
  background: #ff9800;
  color: white;
  margin-right: 0.75rem;
}

.message-content {
  flex: 1;
}

.message-text {
  padding: 1rem;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.user-message .message-text {
  background: #667eea;
  color: white;
  border-top-right-radius: 4px;
}

.ai-message .message-text {
  background: #f8f9fa;
  border-top-left-radius: 4px;
}

.system-message .message-text {
  background: #fff3e0;
  border-top-left-radius: 4px;
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  padding: 0 0.5rem;
}

.message-time {
  font-size: 0.75rem;
  color: #999;
}

.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  border-radius: 4px;
}

.copy-btn:hover {
  background: #f0f0f0;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #666;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 12px;
  margin-top: 1rem;
}

.typing-animation {
  display: flex;
  gap: 0.25rem;
}

.typing-animation .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-animation .dot:nth-child(1) { animation-delay: -0.32s; }
.typing-animation .dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.input-area {
  border-top: 1px solid #e5e5e5;
  padding: 1rem;
  background: white;
}

.input-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.sidebar-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 0.5rem;
  border-radius: 4px;
}

.sidebar-toggle:hover {
  background: #f0f0f0;
}

.function-indicator {
  font-size: 0.875rem;
  color: #667eea;
  font-weight: 500;
}

.input-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  resize: none;
  font-family: inherit;
  font-size: 1rem;
  transition: border-color 0.2s;
  max-height: 200px;
  overflow-y: auto;
}

.message-input:focus {
  outline: none;
  border-color: #667eea;
}

.message-input:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

.input-actions {
  margin-bottom: 0.25rem;
}

.send-btn {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 80px;
}

.send-btn:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-1px);
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.send-btn.loading {
  background: #ff6b6b;
}

.function-tips {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.settings-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 300px;
  background: white;
  box-shadow: -2px 0 10px rgba(0,0,0,0.1);
  padding: 2rem;
  z-index: 1000;
}

.notification {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1001;
}

.notification.info {
  background: #2196F3;
}

.notification.success {
  background: #4CAF50;
}

.notification.error {
  background: #f44336;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  
  .message {
    max-width: 90%;
  }
}
</style>

<style>
/* 全局 Markdown 样式 */
.markdown-content {
  line-height: 1.6;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3 {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.markdown-content p {
  margin: 0.5em 0;
}

.markdown-content ul,
.markdown-content ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.markdown-content code {
  background: #f0f0f0;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.markdown-content pre {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.markdown-content pre code {
  background: none;
  padding: 0;
}

.markdown-content blockquote {
  border-left: 3px solid #ddd;
  padding-left: 1em;
  margin-left: 0;
  color: #666;
}

.markdown-content table {
  border-collapse: collapse;
  margin: 0.5em 0;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid #ddd;
  padding: 0.5em;
}

.markdown-content th {
  background: #f5f5f5;
}
</style>