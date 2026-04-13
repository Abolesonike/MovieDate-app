<template>
  <view class="container">
    <!-- 页面标题 -->
    <!-- <view class="page-header">
      <text class="page-title">海报墙</text>
      <text class="page-subtitle">探索经典电影收藏</text>
    </view> -->

    <!-- 海报墙分类列表 -->
    <view class="wall-list">
      <!-- 豆瓣Top250 -->
      <!-- <view class="wall-card douban" disabled @click="goToDoubanTop250"> -->
      <view class="wall-card douban disabled">
        <view class="wall-bg">
          <view class="wall-gradient"></view>
        </view>
        <view class="wall-content">
          <view class="wall-icon">🏆</view>
          <view class="wall-info">
            <text class="wall-title">豆瓣Top250</text>
            <text class="wall-desc">豆瓣评分最高的250部电影</text>
            <view class="wall-progress">
              <text class="progress-text">已看 {{ doubanWatchedCount }}/250</text>
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: (doubanWatchedCount / 250 * 100) + '%' }"></view>
              </view>
            </view>
          </view>
          <!-- <text class="wall-arrow">›</text> -->
          <view class="coming-soon">敬请期待</view>
        </view>
      </view>

      <!-- TMDB Top250 -->
      <view class="wall-card tmdb" @click="goToTmdbTop250">
        <view class="wall-bg">
          <view class="wall-gradient"></view>
        </view>
        <view class="wall-content">
          <view class="wall-icon">🎬</view>
          <view class="wall-info">
            <text class="wall-title">TMDB Top250</text>
            <text class="wall-desc">全球评分最高的250部电影</text>
            <view class="wall-progress">
              <text class="progress-text">已看 {{ tmdbWatchedCount }}/250</text>
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: (tmdbWatchedCount / 250 * 100) + '%' }"></view>
              </view>
            </view>
          </view>
          <text class="wall-arrow">›</text>
        </view>
      </view>

      <!-- 预留：奥斯卡最佳影片 -->
      <view class="wall-card oscar disabled">
        <view class="wall-bg">
          <view class="wall-gradient"></view>
        </view>
        <view class="wall-content">
          <view class="wall-icon">🏅</view>
          <view class="wall-info">
            <text class="wall-title">奥斯卡最佳影片</text>
            <text class="wall-desc">历年奥斯卡最佳影片</text>
          </view>
          <view class="coming-soon">敬请期待</view>
        </view>
      </view>

      <!-- 预留：AFI百年百大 -->
      <view class="wall-card afi disabled">
        <view class="wall-bg">
          <view class="wall-gradient"></view>
        </view>
        <view class="wall-content">
          <view class="wall-icon">⭐</view>
          <view class="wall-info">
            <text class="wall-title">AFI百年百大</text>
            <text class="wall-desc">美国电影学会百年百大电影</text>
          </view>
          <view class="coming-soon">敬请期待</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import doubanMapping from '@/utils/doubanMapping.js'
import storage from '@/utils/storage.js'

export default {
  data() {
    return {
      doubanWatchedCount: 0,
      tmdbWatchedCount: 0
    }
  },

  onShow() {
    this.loadDoubanStats()
    this.loadTmdbStats()
  },

  methods: {
    async loadDoubanStats() {
      try {
        await doubanMapping.init()
        const movieStatus = storage.getAllMovieStatus()
        const watchedIds = Object.entries(movieStatus)
          .filter(([id, data]) => data.status === 'watched')
          .map(([id]) => parseInt(id))
        const stats = doubanMapping.getWatchStats(watchedIds)
        this.doubanWatchedCount = stats.watchedCount
      } catch (error) {
        console.error('[PosterWall] 加载豆瓣统计失败:', error)
        this.doubanWatchedCount = 0
      }
    },

    loadTmdbStats() {
      const count = uni.getStorageSync('tmdb_top250_watched_count')
      this.tmdbWatchedCount = count || 0
    },

    goToDoubanTop250() {
      uni.navigateTo({
        url: '/pages/douban-top250/douban-top250'
      })
    },

    goToTmdbTop250() {
      uni.navigateTo({
        url: '/pages/tmdb-top250/tmdb-top250'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 页面标题 */
.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx 60rpx;
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  display: block;
}

.page-subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 12rpx;
  display: block;
}

/* 海报墙列表 */
.wall-list {
  padding: 30rpx;
  margin-top: -30rpx;
}

/* 卡片通用样式 */
.wall-card {
  position: relative;
  border-radius: 20rpx;
  overflow: hidden;
  margin-bottom: 30rpx;
  height: 240rpx;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.12);

  &.disabled {
    opacity: 0.6;
  }

  &:active:not(.disabled) {
    transform: scale(0.98);
    transition: transform 0.1s;
  }
}

/* 豆瓣卡片 - 绿色主题 */
.wall-card.douban {
  .wall-bg {
    background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
  }
}

/* TMDB卡片 - 金色主题 */
.wall-card.tmdb {
  .wall-bg {
    background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
  }
}

/* 奥斯卡卡片 - 红色主题 */
.wall-card.oscar {
  .wall-bg {
    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  }
}

/* AFI卡片 - 蓝色主题 */
.wall-card.afi {
  .wall-bg {
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  }
}

.wall-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.wall-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 100%);
}

.wall-content {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 30rpx;
}

.wall-icon {
  font-size: 72rpx;
  margin-right: 30rpx;
}

.wall-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.wall-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

.wall-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}

.wall-progress {
  margin-top: 16rpx;
}

.progress-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 8rpx;
  display: block;
}

.progress-bar {
  width: 200rpx;
  height: 8rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 4rpx;
  transition: width 0.5s ease;
}

.wall-arrow {
  font-size: 48rpx;
  color: rgba(255, 255, 255, 0.8);
}

.coming-soon {
  padding: 8rpx 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8rpx;
  font-size: 22rpx;
  color: #fff;
}
</style>
