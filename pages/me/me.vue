<template>
  <view class="me-page">
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
      stats: {
        wantCount: 0,
        watchedCount: 0,
        plannedCount: 0,
        totalEvents: 0
      }
    }
  },
  onLoad() {
    this.loadApiKey()
    this.loadStats()
  },
  onShow() {
    this.loadApiKey()
    this.loadStats()
  },
  methods: {
    // 加载已保存的 API Key
    loadApiKey() {
      const savedKey = tmdbApi.getApiKey()
      if (savedKey) {
        this.apiKeyInput = savedKey
        this.hasApiKey = true
      } else {
        this.apiKeyInput = ''
        this.hasApiKey = false
      }
    },

    // 加载统计数据
    loadStats() {
      this.stats = storage.getStatistics()
    },

    // 保存 API Key
    async saveApiKey() {
      const key = this.apiKeyInput.trim()
      if (!key) {
        uni.showToast({ title: '请输入 API Key', icon: 'none' })
        return
      }

      this.isValidating = true

      try {
        const isValid = await tmdbApi.validateApiKey(key)
        if (isValid) {
          tmdbApi.setApiKey(key)
          this.hasApiKey = true
          uni.showToast({ title: '保存成功', icon: 'success' })
        } else {
          uni.showToast({ title: 'API Key 无效', icon: 'error' })
        }
      } catch (error) {
        uni.showToast({ title: '验证失败，请重试', icon: 'none' })
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
</style>
