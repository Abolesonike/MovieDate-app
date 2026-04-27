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
      <view class="wall-card douban" disabled @click="goToDoubanTop250">
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
          <text class="wall-arrow">›</text>
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

      <!-- 时间轴海报 -->
      <view class="wall-card timeline" @click="goToTimelinePoster">
        <view class="wall-bg">
          <view class="wall-gradient"></view>
        </view>
        <view class="wall-content">
          <view class="wall-icon">📅</view>
          <view class="wall-info">
            <text class="wall-title">时间轴海报</text>
            <text class="wall-desc">按时间回顾你的观影历程</text>
            <view class="wall-progress">
              <text class="progress-text">已看 {{ totalWatchedCount }} 部电影</text>
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: '100%' }"></view>
              </view>
            </view>
          </view>
          <text class="wall-arrow">›</text>
        </view>
      </view>

      <!-- 个人 TOP10 -->
      <view class="wall-card personal-top10" @click="goToPersonalTop10">
        <view class="wall-bg">
          <view class="wall-gradient"></view>
        </view>
        <view class="wall-content">
          <view class="wall-icon">🏆</view>
          <view class="wall-info">
            <text class="wall-title">个人TOP10</text>
            <text class="wall-desc">精选你的年度最佳电影</text>
            <view class="wall-progress">
              <text class="progress-text">已选 {{ personalTop10Count }}/10</text>
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: (personalTop10Count / 10 * 100) + '%' }"></view>
              </view>
            </view>
          </view>
          <text class="wall-arrow">›</text>
        </view>
      </view>

      <!-- 个人喜好表 -->
      <view class="wall-card favorite-grid" @click="goToFavoriteGrid">
        <view class="wall-bg">
          <view class="wall-gradient"></view>
        </view>
        <view class="wall-content">
          <view class="wall-icon">🎨</view>
          <view class="wall-info">
            <text class="wall-title">个人喜好表</text>
            <text class="wall-desc">自定义你的电影偏好矩阵</text>
            <view class="wall-progress">
              <text class="progress-text">已填 {{ favoriteGridCount }}/30</text>
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: (favoriteGridCount / 30 * 100) + '%' }"></view>
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
      tmdbWatchedCount: 0,
      totalWatchedCount: 0,
      personalTop10Count: 0,
      favoriteGridCount: 0
    }
  },

  onShow() {
    this.loadDoubanStats()
    this.loadTmdbStats()
    this.loadTotalStats()
    this.loadPersonalTop10Stats()
    this.loadFavoriteGridStats()
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
        url: '/pages/tops/douban/index'
      })
    },

    goToTmdbTop250() {
      uni.navigateTo({
        url: '/pages/tops/tmdb/index'
      })
    },

    loadTotalStats() {
      try {
        const movieStatus = storage.getAllMovieStatus()
        const watchedCount = Object.entries(movieStatus)
          .filter(([id, data]) => data.status === 'watched').length
        this.totalWatchedCount = watchedCount
      } catch (error) {
        console.error('[PosterWall] 加载总统计失败:', error)
        this.totalWatchedCount = 0
      }
    },

    goToTimelinePoster() {
      uni.navigateTo({
        url: '/pages/generate/timeline/index'
      })
    },

    loadPersonalTop10Stats() {
      try {
        this.personalTop10Count = storage.getPersonalTop10().length
      } catch (error) {
        console.error('[PosterWall] 加载个人Top10统计失败:', error)
        this.personalTop10Count = 0
      }
    },

    goToPersonalTop10() {
      uni.navigateTo({
        url: '/pages/tops/personal/index'
      })
    },

    loadFavoriteGridStats() {
      try {
        this.favoriteGridCount = storage.getFavoriteGrid().items.length
      } catch (error) {
        console.error('[PosterWall] 加载个人喜好表统计失败:', error)
        this.favoriteGridCount = 0
      }
    },

    goToFavoriteGrid() {
      uni.navigateTo({
        url: '/pages/generate/favorite/index'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: var(--bg-page);
}

/* 页面标题 */
.page-header {
  background: var(--primary);
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
  box-shadow: 0 8rpx 30rpx var(--shadow);

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
    background: #00b894;
  }
}

/* TMDB卡片 - 金色主题 */
.wall-card.tmdb {
  .wall-bg {
    background: #f39c12;
  }
}

/* 奥斯卡卡片 - 红色主题 */
.wall-card.oscar {
  .wall-bg {
    background: #e74c3c;
  }
}

/* AFI卡片 - 蓝色主题 */
.wall-card.afi {
  .wall-bg {
    background: #3498db;
  }
}

/* 时间轴卡片 - 主题色 */
.wall-card.timeline {
  .wall-bg {
    background: var(--primary);
  }
}

/* 个人TOP10卡片 - 玫红/珊瑚主题 */
.wall-card.personal-top10 {
  .wall-bg {
    background: #ff6b6b;
  }
}

/* 个人喜好表卡片 - 深蓝/紫主题 */
.wall-card.favorite-grid {
  .wall-bg {
    background: #2c3e50;
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
  background: var(--bg-card);
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
