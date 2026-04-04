<template>
  <view class="me-page">
    <!-- 加载状态 -->
    <view v-if="isLoading" class="loading-container">
      <text class="loading-spinner">⏳</text>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 主内容 -->
    <view v-else>
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">设置</text>
    </view>

    <!-- 数据统计 -->
    <view class="stats-section">
      <view class="section-header">
        <text class="section-icon">📊</text>
        <text class="section-title">数据统计</text>
      </view>
      <view class="stats-content">
        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-value">{{ stats.wantCount }}</text>
            <text class="stat-label">想看</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ stats.watchedCount }}</text>
            <text class="stat-label">已看</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ stats.plannedCount }}</text>
            <text class="stat-label">待看</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ stats.totalEvents }}</text>
            <text class="stat-label">日历事件</text>
          </view>
        </view>
      </view>
    </view>

    <!-- API Key 配置区域 -->
    <view class="settings-section">
      <view class="section-header">
        <text class="section-icon">⚙️</text>
        <text class="section-title">TMDB API 设置</text>
      </view>

      <view class="api-key-content">
        <!-- API Key 输入框 -->
        <view class="input-wrapper">
          <input
            :value="apiKeyInput"
            class="api-input"
            type="text"
            placeholder="请输入 TMDB API Key"
            @input="onApiKeyInput"
            @blur="onInputBlur"
            @confirm="saveApiKey"
          />
        </view>

        <!-- 操作按钮 -->
        <view class="action-buttons">
          <button
            class="save-btn"
            native-type="button"
            :disabled="!apiKeyInput.trim() || isValidating"
            @click="saveApiKey"
          >
            {{ isValidating ? '验证中...' : '保存' }}
          </button>
          <button
            v-if="hasApiKey"
            class="clear-btn"
            native-type="button"
            @click="clearApiKey"
          >
            清除
          </button>
        </view>

        <!-- 状态标签 -->
        <view class="status-wrapper">
          <view class="status-tag" :class="hasApiKey ? 'tag-success' : 'tag-warning'">
            {{ hasApiKey ? '已配置' : '未配置' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 数据管理 -->
    <view class="data-section">
      <view class="section-header">
        <text class="section-icon">💾</text>
        <text class="section-title">数据管理</text>
      </view>

      <view class="data-content">
        <view class="data-item" @click="handleExport">
          <text class="item-icon">⬆️</text>
          <view class="item-info">
            <text class="item-title">导出数据</text>
            <text class="item-desc">备份到本地</text>
          </view>
          <text class="item-arrow">›</text>
        </view>
        <view class="data-item" @click="handleImport">
          <text class="item-icon">⬇️</text>
          <view class="item-info">
            <text class="item-title">导入数据</text>
            <text class="item-desc">从备份恢复</text>
          </view>
          <text class="item-arrow">›</text>
        </view>
        <view class="data-item danger" @click="handleClearData">
          <text class="item-icon">🗑️</text>
          <view class="item-info">
            <text class="item-title">清除所有数据</text>
            <text class="item-desc-danger">不可恢复</text>
          </view>
          <text class="item-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 云同步（预留） -->
    <view class="sync-section">
      <view class="section-header">
        <text class="section-icon">☁️</text>
        <text class="section-title">云同步</text>
        <view class="dev-tag">开发中</view>
      </view>

      <view class="sync-content">
        <view class="sync-item disabled">
          <text class="item-icon">⚙️</text>
          <view class="item-info">
            <text class="item-title">配置云同步</text>
          </view>
        </view>
        <view class="sync-item disabled">
          <text class="item-icon">🔄</text>
          <view class="item-info">
            <text class="item-title">立即同步</text>
          </view>
        </view>

        <view class="sync-tip">
          <text>云同步功能即将上线，敬请期待</text>
        </view>
      </view>
    </view>

    <!-- 帮助说明 -->
    <view class="help-section">
      <view class="section-header">
        <text class="section-icon">❓</text>
        <text class="section-title">如何获取 TMDB API Key?</text>
      </view>

      <view class="help-content">
        <view class="help-steps">
          <view class="step-item">
            <text class="step-number">1</text>
            <text class="step-text">访问 themoviedb.org 并注册账号</text>
          </view>
          <view class="step-item">
            <text class="step-number">2</text>
            <text class="step-text">进入设置 -> API 页面</text>
          </view>
          <view class="step-item">
            <text class="step-number">3</text>
            <text class="step-text">申请 API Key (选择 Developer)</text>
          </view>
          <view class="step-item">
            <text class="step-number">4</text>
            <text class="step-text">复制 API Key 粘贴到上方输入框</text>
          </view>
        </view>

        <button class="link-button" @click="openTmdbWebsite">
          前往 TMDB 官网
        </button>
      </view>
    </view>

    <!-- 调试信息 -->
    <view class="debug-section" v-if="debugMode">
      <view class="section-header">
        <text class="section-icon">🐛</text>
        <text class="section-title">调试信息</text>
      </view>
      <view class="debug-content">
        <view class="debug-item">
          <text class="debug-label">时间:</text>
          <text class="debug-value">{{ debugInfo.timestamp }}</text>
        </view>
        <view class="debug-item">
          <text class="debug-label">存储状态:</text>
          <text class="debug-value">{{ debugInfo.storageStatus }}</text>
        </view>
        <view class="debug-item">
          <text class="debug-label">权限状态:</text>
          <text class="debug-value">{{ debugInfo.permissionStatus }}</text>
        </view>
        <view class="debug-item">
          <text class="debug-label">存储值:</text>
          <text class="debug-value">{{ debugInfo.storageValue }}</text>
        </view>
      </view>
    </view>

    <!-- 关于信息 -->
    <view class="about-section">
      <view class="section-header">
        <text class="section-icon">ℹ️</text>
        <text class="section-title">关于</text>
      </view>
      <view class="about-content">
        <text class="about-text">MovieDate - 电影日历</text>
        <text class="about-text">版本 1.0.0</text>
        <text class="about-text">本应用使用 TMDB API 获取电影数据</text>
        <text class="about-text">所有数据仅存储在本地，不会上传至服务器</text>
      </view>
      <button
        class="debug-toggle-btn"
        @click="toggleDebugMode"
      >
        {{ debugMode ? '关闭调试' : '开启调试' }}
      </button>
    </view>
    </view>
    </view>
  </template>

<script>
import tmdbApi from '@/utils/tmdb.js'
import storage from '@/utils/storage.js'

export default {
  data() {
    return {
      apiKeyInput: '',
      hasApiKey: false,
      isValidating: false,
      isLoading: false,
      storageReady: false,
      debugMode: false,
      debugInfo: {
        timestamp: '',
        storageStatus: '',
        permissionStatus: '',
        storageValue: ''
      },
      stats: {
        wantCount: 0,
        watchedCount: 0,
        plannedCount: 0,
        totalEvents: 0
      }
    }
  },
  onLoad() {
    this.initializeApp()
  },
  onShow() {
    this.initializeApp()
  },
  methods: {
    // 初始化应用
    async initializeApp() {
      this.isLoading = true
      const startTime = Date.now()

      try {
        this.updateDebugInfo('开始初始化应用', 'info')
        this.checkApiEnvironment()

        // 检查存储权限 - 使用多次尝试的方式
        this.updateDebugInfo('检查存储权限...', 'info')
        let permissions = false
        let retryCount = 0
        const maxRetries = 3

        while (retryCount < maxRetries) {
          try {
            permissions = await this.checkStoragePermissions()
            if (permissions) {
              this.updateDebugInfo(`权限检查成功 (尝试 ${retryCount + 1}/${maxRetries})`, 'success')
              break
            }
          } catch (error) {
            console.warn(`权限检查第 ${retryCount + 1} 次尝试失败:`, error)
          }

          retryCount++
          if (retryCount < maxRetries) {
            this.updateDebugInfo(`权限检查失败，${retryCount}秒后重试...`, 'warning')
            await new Promise(resolve => setTimeout(resolve, retryCount * 1000))
          }
        }

        if (!permissions && retryCount >= maxRetries) {
          this.updateDebugInfo('所有权限检查尝试都失败了，继续初始化但可能无法保存', 'error')
          // 继续初始化但不阻止使用
        }

        // 等待一小段时间确保存储就绪
        this.updateDebugInfo('等待存储就绪...', 'info')
        await this.waitForStorageReady()

        // 测试存储读写 - 尝试多次
        let writeTestSuccess = false
        for (let i = 0; i < 3; i++) {
          try {
            const testKey = 'test_' + Date.now()
            uni.setStorageSync('__temp_test__', testKey)
            const retrievedKey = uni.getStorageSync('__temp_test__')
            uni.removeStorageSync('__temp_test__')

            if (retrievedKey === testKey) {
              this.updateDebugInfo(`读写测试成功 (尝试 ${i + 1}/3)`, 'success')
              writeTestSuccess = true
              break
            } else {
              throw new Error('读写数据不匹配')
            }
          } catch (error) {
            console.warn(`读写测试第 ${i + 1} 次失败:`, error)
          }
        }

        if (!writeTestSuccess) {
          this.updateDebugInfo('读写测试多次失败，将使用降级模式', 'error')
          // 继续但不保证数据持久化
        }

        // 加载 API Key 和统计数据 - 即使存储有问题也尝试加载
        this.updateDebugInfo('加载 API Key...', 'info')
        try {
          this.loadApiKey()
        } catch (error) {
          console.error('加载 API Key 失败:', error)
        }

        this.updateDebugInfo('加载数据统计...', 'info')
        try {
          this.loadStats()
        } catch (error) {
          console.error('加载统计数据失败:', error)
        }

        this.storageReady = true
        const duration = Date.now() - startTime
        this.updateDebugInfo(`初始化完成，耗时 ${duration}ms，存储状态: ${writeTestSuccess ? '正常' : '降级'}`, writeTestSuccess ? 'success' : 'warning')

      } catch (error) {
        console.error('初始化失败:', error)
        this.updateDebugInfo(`初始化失败: ${error.message}`, 'error')
        // 不阻塞界面，让用户可以正常使用
        this.storageReady = true
        this.isLoading = false
      } finally {
        this.isLoading = false
      }
    },

    // 检查存储权限
    async checkStoragePermissions() {
      try {
        // 简化权限检查，直接尝试写入测试
        const testKey = 'permission_test_' + Date.now()
        try {
          uni.setStorageSync('__permission_test__', testKey)
          uni.removeStorageSync('__permission_test__')
          console.log('权限检查：存储可用')
          return true
        } catch (error) {
          console.error('权限检查：存储失败', error)
          return false
        }
      } catch (error) {
        console.error('权限检查异常:', error)
        return false
      }
    },

    // 检查权限
    async checkPermissions() {
      return new Promise((resolve) => {
        try {
          // 尝试使用 uni.getSetting（新版本）
          if (typeof uni.getSetting === 'function') {
            uni.getSetting({
              success: (res) => {
                resolve({
                  write: res.authSetting['scope.writePhotosAlbum'] || false,
                  read: true
                })
              },
              fail: () => {
                resolve({
                  write: false,
                  read: false
                })
              }
            })
          } else {
            // 旧版本直接返回，通过尝试授权来验证
            resolve({
              write: false, // 假设需要授权
              read: true
            })
          }
        } catch (error) {
          console.error('权限检查异常:', error)
          resolve({
            write: false,
            read: false
          })
        }
      })
    },

    // 等待存储就绪
    waitForStorageReady() {
      return new Promise((resolve) => {
        // 首先检查 uni API 是否可用
        if (!uni || typeof uni.setStorageSync !== 'function') {
          this.updateDebugInfo('uni API 不可用，使用降级方案', 'warning')
          resolve()
          return
        }

        // 测试存储是否可用
        const testKey = 'test_' + Date.now()
        try {
          uni.setStorageSync('__test__', testKey)
          uni.removeStorageSync('__test__')
          this.updateDebugInfo('存储测试成功', 'success')
          resolve()
        } catch (error) {
          console.error('存储测试失败:', error)
          this.updateDebugInfo(`存储测试失败: ${error.message}`, 'error')
          // 等待 500ms 再次尝试
          setTimeout(() => {
            resolve()
          }, 500)
        }
      })
    },

    // 检查API环境
    checkApiEnvironment() {
      const apiInfo = {
        platform: uni.getSystemInfoSync().platform,
        version: uni.getSystemInfoSync().uniRuntimeVersion,
        appVersion: uni.getSystemInfoSync().appVersion,
        uniApiAvailable: typeof uni.setStorageSync === 'function'
      }
      this.updateDebugInfo(`API环境: ${JSON.stringify(apiInfo)}`, 'info')
      return apiInfo
    },

    // 更新调试信息
    updateDebugInfo(message, type = 'info') {
      const now = new Date().toLocaleString()
      this.debugInfo = {
        timestamp: now,
        storageStatus: type === 'success' ? '就绪' : '错误',
        permissionStatus: type,
        storageValue: message
      }
      console.log(`[${now}] ${type}: ${message}`)
    },

    // 切换调试模式
    toggleDebugMode() {
      this.debugMode = !this.debugMode
      if (this.debugMode) {
        this.updateDebugInfo('调试模式已开启', 'info')
        // 检查存储状态
        const savedKey = tmdbApi.getApiKey()
        this.updateDebugInfo(`存储值: ${savedKey ? '已保存' : '空'}`, 'info')
      } else {
        this.updateDebugInfo('调试模式已关闭', 'info')
      }
    },

    // API Key 输入处理
    onApiKeyInput(event) {
      console.log('输入事件触发, event类型:', typeof event)
      
      let value = ''
      
      // 确保正确处理输入事件，兼容不同平台
      if (typeof event === 'string') {
        value = event
      } else if (event && event.detail && typeof event.detail.value !== 'undefined') {
        value = event.detail.value
      } else if (event && event.target && typeof event.target.value !== 'undefined') {
        value = event.target.value
      } else {
        console.warn('无法从事件中获取值, event:', event)
        return
      }
      
      console.log('提取的值:', value)
      this.apiKeyInput = value
    },

    // 输入框失焦处理
    onInputBlur() {
      // 收起键盘，避免影响后续操作
      uni.hideKeyboard()
    },

    // 加载已保存的 API Key
    loadApiKey() {
      if (!this.storageReady) {
        console.warn('存储未就绪，跳过加载 API Key')
        return
      }

      try {
        const savedKey = tmdbApi.getApiKey()
        if (savedKey) {
          console.log('成功加载 API Key')
          this.apiKeyInput = savedKey
          this.hasApiKey = true
        } else {
          console.log('未找到保存的 API Key')
          this.apiKeyInput = ''
          this.hasApiKey = false
        }
      } catch (error) {
        console.error('加载 API Key 失败:', error)
        this.apiKeyInput = ''
        this.hasApiKey = false
        uni.showToast({
          title: '读取设置失败',
          icon: 'none'
        })
      }
    },

    // 加载统计数据
    loadStats() {
      if (!this.storageReady) {
        console.warn('存储未就绪，跳过加载数据统计')
        return
      }

      try {
        this.stats = storage.getStatistics()
      } catch (error) {
        console.error('加载数据统计失败:', error)
        this.stats = {
          wantCount: 0,
          watchedCount: 0,
          plannedCount: 0,
          totalEvents: 0
        }
      }
    },

    // 保存 API Key
    async saveApiKey() {
      if (!this.storageReady) {
        uni.showToast({
          title: '存储未就绪，请重试',
          icon: 'none'
        })
        return
      }

      const key = this.apiKeyInput.trim()
      if (!key) {
        uni.showToast({ title: '请输入 API Key', icon: 'none' })
        return
      }

      this.isValidating = true

      try {
        // 先测试保存是否成功
        const saveResult = tmdbApi.setApiKey(key)
        if (!saveResult) {
          throw new Error('保存失败')
        }

        // 验证 API Key
        const isValid = await tmdbApi.validateApiKey(key)
        if (isValid) {
          this.hasApiKey = true
          uni.showToast({ title: '保存成功', icon: 'success' })

          // 验证保存的数据是否能正确读取
          const savedKey = tmdbApi.getApiKey()
          console.log('保存后读取的 API Key:', savedKey)
          if (savedKey !== key) {
            console.error('保存的数据不一致')
            uni.showToast({
              title: '保存异常，请检查',
              icon: 'none'
            })
          }
        } else {
          // 如果验证失败，清除无效的 key
          tmdbApi.clearApiKey()
          uni.showToast({ title: 'API Key 无效', icon: 'error' })
        }
      } catch (error) {
        console.error('保存 API Key 失败:', error)
        uni.showToast({
          title: error.message || '保存失败，请重试',
          icon: 'none'
        })
      } finally {
        this.isValidating = false
      }
    },

    // 清除 API Key
    clearApiKey() {
      uni.showModal({
        title: '确认清除',
        content: '确定要清除已保存的 API Key 吗？',
        success: (res) => {
          if (res.confirm) {
            tmdbApi.clearApiKey()
            this.apiKeyInput = ''
            this.hasApiKey = false
            uni.showToast({ title: '已清除', icon: 'success' })
          }
        }
      })
    },

    // 导出数据
    async handleExport() {
      uni.showLoading({ title: '导出中...' })
      try {
        const result = await storage.exportToFile()
        uni.hideLoading()
        if (result && result.success !== false) {
          uni.showToast({ title: '导出成功', icon: 'success' })
        }
      } catch (err) {
        uni.hideLoading()
        uni.showToast({ title: '导出失败', icon: 'error' })
      }
    },

    // 导入数据
    async handleImport() {
      uni.showModal({
        title: '导入数据',
        content: '导入将合并现有数据，是否继续？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const result = await storage.importFromFile()
              if (result.success) {
                uni.showToast({
                  title: `导入成功：${result.imported.movieCount} 部电影`,
                  icon: 'success'
                })
                this.loadStats()
              } else {
                uni.showToast({ title: result.error || '导入失败', icon: 'none' })
              }
            } catch (err) {
              uni.showToast({ title: '导入失败', icon: 'error' })
            }
          }
        }
      })
    },

    // 清除所有数据
    handleClearData() {
      uni.showModal({
        title: '警告',
        content: '此操作将清除所有电影状态和日历数据，且不可恢复！',
        confirmColor: '#ee0a24',
        success: (res) => {
          if (res.confirm) {
            storage.clearAllData()
            this.loadStats()
            uni.showToast({ title: '已清除', icon: 'success' })
          }
        }
      })
    },

    // 打开 TMDB 官网
    openTmdbWebsite() {
      uni.setClipboardData({
        data: 'https://www.themoviedb.org/settings/api',
        success: () => {
          uni.showToast({ title: '链接已复制', icon: 'success' })
        }
      })
    }
  }
}
</script>

<style scoped>
.me-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-spinner {
  font-size: 32px;
  margin-bottom: 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #999;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px 20px;
}

.page-title {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
}

/* 统计区域 */
.stats-section {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stats-content {
  padding: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 通用 section 样式 */
.settings-section,
.data-section,
.sync-section,
.help-section,
.about-section {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.section-icon {
  font-size: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.dev-tag {
  padding: 2px 8px;
  font-size: 11px;
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
  border-radius: 4px;
}

.api-key-content {
  padding: 16px;
}

.input-wrapper {
  margin-bottom: 16px;
  position: relative;
  z-index: 2;
}

.api-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  outline: none;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
  position: relative;
  z-index: 1;
}

.api-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.save-btn {
  flex: 1;
  padding: 10px;
  font-size: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
}

.save-btn:disabled {
  opacity: 0.6;
}

.clear-btn {
  padding: 10px 16px;
  font-size: 14px;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.status-wrapper {
  display: flex;
  align-items: center;
}

.status-tag {
  padding: 4px 12px;
  font-size: 13px;
  border-radius: 4px;
  font-weight: 500;
}

.tag-success {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.tag-warning {
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

/* 数据管理 */
.data-content {
  padding: 0;
}

.data-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.data-item:active {
  background: #f5f5f5;
}

.data-item:last-child {
  border-bottom: none;
}

.data-item.danger .item-title {
  color: #ee0a24;
}

.item-icon {
  font-size: 20px;
  margin-right: 12px;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-title {
  font-size: 15px;
  color: #333;
}

.item-desc {
  font-size: 12px;
  color: #999;
}

.item-desc-danger {
  font-size: 12px;
  color: #ee0a24;
}

.item-arrow {
  font-size: 20px;
  color: #ccc;
}

/* 云同步 */
.sync-content {
  padding: 0;
}

.sync-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.sync-item.disabled {
  opacity: 0.5;
}

.sync-item:last-child {
  border-bottom: none;
}

.sync-tip {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: #999;
  background: #fafafa;
}

/* 帮助说明 */
.help-content {
  padding: 16px;
}

.help-steps {
  margin-bottom: 16px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
}

.step-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #667eea;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  margin-right: 12px;
  flex-shrink: 0;
}

.step-text {
  flex: 1;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  padding-top: 2px;
}

.link-button {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  background: transparent;
  color: #667eea;
  border: 1px solid #667eea;
  border-radius: 8px;
}

/* 调试信息 */
.debug-section {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.debug-content {
  padding: 16px;
}

.debug-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.debug-label {
  color: #999;
  margin-right: 8px;
  min-width: 80px;
}

.debug-value {
  color: #333;
  flex: 1;
  word-break: break-all;
}

/* 关于信息 */
.about-content {
  padding: 16px;
}

.about-text {
  display: block;
  font-size: 13px;
  color: #666;
  line-height: 1.8;
  margin-bottom: 4px;
}

.debug-toggle-btn {
  margin: 0 16px 16px;
  padding: 10px;
  font-size: 14px;
  background: #f5f5f5;
  color: #666;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
</style>
