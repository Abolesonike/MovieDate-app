<template>
  <view class="container">
    <!-- 统计信息 -->
    <view class="stats-header">
      <view class="stats-card">
        <text class="stats-title">豆瓣Top250观影进度</text>
        <view class="stats-numbers">
          <text class="stats-watched">{{ stats.watchedCount }}</text>
          <text class="stats-separator">/</text>
          <text class="stats-total">{{ stats.total }}</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: stats.percentage + '%' }"></view>
        </view>
        <text class="stats-percentage">已完成 {{ stats.percentage }}%</text>
      </view>
    </view>

    <!-- 标签切换 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: currentTab === 'watched' }"
        @click="switchTab('watched')"
      >
        <text>已看({{ watchedMovies.length }})</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: currentTab === 'unwatched' }"
        @click="switchTab('unwatched')"
      >
        <text>未看({{ unwatchedMovies.length }})</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: currentTab === 'all' }"
        @click="switchTab('all')"
      >
        <text>全部</text>
      </view>
    </view>

    <!-- 海报墙 -->
    <scroll-view class="poster-wall" scroll-y @scrolltolower="loadMore">
      <view class="poster-grid">
        <view
          v-for="movie in displayMovies"
          :key="movie.tmdbId"
          class="poster-item"
          :class="{ unwatched: !movie.isWatched }"
          @click="goToMovieDetail(movie)"
        >
          <!-- 排名标签 -->
          <view class="rank-badge" :class="{ top10: movie.doubanRank <= 10 }">
            <text>{{ movie.doubanRank }}</text>
          </view>

          <!-- 海报图片 -->
          <image
            class="poster-image"
            :src="movie.poster || '/static/default-poster.png'"
            mode="aspectFill"
            lazy-load
          />

          <!-- 未看遮罩 -->
          <view v-if="!movie.isWatched" class="unwatched-mask">
            <text class="lock-icon">🔒</text>
          </view>

          <!-- 电影信息 -->
          <view class="movie-info">
            <text class="movie-title">{{ movie.title }}</text>
            <view class="movie-meta">
              <text class="movie-year">{{ movie.year }}</text>
              <text class="movie-rating">⭐ {{ movie.doubanRating }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-if="displayMovies.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无数据</text>
        <text v-if="currentTab === 'watched'" class="empty-hint">
          快去标记你看过的电影吧
        </text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import doubanMapping from '@/utils/doubanMapping.js'
import tmdbApi from '@/utils/tmdb.js'

export default {
  data() {
    return {
      currentTab: 'watched',
      watchedMovies: [],
      unwatchedMovies: [],
      allMovies: [],
      loading: false,
      stats: {
        total: 250,
        watchedCount: 0,
        unwatchedCount: 250,
        percentage: 0
      }
    }
  },

  computed: {
    displayMovies() {
      switch (this.currentTab) {
        case 'watched':
          return this.watchedMovies
        case 'unwatched':
          return this.unwatchedMovies
        case 'all':
        default:
          return this.allMovies
      }
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
        const movieStatus = uni.getStorageSync('movie_status') || {}
        const watchedIds = Object.entries(movieStatus)
          .filter(([id, data]) => data.status === 'watched')
          .map(([id]) => parseInt(id))

        // 3. 获取观影统计
        this.stats = doubanMapping.getWatchStats(watchedIds)

        // 4. 获取已看电影详情（带豆瓣排名信息）
        const watchedTop250 = doubanMapping.getWatchedTop250(watchedIds)
        this.watchedMovies = await this.fetchMovieDetails(watchedTop250, true)

        // 5. 获取未看电影列表
        const unwatchedTop250 = doubanMapping.getUnwatchedTop250(watchedIds)
        this.unwatchedMovies = await this.fetchMovieDetails(unwatchedTop250.slice(0, 20), false)

        // 6. 合并全部列表
        this.allMovies = [...this.watchedMovies, ...this.unwatchedMovies]
          .sort((a, b) => a.doubanRank - b.doubanRank)

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

    /**
     * 获取电影详情
     */
    async fetchMovieDetails(doubanMovies, isWatched) {
      if (!doubanMovies || doubanMovies.length === 0) return []

      const movies = []

      for (const doubanMovie of doubanMovies) {
        try {
          // 从TMDB获取电影详情
          const tmdbDetail = await tmdbApi.getMovieDetails(doubanMovie.tmdbId)

          if (tmdbDetail) {
            movies.push({
              ...doubanMovie,
              poster: tmdbDetail.poster,
              isWatched,
              tmdbRating: tmdbDetail.rating
            })
          }
        } catch (error) {
          console.error(`[DoubanTop250] 获取电影详情失败: ${doubanMovie.title}`, error)
          // 即使获取失败也显示豆瓣基本信息
          movies.push({
            ...doubanMovie,
            poster: '',
            isWatched
          })
        }
      }

      return movies
    },

    switchTab(tab) {
      this.currentTab = tab
    },

    goToMovieDetail(movie) {
      if (!movie.isWatched) {
        uni.showToast({
          title: '标记为已看后可查看详情',
          icon: 'none'
        })
        return
      }

      uni.navigateTo({
        url: `/pages/movie-detail/movie-detail?id=${movie.tmdbId}`
      })
    },

    loadMore() {
      // 分页加载更多未看电影
      if (this.currentTab === 'unwatched') {
        // TODO: 实现分页加载
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 统计头部 */
.stats-header {
  padding: 30rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 40rpx;
  text-align: center;
}

.stats-title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
  display: block;
}

.stats-numbers {
  display: flex;
  justify-content: center;
  align-items: baseline;
  margin-bottom: 20rpx;
}

.stats-watched {
  font-size: 72rpx;
  font-weight: bold;
  color: #667eea;
}

.stats-separator {
  font-size: 48rpx;
  color: #999;
  margin: 0 10rpx;
}

.stats-total {
  font-size: 48rpx;
  color: #666;
}

.progress-bar {
  height: 16rpx;
  background: #e0e0e0;
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 8rpx;
  transition: width 0.5s ease;
}

.stats-percentage {
  font-size: 24rpx;
  color: #999;
}

/* 标签栏 */
.tab-bar {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 30rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;

  &.active {
    color: #667eea;
    font-weight: bold;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 60rpx;
      height: 4rpx;
      background: #667eea;
      border-radius: 2rpx;
    }
  }
}

/* 海报墙 */
.poster-wall {
  height: calc(100vh - 400rpx);
  padding: 20rpx;
}

.poster-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.poster-item {
  width: calc(33.333% - 14rpx);
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
  position: relative;

  &.unwatched {
    opacity: 0.7;
  }
}

.rank-badge {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  width: 48rpx;
  height: 48rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;

  text {
    color: #fff;
    font-size: 24rpx;
    font-weight: bold;
  }

  &.top10 {
    background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
  }
}

.poster-image {
  width: 100%;
  height: 280rpx;
  background: #f0f0f0;
}

.unwatched-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 80rpx;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-icon {
  font-size: 48rpx;
}

.movie-info {
  padding: 16rpx;
}

.movie-title {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8rpx;
}

.movie-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.movie-year {
  font-size: 22rpx;
  color: #999;
}

.movie-rating {
  font-size: 22rpx;
  color: #ff9800;
  font-weight: bold;
}

/* 加载状态 */
.loading {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 28rpx;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 100rpx 40rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #999;
  display: block;
  margin-bottom: 20rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #bbb;
}
</style>
