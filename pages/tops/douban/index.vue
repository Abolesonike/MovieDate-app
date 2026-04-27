<template>
  <view class="container">
    <!-- 顶部标题区 -->
    <view class="header">
      <view class="header-card">
        <text class="header-title">豆瓣 Top250</text>
        <text class="header-subtitle">已看 {{ stats.watchedCount }} / {{ stats.total }}</text>
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
        <view
          v-for="movie in watchedMovies"
          :key="movie.tmdbId"
          class="wall-item"
        >
          <image
            class="wall-poster"
            :src="movie.poster || '/static/default-poster.png'"
            mode="aspectFill"
            lazy-load
          />
          <text class="wall-title">{{ movie.title }}</text>
        </view>
      </view>

      <view v-if="loading" class="loading-tip">
        <text>正在加载海报...</text>
      </view>
    </scroll-view>

    <!-- 导出按钮 -->
    <view v-if="watchedMovies.length > 0" class="fab" @click="onExport">
      <text class="fab-icon">📷</text>
      <text class="fab-text">导出图片</text>
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
import doubanMapping from '@/utils/doubanMapping.js'
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
        watchedCount: 0
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
        // 1. 初始化映射数据
        await doubanMapping.init()

        // 2. 获取用户已看电影列表
        const movieStatus = storage.getAllMovieStatus()
        const watchedIds = Object.entries(movieStatus)
          .filter(([id, data]) => data.status === 'watched')
          .map(([id]) => parseInt(id))

        // 3. 获取观影统计
        const stats = doubanMapping.getWatchStats(watchedIds)
        this.stats = {
          total: stats.total,
          watchedCount: stats.watchedCount
        }

        // 4. 获取已看电影详情（带豆瓣排名信息）
        const watchedTop250 = doubanMapping.getWatchedTop250(watchedIds)
        this.watchedMovies = await this.fetchMovieDetails(watchedTop250)
      } catch (error) {
        console.error('[DoubanTop250] 加载数据失败:', error)
        uni.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },

    async fetchMovieDetails(doubanMovies) {
      if (!doubanMovies || doubanMovies.length === 0) return []

      const movies = []
      for (const doubanMovie of doubanMovies) {
        try {
          const tmdbDetail = await tmdbApi.getMovieDetails(doubanMovie.tmdbId)
          if (tmdbDetail) {
            movies.push({
              ...doubanMovie,
              poster: tmdbDetail.poster
            })
          }
        } catch (error) {
          console.error(`[DoubanTop250] 获取电影详情失败: ${doubanMovie.title}`, error)
          movies.push({
            ...doubanMovie,
            poster: ''
          })
        }
      }
      return movies
    },

    async onExport() {
      if (this.watchedMovies.length === 0) return
      uni.showLoading({ title: '生成中...', mask: true })
      try {
        const path = await generatePosterWallImage({
          title: '豆瓣 Top250 观影海报墙',
          subtitle: `已看 ${this.stats.watchedCount} / ${this.stats.total}`,
          movies: this.watchedMovies.map(m => ({
            poster: m.poster,
            title: m.title
          })),
          canvasId: 'shareCanvas',
          componentThis: this
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
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
}

/* 顶部标题区 */
.header {
  padding: 30rpx;
}

.header-card {
  background: var(--bg-card);
  border-radius: 20rpx;
  padding: 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.header-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}

.header-subtitle {
  display: block;
  font-size: 26rpx;
  color: var(--text-secondary);
}

/* 海报墙 */
.wall-scroll {
  flex: 1;
  min-height: 0;
  padding: 0 20rpx 20rpx;
}

.wall-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.wall-item {
  width: calc(20% - 10rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wall-poster {
  width: 100%;
  height: 180rpx;
  border-radius: 8rpx;
  background: #e0e0e0;
}

.wall-title {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: var(--text-primary);
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 空状态 */
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
  color: var(--text-secondary);
  margin-bottom: 16rpx;
}

.empty-subtitle {
  font-size: 26rpx;
  color: var(--text-tertiary);
  text-align: center;
}

.loading-tip {
  text-align: center;
  padding: 40rpx 0;
  color: var(--text-tertiary);
  font-size: 26rpx;
}

/* 导出按钮 */
.fab {
  position: fixed;
  right: 30rpx;
  bottom: 60rpx;
  background: var(--primary);
  border-radius: 60rpx;
  padding: 20rpx 34rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 30rpx rgba(102, 126, 234, 0.35);
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
  height: 15000px;
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
  background: var(--bg-card);
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
  background: var(--bg-hover);

  text {
    font-size: 28rpx;
    color: var(--text-secondary);
  }

  &.primary {
    background: var(--primary);

    text {
      color: #fff;
      font-weight: 600;
    }
  }
}
</style>
