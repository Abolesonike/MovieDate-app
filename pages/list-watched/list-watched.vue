<template>
  <view class="list-page">
    <!-- 加载状态 -->
    <view v-if="isLoading" class="loading-container">
      <text class="loading-spinner">⏳</text>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="movieList.length === 0" class="empty-container">
      <text class="empty-icon">🎬</text>
      <text class="empty-title">暂无已看电影</text>
      <text class="empty-desc">看完电影后来记录一下吧</text>
      <button class="empty-btn" @click="goToMoviePage">去发现</button>
    </view>

    <!-- 电影列表 -->
    <scroll-view v-else class="movie-list" scroll-y enable-flex @scrolltolower="loadMore">
      <view
        v-for="movie in movieList"
        :key="movie.id"
        class="movie-item"
        @click="goToDetail(movie)"
      >
        <!-- 海报 -->
        <image :src="movie.poster" class="movie-poster" mode="aspectFill" />

        <!-- 内容 -->
        <view class="movie-content">
          <text class="movie-title">{{ movie.title }}</text>
          <view class="movie-meta">
            <text class="movie-rating">
              <text class="star-icon">⭐</text>
              {{ movie.rating }}
            </text>
            <text class="movie-genre">{{ movie.genre }}</text>
            <text class="movie-year">{{ movie.year }}</text>
          </view>
          <text class="movie-summary">{{ movie.summary || '暂无简介' }}</text>

          <!-- 用户评分和评价 -->
          <view class="user-review-section" v-if="movie.userRating || movie.userReview">
            <view class="user-rating" v-if="movie.userRating">
              <text class="rating-label">我的评分</text>
              <text class="rating-stars">{{ '⭐'.repeat(movie.userRating) }}</text>
            </view>
            <text v-if="movie.userReview" class="user-review-text">{{ movie.userReview }}</text>
            <text v-if="movie.watchedDate" class="watched-date">观看于 {{ movie.watchedDate }}</text>
          </view>
        </view>
      </view>

      <!-- 加载更多提示 -->
      <view v-if="loadingMore" class="load-more-tip">
        <text class="tip-text">加载中...</text>
      </view>
      <view v-else-if="!hasMore && movieList.length > 0" class="load-more-tip">
        <text class="tip-text">没有更多了</text>
      </view>
      <!-- 底部留白 -->
      <view class="list-footer"></view>
    </scroll-view>
  </view>
</template>

<script>
import tmdbApi from '@/utils/tmdb.js'
import storage from '@/utils/storage.js'

export default {
  data() {
    return {
      isLoading: true,
      loadingMore: false,
      hasMore: true,
      currentPage: 1,
      pageSize: 10,
      movieList: [],
      watchedData: []
    }
  },
  onLoad() {
    this.loadData()
  },
  onShow() {
    // 返回页面时刷新数据
    this.loadData()
  },
  onPullDownRefresh() {
    this.loadData().finally(() => {
      uni.stopPullDownRefresh()
    })
  },
  methods: {
    async loadData() {
      this.isLoading = true
      this.currentPage = 1
      this.hasMore = true

      try {
        // 获取已看列表数据
        this.watchedData = storage.getWatchedList()

        if (this.watchedData.length === 0) {
          this.movieList = []
          this.hasMore = false
          return
        }

        // 加载第一页数据
        await this.loadMoviesByPage()
      } catch (error) {
        console.error('加载已看列表失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.isLoading = false
      }
    },

    async loadMoviesByPage() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      const pageData = this.watchedData.slice(start, end)

      if (pageData.length === 0) {
        this.hasMore = false
        return
      }

      // 获取每部电影的详细信息
      const moviePromises = pageData.map(async (item) => {
        try {
          const movieDetails = await tmdbApi.getMovieDetails(item.movieId)
          return {
            ...movieDetails,
            userRating: item.timeline?.watched?.rating,
            userReview: item.timeline?.watched?.review,
            watchedDate: item.timeline?.watched?.date
          }
        } catch (error) {
          console.error(`获取电影 ${item.movieId} 详情失败:`, error)
          return null
        }
      })

      const movies = await Promise.all(moviePromises)
      const validMovies = movies.filter(m => m !== null)

      if (this.currentPage === 1) {
        this.movieList = validMovies
      } else {
        this.movieList = [...this.movieList, ...validMovies]
      }

      this.hasMore = end < this.watchedData.length
    },

    async loadMore() {
      if (this.loadingMore || !this.hasMore) return

      this.loadingMore = true
      this.currentPage++

      try {
        await this.loadMoviesByPage()
      } catch (error) {
        console.error('加载更多失败:', error)
        this.currentPage--
      } finally {
        this.loadingMore = false
      }
    },

    goToDetail(movie) {
      uni.navigateTo({
        url: `/pages/movie-detail/movie-detail?movieId=${movie.id}`
      })
    },

    goToMoviePage() {
      uni.switchTab({
        url: '/pages/movie/movie'
      })
    }
  }
}
</script>

<style scoped>
.list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
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

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  color: #333;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: #999;
  margin-bottom: 24px;
}

.empty-btn {
  padding: 10px 32px;
  font-size: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 20px;
}

/* 电影列表 */
.movie-list {
  padding: 12px;
  height: 100vh;
  box-sizing: border-box;
}

.movie-item {
  display: flex;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.movie-item:active {
  transform: scale(0.98);
}

.movie-poster {
  width: 100px;
  height: 150px;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.movie-content {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.movie-title {
  font-size: 16px;
  color: #333;
  font-weight: 600;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.movie-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  margin-bottom: 8px;
}

.movie-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ff976a;
  font-weight: 600;
}

.star-icon {
  font-size: 12px;
}

.movie-genre,
.movie-year {
  color: #999;
}

.movie-summary {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 用户评价区域 */
.user-review-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.user-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.rating-label {
  font-size: 12px;
  color: #999;
}

.rating-stars {
  font-size: 12px;
}

.user-review-text {
  font-size: 13px;
  color: #333;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.watched-date {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.list-footer {
  height: 20px;
}

/* 加载更多提示 */
.load-more-tip {
  text-align: center;
  padding: 16px 0;
}

.tip-text {
  font-size: 13px;
  color: #999;
}
</style>
