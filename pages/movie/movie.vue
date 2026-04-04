<template>
  <view class="movie-page">
    <!-- 无 API Key 状态 -->
    <view v-if="!hasApiKey" class="no-api-key">
      <view class="empty-state">
        <text class="empty-text">请先配置 TMDB API Key</text>
        <button class="setting-btn" @click="goToSettings">
          前往设置
        </button>
      </view>
    </view>

    <!-- 主内容 -->
    <view v-else class="tabs-container">
      <!-- Tab 头部 -->
      <view class="tab-header">
        <view 
          :class="['tab-item', activeTab === 'hot' ? 'tab-active' : '']"
          @click="activeTab = 'hot'; onTabChange('hot')"
        >
          热门电影
        </view>
        <view 
          :class="['tab-item', activeTab === 'find' ? 'tab-active' : '']"
          @click="activeTab = 'find'; onTabChange('find')"
        >
          找电影
        </view>
        <view 
          :class="['tab-item', activeTab === 'top250' ? 'tab-active' : '']"
          @click="activeTab = 'top250'; onTabChange('top250')"
        >
          Top250
        </view>
      </view>

      <!-- Tab 内容区域 -->
      <scroll-view scroll-y class="tab-content-scroll">
        <!-- 热门电影 Tab -->
        <view v-if="activeTab === 'hot'" class="tab-content">
          <!-- 加载状态 -->
          <view v-if="loading.hot" class="loading-wrapper">
            <text class="loading-text">加载中...</text>
          </view>
          <!-- 错误状态 -->
          <view v-else-if="error.hot" class="error-wrapper">
            <view class="empty-state">
              <text class="empty-text">加载失败</text>
              <button class="retry-btn" @click="fetchPopularMovies">重试</button>
            </view>
          </view>
          <!-- 空状态 -->
          <view v-else-if="hotMovies.length === 0" class="empty-wrapper">
            <view class="empty-state">
              <text class="empty-text">暂无数据</text>
            </view>
          </view>
          <!-- 电影列表 -->
          <view v-else class="movie-list">
            <movie-card
              v-for="(movie, index) in hotMovies"
              :key="movie.id || index"
              :movie="getMovieWithStatus(movie)"
              variant="horizontal"
              @click="goToMovieDetail(movie)"
            />
          </view>
          <!-- 加载更多 -->
          <view v-if="hotMovies.length > 0 && hasMore.hot" class="load-more">
            <button class="load-more-btn" :disabled="loadingMore.hot" @click="loadMoreHot">
              {{ loadingMore.hot ? '加载中...' : '加载更多' }}
            </button>
          </view>
        </view>

        <!-- 找电影 Tab -->
        <view v-if="activeTab === 'find'" class="tab-content">
          <!-- 搜索框 -->
          <view class="search-box">
            <view class="search-input-wrapper">
              <input
                v-model="searchValue"
                class="search-input"
                placeholder="搜索电影名称"
                @confirm="onSearch"
              />
              <text v-if="searchValue" class="clear-icon" @click="onClearSearch">✕</text>
            </view>
          </view>

          <!-- 筛选条件 -->
          <view class="filter-section">
            <view class="filter-title">类型筛选</view>
            <view class="filter-tags">
              <view
                v-for="(type, index) in movieTypes"
                :key="index"
                :class="['filter-tag', selectedType === type ? 'filter-tag-active' : '']"
                @click="selectType(type)"
              >
                {{ type }}
              </view>
            </view>
          </view>

          <!-- 加载状态 -->
          <view v-if="loading.find" class="loading-wrapper">
            <text class="loading-text">搜索中...</text>
          </view>
          <!-- 错误状态 -->
          <view v-else-if="error.find" class="error-wrapper">
            <view class="empty-state">
              <text class="empty-text">搜索失败</text>
              <button class="retry-btn" @click="searchMovies">重试</button>
            </view>
          </view>
          <!-- 空状态 -->
          <view v-else-if="findMovies.length === 0 && hasSearched" class="empty-wrapper">
            <view class="empty-state">
              <text class="empty-text">未找到相关电影</text>
            </view>
          </view>
          <!-- 初始提示 -->
          <view v-else-if="findMovies.length === 0 && !hasSearched" class="empty-wrapper">
            <view class="empty-state">
              <text class="empty-text">输入关键词搜索电影</text>
            </view>
          </view>
          <!-- 电影列表 -->
          <view v-else class="movie-list">
            <movie-card
              v-for="(movie, index) in findMovies"
              :key="movie.id || index"
              :movie="getMovieWithStatus(movie)"
              variant="horizontal"
              @click="goToMovieDetail(movie)"
            />
          </view>
        </view>

        <!-- Top250 Tab -->
        <view v-if="activeTab === 'top250'" class="tab-content">
          <!-- Top250 排行榜头部 -->
          <view class="top250-header">
            <view class="ranking-title">
              <text class="medal-icon">🏅</text>
              <text>高分电影榜单</text>
            </view>
            <text class="ranking-desc">来自 TMDB 的经典高分电影</text>
          </view>

          <!-- 加载状态 -->
          <view v-if="loading.top250" class="loading-wrapper">
            <text class="loading-text">加载中...</text>
          </view>
          <!-- 错误状态 -->
          <view v-else-if="error.top250" class="error-wrapper">
            <view class="empty-state">
              <text class="empty-text">加载失败</text>
              <button class="retry-btn" @click="fetchTopRatedMovies">重试</button>
            </view>
          </view>
          <!-- 空状态 -->
          <view v-else-if="top250Movies.length === 0" class="empty-wrapper">
            <view class="empty-state">
              <text class="empty-text">暂无数据</text>
            </view>
          </view>
          <!-- Top250 列表 -->
          <view v-else class="top250-list">
            <view
              v-for="(movie, index) in top250Movies"
              :key="movie.id || index"
              class="top250-item"
              @click="goToMovieDetail(movie)"
            >
              <view class="ranking-number" :class="getRankingClass(index)">
                {{ index + 1 }}
              </view>
              <image :src="movie.poster" mode="aspectFill" class="top250-poster" />
              <view class="top250-detail">
                <text class="top250-title">{{ movie.title }}</text>
                <view class="top250-meta">
                  <text class="top250-rating">
                    <text class="star-icon">⭐</text>
                    {{ movie.rating }}
                  </text>
                  <text class="top250-genre">{{ movie.genre }}</text>
                  <text class="top250-year">{{ movie.year }}</text>
                </view>
                <text class="top250-summary">{{ movie.summary }}</text>
              </view>
            </view>
          </view>
          <!-- 加载更多 -->
          <view v-if="top250Movies.length > 0 && hasMore.top250" class="load-more">
            <button class="load-more-btn" :disabled="loadingMore.top250" @click="loadMoreTop250">
              {{ loadingMore.top250 ? '加载中...' : '加载更多' }}
            </button>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import tmdbApi from '@/utils/tmdb.js'
import storage, { MOVIE_STATUS } from '@/utils/storage.js'
import MovieCard from '@/components/movie-card/movie-card.vue'

export default {
  components: {
    MovieCard
  },
  data() {
    return {
      activeTab: 'hot',
      hasApiKey: false,

      // 搜索相关
      searchValue: '',
      selectedType: '全部',
      movieTypes: ['全部', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '剧情'],
      hasSearched: false,

      // 电影数据
      hotMovies: [],
      findMovies: [],
      top250Movies: [],

      // 加载状态
      loading: {
        hot: false,
        find: false,
        top250: false
      },
      loadingMore: {
        hot: false,
        top250: false
      },
      error: {
        hot: null,
        find: null,
        top250: null
      },

      // 分页
      currentPage: {
        hot: 1,
        top250: 1
      },
      hasMore: {
        hot: true,
        top250: true
      }
    }
  },
  onLoad() {
    this.checkApiKey()
  },
  onShow() {
    // 每次显示时检查 API Key 状态
    this.checkApiKey()
  },
  methods: {
    // 检查 API Key
    checkApiKey() {
      const hadApiKey = this.hasApiKey
      this.hasApiKey = tmdbApi.hasApiKey()

      // 如果 API Key 状态变化，重新加载数据
      if (this.hasApiKey && !hadApiKey) {
        this.fetchPopularMovies()
        this.fetchTopRatedMovies()
      }
    },

    // 前往设置页面
    goToSettings() {
      uni.switchTab({ url: '/pages/me/me' })
    },

    // Tab 切换
    onTabChange(name) {
      if (name === 'hot' && this.hotMovies.length === 0) {
        this.fetchPopularMovies()
      } else if (name === 'top250' && this.top250Movies.length === 0) {
        this.fetchTopRatedMovies()
      }
    },

    // ========== 热门电影 ==========

    async fetchPopularMovies() {
      this.loading.hot = true
      this.error.hot = null
      this.currentPage.hot = 1

      try {
        const result = await tmdbApi.getPopularMovies(1)
        this.hotMovies = result.movies
        this.hasMore.hot = result.page < result.totalPages
      } catch (err) {
        this.error.hot = err.message || '加载失败'
      } finally {
        this.loading.hot = false
      }
    },

    async loadMoreHot() {
      if (this.loadingMore.hot || !this.hasMore.hot) return

      this.loadingMore.hot = true
      this.currentPage.hot++

      try {
        const result = await tmdbApi.getPopularMovies(this.currentPage.hot)
        this.hotMovies = [...this.hotMovies, ...result.movies]
        this.hasMore.hot = result.page < result.totalPages
      } catch (err) {
        this.currentPage.hot--
        uni.showToast({ title: err.message || '加载失败', icon: 'none' })
      } finally {
        this.loadingMore.hot = false
      }
    },

    // ========== 搜索电影 ==========

    async searchMovies() {
      const query = this.searchValue.trim()
      const genreId = tmdbApi.getGenreId(this.selectedType)

      this.loading.find = true
      this.error.find = null
      this.hasSearched = true

      try {
        let result
        if (query) {
          // 关键词搜索
          result = await tmdbApi.searchMovies(query)
          // 如果选择了类型，再进行客户端过滤
          if (genreId && result.movies.length > 0) {
            const genreName = this.selectedType
            result.movies = result.movies.filter(m => m.genre.includes(genreName))
          }
        } else if (genreId) {
          // 仅按类型筛选
          result = await tmdbApi.discoverByGenre(genreId)
        } else {
          // 无搜索条件
          result = { movies: [] }
        }
        this.findMovies = result.movies
      } catch (err) {
        this.error.find = err.message || '搜索失败'
      } finally {
        this.loading.find = false
      }
    },

    selectType(type) {
      this.selectedType = type
      if (this.searchValue.trim() || type !== '全部') {
        this.searchMovies()
      }
    },

    onSearch() {
      this.searchMovies()
    },

    onClearSearch() {
      this.searchValue = ''
      this.findMovies = []
      this.hasSearched = false
    },

    // ========== Top250 ==========

    async fetchTopRatedMovies() {
      this.loading.top250 = true
      this.error.top250 = null
      this.currentPage.top250 = 1

      try {
        const result = await tmdbApi.getTopRatedMovies(1)
        this.top250Movies = result.movies
        this.hasMore.top250 = result.page < result.totalPages
      } catch (err) {
        this.error.top250 = err.message || '加载失败'
      } finally {
        this.loading.top250 = false
      }
    },

    async loadMoreTop250() {
      if (this.loadingMore.top250 || !this.hasMore.top250) return

      this.loadingMore.top250 = true
      this.currentPage.top250++

      try {
        const result = await tmdbApi.getTopRatedMovies(this.currentPage.top250)
        this.top250Movies = [...this.top250Movies, ...result.movies]
        this.hasMore.top250 = result.page < result.totalPages
      } catch (err) {
        this.currentPage.top250--
        uni.showToast({ title: err.message || '加载失败', icon: 'none' })
      } finally {
        this.loadingMore.top250 = false
      }
    },

    // ========== 通用方法 ==========

    goToMovieDetail(movie) {
      // 只传递 movieId，详情页从 TMDB API 获取完整信息
      uni.navigateTo({
        url: `/pages/movie-detail/movie-detail?movieId=${movie.id}`
      })
    },

    // 获取带状态的电影数据（用于 movie-card 显示状态标签）
    getMovieWithStatus(movie) {
      const statusData = storage.getMovieStatus(movie.id)
      return {
        ...movie,
        status: statusData.status || MOVIE_STATUS.UNWATCHED
      }
    },

    getRankingClass(index) {
      if (index === 0) return 'gold'
      if (index === 1) return 'silver'
      if (index === 2) return 'bronze'
      return ''
    }
  }
}
</script>

<style scoped>
.movie-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.no-api-key {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.empty-text {
  font-size: 14px;
  color: #999;
  display: block;
  margin-bottom: 16px;
}

.setting-btn,
.retry-btn {
  padding: 8px 20px;
  font-size: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 20px;
}

/* Tabs 容器 */
.tabs-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.tab-header {
  display: flex;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 15px;
  color: #666;
  position: relative;
  transition: all 0.3s;
}

.tab-active {
  color: #667eea;
  font-weight: 600;
}

.tab-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 3px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.tab-content-scroll {
  flex: 1;
  overflow-y: auto;
}

.tab-content {
  min-height: calc(100vh - 150px);
  padding-bottom: 20px;
}

.loading-wrapper,
.error-wrapper,
.empty-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.loading-text {
  font-size: 14px;
  color: #999;
}

/* 电影列表布局 */
.movie-list {
  padding: 12px;
}

/* 找电影页面样式 */
.search-box {
  padding: 12px;
  background: #fff;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 20px;
  padding: 8px 12px;
}

.search-input {
  flex: 1;
  font-size: 14px;
  border: none;
  outline: none;
  background: transparent;
}

.clear-icon {
  font-size: 16px;
  color: #999;
  margin-left: 8px;
  cursor: pointer;
}

.filter-section {
  background: #fff;
  padding: 12px;
  margin-bottom: 12px;
}

.filter-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  font-weight: 500;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  padding: 6px 12px;
  font-size: 13px;
  background: #f5f5f5;
  color: #666;
  border-radius: 16px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.filter-tag-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-color: #667eea;
}

/* Top250 排行榜样式 */
.top250-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 16px;
  margin-bottom: 12px;
  border-radius: 0 0 16px 16px;
}

.ranking-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 6px;
}

.medal-icon {
  font-size: 20px;
}

.ranking-desc {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}

.top250-list {
  padding: 0 12px;
}

.top250-item {
  display: flex;
  align-items: flex-start;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
}

.top250-item:active {
  transform: scale(0.98);
}

.ranking-number {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  color: #666;
  background: #f5f5f5;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}

.ranking-number.gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
}

.ranking-number.silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(192, 192, 192, 0.4);
}

.ranking-number.bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #e8a87c 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(205, 127, 50, 0.4);
}

.top250-poster {
  width: 80px;
  height: 110px;
  background-color: #f0f0f0;
  border-radius: 6px;
  flex-shrink: 0;
  margin-right: 12px;
}

.top250-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.top250-title {
  font-size: 15px;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.top250-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.top250-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ff976a;
  font-weight: 500;
}

.star-icon {
  font-size: 14px;
}

.top250-genre {
  color: #999;
}

.top250-year {
  color: #999;
}

.top250-summary {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 加载更多 */
.load-more {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.load-more-btn {
  padding: 8px 24px;
  font-size: 14px;
  background: #fff;
  color: #667eea;
  border: 1px solid #667eea;
  border-radius: 20px;
}

.load-more-btn:disabled {
  opacity: 0.6;
}
</style>
