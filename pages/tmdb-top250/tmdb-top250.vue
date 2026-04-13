<template>
  <view class="container">
    <!-- 头部统计 -->
    <view class="header">
      <view class="header-bg"></view>
      <view class="header-glow"></view>
      <view class="header-content">
        <text class="badge">TMDB TOP 250</text>
        <view class="stats-row">
          <view class="stat-block">
            <text class="stat-num">{{ stats.watchedCount }}</text>
            <text class="stat-label">已看</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-block">
            <text class="stat-num">{{ stats.total }}</text>
            <text class="stat-label">总计</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-block">
            <text class="stat-num">{{ stats.percentage }}%</text>
            <text class="stat-label">完成度</text>
          </view>
        </view>
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: stats.percentage + '%' }"></view>
        </view>
      </view>
    </view>

    <!-- 海报墙 -->
    <scroll-view class="wall-scroll" scroll-y>
      <view v-if="watchedMovies.length === 0 && !loading" class="empty-wall">
        <text class="empty-icon">🎬</text>
        <text class="empty-title">还没有看过任何电影</text>
        <text class="empty-subtitle">去标记一些已看电影，打造你的专属海报墙</text>
      </view>

      <view v-else class="wall-grid">
        <image
          v-for="movie in watchedMovies"
          :key="movie.id"
          class="wall-poster"
          :src="movie.poster || '/static/default-poster.png'"
          mode="aspectFill"
          lazy-load
        />
      </view>

      <view v-if="loading" class="loading-tip">
        <text>正在加载海报...</text>
      </view>
    </scroll-view>

    <!-- 导出按钮 -->
    <view v-if="watchedMovies.length > 0" class="fab" @click="onExport">
      <text class="fab-icon">📷</text>
      <text class="fab-text">生成分享图</text>
    </view>

    <!-- 隐藏 canvas -->
    <canvas canvas-id="shareCanvas" class="share-canvas"></canvas>

    <!-- 预览弹窗 -->
    <view v-if="previewImage" class="preview-mask" @click="closePreview">
      <view class="preview-content" @click.stop>
        <image
          class="preview-img"
          :src="previewImage"
          mode="widthFix"
          show-menu-by-longpress
        />
        <view class="preview-actions">
          <view class="preview-btn primary" @click="saveImage">
            <text>保存到相册</text>
          </view>
          <view class="preview-btn" @click="closePreview">
            <text>关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import tmdbApi from '@/utils/tmdb.js'
import storage from '@/utils/storage.js'
import { generatePosterWallImage } from '@/utils/posterShare.js'

export default {
  data() {
    return {
      watchedMovies: [],
      loading: false,
      stats: {
        total: 250,
        watchedCount: 0,
        percentage: 0
      },
      previewImage: ''
    }
  },

  async onLoad() {
    await this.loadData()
  },

  methods: {
    async loadData() {
      this.loading = true
      try {
        const movieStatus = storage.getAllMovieStatus()
        const watchedIds = Object.entries(movieStatus)
          .filter(([_, data]) => data.status === 'watched')
          .map(([id]) => parseInt(id))

        let allMovies = []
        let page = 1
        let totalPages = 1
        while (page <= 13 && page <= totalPages) {
          const result = await tmdbApi.getTopRatedMovies(page)
          totalPages = result.totalPages
          const pageMovies = result.movies.map((movie, index) => {
            const rank = (page - 1) * 20 + index + 1
            return {
              ...movie,
              rank,
              isWatched: watchedIds.includes(movie.id)
            }
          })
          allMovies.push(...pageMovies)
          page++
        }

        this.watchedMovies = allMovies
          .filter(m => m.isWatched)
          .sort((a, b) => a.rank - b.rank)
        this.updateStats()
      } catch (error) {
        console.error('[TMDBTop250] 加载数据失败:', error)
        uni.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },

    updateStats() {
      const watchedCount = this.watchedMovies.length
      const total = 250
      this.stats = {
        total,
        watchedCount,
        percentage: Math.min(100, Math.floor((watchedCount / total) * 100))
      }
      uni.setStorageSync('tmdb_top250_watched_count', watchedCount)
    },

    async onExport() {
      if (this.watchedMovies.length === 0) return
      uni.showLoading({ title: '生成中...', mask: true })
      try {
        const path = await generatePosterWallImage({
          title: 'TMDB TOP 250',
          subtitle: 'MY WATCHED COLLECTION',
          watchedCount: this.stats.watchedCount,
          total: this.stats.total,
          percentage: this.stats.percentage,
          posters: this.watchedMovies.map(m => m.poster),
          themeColor: '#f39c12',
          themeColorEnd: '#e67e22'
        })
        this.previewImage = path
      } catch (error) {
        console.error('生成分享图失败:', error)
        uni.showToast({ title: '生成失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    closePreview() {
      this.previewImage = ''
    },

    async saveImage() {
      try {
        await uni.saveImageToPhotosAlbum({ filePath: this.previewImage })
        uni.showToast({ title: '已保存到相册', icon: 'success' })
      } catch (e) {
        if (e.errMsg && e.errMsg.includes('auth deny')) {
          uni.showModal({
            title: '需要授权',
            content: '请允许保存图片到相册',
            success: (res) => {
              if (res.confirm) uni.openSetting()
            }
          })
        } else {
          uni.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #0b0c0f;
  display: flex;
  flex-direction: column;
}

/* 头部 */
.header {
  position: relative;
  padding: 60rpx 40rpx 50rpx;
  overflow: hidden;
}

.header-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 60%, #d35400 100%);
}

.header-glow {
  position: absolute;
  top: -100rpx;
  right: -100rpx;
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%);
}

.header-content {
  position: relative;
  z-index: 1;
}

.badge {
  display: inline-block;
  font-size: 22rpx;
  color: rgba(255,255,255,0.9);
  letter-spacing: 4rpx;
  border: 1rpx solid rgba(255,255,255,0.35);
  padding: 8rpx 20rpx;
  border-radius: 30rpx;
  margin-bottom: 30rpx;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30rpx;
}

.stat-block {
  flex: 1;
  text-align: center;
}

.stat-num {
  display: block;
  font-size: 64rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  margin-bottom: 10rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.75);
}

.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background: rgba(255,255,255,0.25);
}

.progress-track {
  height: 14rpx;
  background: rgba(0,0,0,0.25);
  border-radius: 8rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 8rpx;
  transition: width 0.8s ease;
}

/* 海报墙滚动区 */
.wall-scroll {
  flex: 1;
  min-height: 0;
}

.wall-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 16rpx;
}

.wall-poster {
  width: calc(25% - 12rpx);
  margin: 6rpx;
  height: 240rpx;
  border-radius: 10rpx;
  background: #1a1c23;
  opacity: 0;
  animation: fadeIn 0.6s ease forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

.empty-wall {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.empty-title {
  font-size: 32rpx;
  color: #ccc;
  margin-bottom: 16rpx;
}

.empty-subtitle {
  font-size: 26rpx;
  color: #777;
  text-align: center;
}

.loading-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #666;
  font-size: 26rpx;
}

/* 导出按钮 */
.fab {
  position: fixed;
  right: 30rpx;
  bottom: 60rpx;
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
  border-radius: 60rpx;
  padding: 20rpx 34rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 30rpx rgba(243, 156, 18, 0.35);
  z-index: 100;
}

.fab-icon {
  font-size: 32rpx;
  margin-right: 10rpx;
}

.fab-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

/* 隐藏 canvas */
.share-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 750px;
  height: 6000px;
  pointer-events: none;
}

/* 预览弹窗 */
.preview-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 40rpx;
}

.preview-content {
  width: 100%;
  max-width: 640rpx;
  background: #1a1c23;
  border-radius: 20rpx;
  overflow: hidden;
  padding: 20rpx;
}

.preview-img {
  width: 100%;
  border-radius: 12rpx;
  display: block;
}

.preview-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.preview-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 12rpx;
  background: #2a2d36;

  text {
    font-size: 28rpx;
    color: #ddd;
  }

  &.primary {
    background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);

    text {
      color: #fff;
      font-weight: 600;
    }
  }
}
</style>
