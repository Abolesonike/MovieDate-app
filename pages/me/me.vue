<template>
  <view class="me-page">
    <!-- 加载状态 -->
    <view v-if="isLoading" class="loading-container">
      <van-loading type="spinner" size="24px" />
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
        <van-icon name="chart-trending-o" size="20" color="#666" />
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
        <van-icon name="setting-o" size="20" color="#666" />
        <text class="section-title">TMDB API 设置</text>
      </view>

      <view class="api-key-content">
        <!-- API Key 输入框 -->
        <view class="input-wrapper">
          <van-field
            v-model="apiKeyInput"
            type="text"
            placeholder="请输入 TMDB API Key"
            :border="true"
            clearable
          />
        </view>

        <!-- 操作按钮 -->
        <view class="action-buttons">
          <van-button
            type="primary"
            size="small"
            @click="saveApiKey"
            :disabled="!apiKeyInput.trim() || isValidating"
            :loading="isValidating"
          >
            保存
          </van-button>
          <van-button
            type="default"
            size="small"
            @click="clearApiKey"
            v-if="hasApiKey"
          >
            清除
          </van-button>
        </view>

        <!-- 状态标签 -->
        <view class="status-wrapper">
          <van-tag :type="hasApiKey ? 'success' : 'warning'" size="medium">
            {{ hasApiKey ? '已配置' : '未配置' }}
          </van-tag>
        </view>
      </view>
    </view>

    <!-- 数据管理 -->
    <view class="data-section">
      <view class="section-header">
        <van-icon name="cluster-o" size="20" color="#666" />
        <text class="section-title">数据管理</text>
      </view>

      <view class="data-content">
        <van-cell-group inset>
          <van-cell title="导出数据" is-link @click="handleExport">
            <template #icon>
              <van-icon name="upgrade" size="18" color="#667eea" />
            </template>
            <template #value>
              <text class="cell-desc">备份到本地</text>
            </template>
          </van-cell>
          <van-cell title="导入数据" is-link @click="handleImport">
            <template #icon>
              <van-icon name="downgrade" size="18" color="#667eea" />
            </template>
            <template #value>
              <text class="cell-desc">从备份恢复</text>
            </template>
          </van-cell>
          <van-cell title="清除所有数据" is-link @click="handleClearData">
            <template #icon>
              <van-icon name="delete-o" size="18" color="#ee0a24" />
            </template>
            <template #value>
              <text class="cell-desc-danger">不可恢复</text>
            </template>
          </van-cell>
        </van-cell-group>
      </view>
    </view>

    <!-- 云同步（预留） -->
    <view class="sync-section">
      <view class="section-header">
        <van-icon name="cloud-o" size="20" color="#666" />
        <text class="section-title">云同步</text>
        <van-tag type="warning" size="mini">开发中</van-tag>
      </view>

      <view class="sync-content">
        <van-cell-group inset>
          <van-cell title="配置云同步" is-link disabled>
            <template #icon>
              <van-icon name="setting-o" size="18" color="#999" />
            </template>
          </van-cell>
          <van-cell title="立即同步" is-link disabled>
            <template #icon>
              <van-icon name="replay" size="18" color="#999" />
            </template>
          </van-cell>
        </van-cell-group>

        <view class="sync-tip">
          <text>云同步功能即将上线，敬请期待</text>
        </view>
      </view>
    </view>

    <!-- 帮助说明 -->
    <view class="help-section">
      <view class="section-header">
        <van-icon name="question-o" size="20" color="#666" />
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

        <van-button
          type="primary"
          plain
          size="small"
          class="link-button"
          @click="openTmdbWebsite"
        >
          前往 TMDB 官网
        </van-button>
      </view>
    </view>

    <!-- 调试信息 -->
    <view class="debug-section" v-if="debugMode">
      <view class="section-header">
        <van-icon name="bug-o" size="20" color="#ff6b6b" />
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
        <van-icon name="info-o" size="20" color="#666" />
        <text class="section-title">关于</text>
      </view>
      <view class="about-content">
        <text class="about-text">MovieDate - 电影日历</text>
        <text class="about-text">版本 1.0.0</text>
        <text class="about-text">本应用使用 TMDB API 获取电影数据</text>
        <text class="about-text">所有数据仅存储在本地，不会上传至服务器</text>
      </view>
      <van-button
        type="default"
        size="small"
        @click="toggleDebugMode"
        style="margin-top: 16px;"
      >
        {{ debugMode ? '关闭调试' : '开启调试' }}
      </van-button>
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

<style>
.me-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 20px;
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

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  flex: 1;
}

.api-key-content {
  padding: 16px;
}

.input-wrapper {
  margin-bottom: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.status-wrapper {
  display: flex;
  align-items: center;
}

/* 数据管理 */
.data-content {
  padding: 0;
}

.cell-desc {
  font-size: 12px;
  color: #999;
}

.cell-desc-danger {
  font-size: 12px;
  color: #ee0a24;
}

/* 云同步 */
.sync-content {
  padding: 0;
}

.sync-tip {
  padding: 16px;
  text-align: center;
}

.sync-tip text {
  font-size: 12px;
  color: #999;
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
  align-items: center;
  margin-bottom: 12px;
}

.step-number {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  margin-right: 12px;
  flex-shrink: 0;
}

.step-text {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.link-button {
  width: 100%;
}

/* 关于 */
.about-content {
  padding: 16px;
}

.about-text {
  display: block;
  color: #999;
  font-size: 13px;
  line-height: 1.8;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  min-height: 200px;
}

.loading-text {
  margin-top: 12px;
  color: #666;
  font-size: 14px;
}

/* 调试区域 */
.debug-section {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #ff6b6b;
}

.debug-content {
  padding: 16px;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.debug-label {
  color: #666;
  font-weight: 500;
}

.debug-value {
  color: #333;
  font-family: monospace;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
