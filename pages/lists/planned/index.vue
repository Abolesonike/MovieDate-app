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
      <text class="empty-title">暂无待看电影</text>
      <text class="empty-desc">将电影添加到日历来安排观看计划</text>
      <button class="empty-btn" @click="goToMoviePage">去发现</button>
    </view>

    <!-- 电影列表 -->
    <scroll-view v-else class="movie-list" scroll-y enable-flex @scrolltolower="loadMore">
      <movie-card-horizontal
        v-for="movie in movieList"
        :key="movie.id"
        :movie="movie"
        :show-status="false"
        @click="goToDetail(movie)"
      >
        <template #extra>
          <view class="planned-section" v-if="movie.plannedDate">
            <text class="planned-label">计划观看</text>
            <text class="planned-date">{{ movie.plannedDate }}</text>
          </view>
        </template>
      </movie-card-horizontal>

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
import MovieCardHorizontal from '@/components/movie-card/movie-card-horizontal.vue'

export default {
  components: {
    MovieCardHorizontal
  },
  data() {
    return {
      isLoading: true,
      loadingMore: false,
      hasMore: true,
      currentPage: 1,
      pageSize: 10,
      movieList: [],
      plannedData: []
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
        // 获取待看列表数据
        this.plannedData = storage.getPlannedList()

        if (this.plannedData.length === 0) {
          this.movieList = []
          this.hasMore = false
          return
        }

        // 加载第一页数据
        await this.loadMoviesByPage()
      } catch (error) {
        console.error('加载待看列表失败:', error)
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
      const pageData = this.plannedData.slice(start, end)

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
            plannedDate: item.timeline?.planned?.date
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

      this.hasMore = end < this.plannedData.length
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
        url: `/pages/movie/detail/index?movieId=${movie.id}`
      })
    },

    goToMoviePage() {
      uni.switchTab({
        url: '/pages/movie/index'
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

/* 计划观看区域 */
.planned-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.planned-label {
  font-size: 12px;
  color: #667eea;
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.planned-date {
  font-size: 12px;
  color: #666;
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