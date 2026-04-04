<template>
  <view class="movie-page">
    <!-- 无 API Key 状态 -->
    <view v-if="!hasApiKey" class="no-api-key">
      <van-empty description="请先配置 TMDB API Key">
        <van-button type="primary" @click="goToSettings">
          前往设置
        </van-button>
      </van-empty>
    </view>

    <!-- 主内容 -->
    <van-tabs v-else v-model:active="activeTab" swipeable sticky @change="onTabChange">
      <van-tab name="hot" title="热门电影">
        <view class="tab-content">
          <!-- 加载状态 -->
          <view v-if="loading.hot" class="loading-wrapper">
            <van-loading size="24px">加载中...</van-loading>
          </view>
          <!-- 错误状态 -->
          <view v-else-if="error.hot" class="error-wrapper">
            <van-empty description="加载失败">
              <van-button type="primary" size="small" @click="fetchPopularMovies">重试</van-button>
            </van-empty>
          </view>
          <!-- 空状态 -->
          <view v-else-if="hotMovies.length === 0" class="empty-wrapper">
            <van-empty description="暂无数据" />
          </view>
          <!-- 电影列表 -->
          <view v-else class="movie-list">
            <view
              v-for="(movie, index) in hotMovies"
              :key="movie.id || index"
              class="movie-item"
              @click="goToMovieDetail(movie)"
            >
              <image :src="movie.poster" mode="aspectFill" class="movie-poster-h" />
              <view class="movie-item-content">
                <text class="movie-item-title">{{ movie.title }}</text>
                <view class="movie-item-meta">
                  <text class="movie-item-rating">
                    <van-icon name="star" size="12" color="#ff976a" />
                    {{ movie.rating }}
                  </text>
                  <text class="movie-item-genre">{{ movie.genre }}</text>
                  <text class="movie-item-year">{{ movie.year }}</text>
                </view>
                <text class="movie-item-summary">{{ movie.summary || '暂无简介' }}</text>
              </view>
            </view>
          </view>
          <!-- 加载更多 -->
          <view v-if="hotMovies.length > 0 && hasMore.hot" class="load-more">
            <van-button type="default" size="small" @click="loadMoreHot" :loading="loadingMore.hot">
              加载更多
            </van-button>
          </view>
        </view>
      </van-tab>

      <van-tab name="find" title="找电影">
        <view class="tab-content">
          <!-- 搜索框 -->
          <view class="search-box">
            <van-search
              v-model="searchValue"
              placeholder="搜索电影名称"
              shape="round"
              @search="onSearch"
              @clear="onClearSearch"
            />
          </view>

          <!-- 筛选条件 -->
          <view class="filter-section">
            <view class="filter-title">类型筛选</view>
            <view class="filter-tags">
              <van-tag
                v-for="(type, index) in movieTypes"
                :key="index"
                :type="selectedType === type ? 'primary' : 'plain'"
                class="filter-tag"
                @click="selectType(type)"
              >
                {{ type }}
              </van-tag>
            </view>
          </view>

          <!-- 加载状态 -->
          <view v-if="loading.find" class="loading-wrapper">
            <van-loading size="24px">搜索中...</van-loading>
          </view>
          <!-- 错误状态 -->
          <view v-else-if="error.find" class="error-wrapper">
            <van-empty description="搜索失败">
              <van-button type="primary" size="small" @click="searchMovies">重试</van-button>
            </van-empty>
          </view>
          <!-- 空状态 -->
          <view v-else-if="findMovies.length === 0 && hasSearched" class="empty-wrapper">
            <van-empty description="未找到相关电影" />
          </view>
          <!-- 初始提示 -->
          <view v-else-if="findMovies.length === 0 && !hasSearched" class="empty-wrapper">
            <van-empty description="输入关键词搜索电影" />
          </view>
          <!-- 电影列表 -->
          <view v-else class="movie-list">
            <view
              v-for="(movie, index) in findMovies"
              :key="movie.id || index"
              class="movie-item"
              @click="goToMovieDetail(movie)"
            >
              <image :src="movie.poster" mode="aspectFill" class="movie-poster-h" />
              <view class="movie-item-content">
                <text class="movie-item-title">{{ movie.title }}</text>
                <view class="movie-item-meta">
                  <text class="movie-item-rating">
                    <van-icon name="star" size="12" color="#ff976a" />
                    {{ movie.rating }}
                  </text>
                  <text class="movie-item-genre">{{ movie.genre }}</text>
                  <text class="movie-item-year">{{ movie.year }}</text>
                </view>
                <text class="movie-item-summary">{{ movie.summary || '暂无简介' }}</text>
              </view>
            </view>
          </view>
        </view>
      </van-tab>

      <van-tab name="top250" title="Top250">
        <view class="tab-content">
          <!-- Top250 排行榜头部 -->
          <view class="top250-header">
            <view class="ranking-title">
              <van-icon name="medal" size="20" color="#ffd700" />
              <text>高分电影榜单</text>
            </view>
            <text class="ranking-desc">来自 TMDB 的经典高分电影</text>
          </view>

          <!-- 加载状态 -->
          <view v-if="loading.top250" class="loading-wrapper">
            <van-loading size="24px">加载中...</van-loading>
          </view>
          <!-- 错误状态 -->
          <view v-else-if="error.top250" class="error-wrapper">
            <van-empty description="加载失败">
              <van-button type="primary" size="small" @click="fetchTopRatedMovies">重试</van-button>
            </van-empty>
          </view>
          <!-- 空状态 -->
          <view v-else-if="top250Movies.length === 0" class="empty-wrapper">
            <van-empty description="暂无数据" />
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
                    <van-icon name="star" size="14" color="#ff976a" />
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
            <van-button type="default" size="small" @click="loadMoreTop250" :loading="loadingMore.top250">
              加载更多
            </van-button>
          </view>
        </view>
      </van-tab>
    </van-tabs>

    <!-- 电影详情弹窗 -->
    <van-popup
      v-model:show="showDetailPopup"
      position="bottom"
      round
      :style="{ height: '80%'}"
    >
      <view class="movie-detail-popup">
        <!-- 头部 -->
        <view class="detail-header">
          <image :src="selectedMovie.poster" class="detail-poster" mode="aspectFill" />
          <view class="detail-info">
            <text class="detail-title">{{ selectedMovie.title }}</text>
            <view class="detail-meta">
              <text class="detail-rating">
                <van-icon name="star" size="14" color="#ff976a" />
                {{ selectedMovie.rating }}
              </text>
              <text class="detail-year">{{ selectedMovie.year }}</text>
              <text class="detail-genre">{{ selectedMovie.genre }}</text>
            </view>
          </view>
          <van-icon name="cross" size="24" @click="closeDetailPopup" class="close-icon" />
        </view>

        <!-- 当前状态 -->
        <view class="current-status">
          <text class="status-label">当前状态：</text>
          <van-tag :type="getStatusTagType(movieCurrentStatus)" size="large">
            {{ getStatusText(movieCurrentStatus) }}
          </van-tag>
        </view>

        <!-- 操作按钮 -->
        <view class="action-section">
          <van-button
            :type="movieCurrentStatus === 'want' ? 'primary' : 'default'"
            size="small"
            class="action-btn"
            @click="toggleWantToWatch"
          >
            <van-icon :name="movieCurrentStatus === 'want' ? 'like' : 'like-o'" />
            {{ movieCurrentStatus === 'want' ? '已想看' : '想看' }}
          </van-button>

          <van-button
            :type="movieCurrentStatus === 'planned' ? 'primary' : 'default'"
            size="small"
            class="action-btn"
            @click="showCalendarPicker = true"
          >
            <van-icon name="calendar-o" />
            {{ movieCurrentStatus === 'planned' ? '已添加日历' : '添加日历' }}
          </van-button>

          <van-button
            :type="movieCurrentStatus === 'watched' ? 'primary' : 'default'"
            size="small"
            class="action-btn"
            @click="markAsWatched"
          >
            <van-icon :name="movieCurrentStatus === 'watched' ? 'passed' : 'circle'" />
            {{ movieCurrentStatus === 'watched' ? '已看过' : '标记已看' }}
          </van-button>
        </view>

        <!-- 评分和评价（已看状态显示） -->
        <view v-if="movieCurrentStatus === 'watched'" class="review-section">
          <view class="rating-row">
            <text class="label">我的评分：</text>
            <van-rate v-model="userRating" :count="5" allow-half @change="saveRating" />
            <text class="rating-value">{{ userRating }} 分</text>
          </view>
          <van-field
            v-model="userReview"
            type="textarea"
            placeholder="写下你的观影感受..."
            rows="3"
            show-word-limit
            maxlength="200"
            @blur="saveReview"
          />
        </view>

        <!-- 电影简介 -->
        <view class="summary-section">
          <text class="section-title">剧情简介</text>
          <text class="summary-text">{{ selectedMovie.summary || '暂无简介' }}</text>
        </view>
      </view>
    </van-popup>

    <!-- 日历选择器 -->
    <van-calendar
      :show="showCalendarPicker"
      :show-title="true"
      :poppable="true"
      :min-date="minCalendarDate"
      @confirm="onCalendarConfirm"
      @close="showCalendarPicker = false"
    />

    <!-- Toast 组件 -->
    <van-toast id="van-toast" />
  </view>
</template>

<script>
import tmdbApi from '@/utils/tmdb.js'
import storage, { MOVIE_STATUS } from '@/utils/storage.js'
import { showToast, showSuccessToast } from 'vant'
import zIndex from 'uview-ui/libs/config/zIndex';

export default {
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
      },

      // 电影详情弹窗
      showDetailPopup: false,
      showCalendarPicker: false,
      selectedMovie: {},
      movieCurrentStatus: MOVIE_STATUS.UNWATCHED,
      userRating: 0,
      userReview: '',
      minCalendarDate: new Date()
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
        showToast(err.message || '加载失败')
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
        showToast(err.message || '加载失败')
      } finally {
        this.loadingMore.top250 = false
      }
    },

    // ========== 通用方法 ==========

    goToMovieDetail(movie) {
      this.selectedMovie = movie
      this.loadMovieStatus(movie.id)
      this.showDetailPopup = true
    },

    getRankingClass(index) {
      if (index === 0) return 'gold'
      if (index === 1) return 'silver'
      if (index === 2) return 'bronze'
      return ''
    },

    // ========== 电影状态管理 ==========

    loadMovieStatus(movieId) {
      const statusData = storage.getMovieStatus(movieId)
      this.movieCurrentStatus = statusData.status
      this.userRating = statusData.rating || 0
      this.userReview = statusData.review || ''
    },

    closeDetailPopup() {
      this.showDetailPopup = false
    },

    toggleWantToWatch() {
      const movieId = this.selectedMovie.id
      if (this.movieCurrentStatus === MOVIE_STATUS.WANT_TO_WATCH) {
        storage.removeMovieStatus(movieId)
        this.movieCurrentStatus = MOVIE_STATUS.UNWATCHED
        showSuccessToast('已取消')
      } else {
        storage.markAsWant(movieId, {
          title: this.selectedMovie.title,
          poster: this.selectedMovie.poster,
          year: this.selectedMovie.year
        })
        this.movieCurrentStatus = MOVIE_STATUS.WANT_TO_WATCH
        showSuccessToast('已添加想看')
      }
    },

    onCalendarConfirm(date) {
      const dateStr = this.formatDate(date)
      const result = storage.addCalendarEvent(dateStr, {
        movieId: this.selectedMovie.id,
        title: this.selectedMovie.title,
        poster: this.selectedMovie.poster,
        rating: this.selectedMovie.rating
      })

      if (result.success) {
        this.movieCurrentStatus = MOVIE_STATUS.PLANNED
        showSuccessToast(`已添加到 ${dateStr}`)
      } else {
        showToast(result.message)
      }

      this.showCalendarPicker = false
    },

    markAsWatched() {
      if (this.movieCurrentStatus === MOVIE_STATUS.WATCHED) {
        return
      }

      uni.showModal({
        title: '确认标记',
        content: `确定将「${this.selectedMovie.title}」标记为已看？`,
        success: (res) => {
          if (res.confirm) {
            storage.markAsWatched(this.selectedMovie.id, {
              title: this.selectedMovie.title,
              poster: this.selectedMovie.poster,
              year: this.selectedMovie.year
            })
            this.movieCurrentStatus = MOVIE_STATUS.WATCHED
            this.userRating = 0
            this.userReview = ''
            showSuccessToast('已标记为已看')
          }
        }
      })
    },

    saveRating(value) {
      storage.setMovieStatus(this.selectedMovie.id, this.movieCurrentStatus, {
        rating: value
      })
    },

    saveReview() {
      storage.setMovieStatus(this.selectedMovie.id, this.movieCurrentStatus, {
        review: this.userReview
      })
    },

    getStatusTagType(status) {
      const map = {
        [MOVIE_STATUS.UNWATCHED]: 'default',
        [MOVIE_STATUS.WANT_TO_WATCH]: 'warning',
        [MOVIE_STATUS.PLANNED]: 'primary',
        [MOVIE_STATUS.WATCHED]: 'success'
      }
      return map[status] || 'default'
    },

    getStatusText(status) {
      const map = {
        [MOVIE_STATUS.UNWATCHED]: '未看',
        [MOVIE_STATUS.WANT_TO_WATCH]: '想看',
        [MOVIE_STATUS.PLANNED]: '待看',
        [MOVIE_STATUS.WATCHED]: '已看'
      }
      return map[status] || '未看'
    },

    formatDate(date) {
      const d = new Date(date)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  }
}
</script>

<style>
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

.tab-content {
  min-height: calc(100vh - 100px);
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

/* 热门电影列表布局 */
.movie-list {
  padding: 12px;
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

.movie-poster-h {
  width: 100px;
  height: 150px;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.movie-item-content {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.movie-item-title {
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

.movie-item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  margin-bottom: 8px;
}

.movie-item-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ff976a;
  font-weight: 600;
}

.movie-item-genre {
  color: #999;
  font-size: 12px;
}

.movie-item-year {
  color: #999;
  font-size: 12px;
}

.movie-item-summary {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 找电影页面样式 */
.search-box {
  padding: 12px;
  background: #fff;
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
  margin-right: 8px;
  margin-bottom: 8px;
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

/* 电影详情弹窗样式 */
.movie-detail-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 16px 16px;
}

.detail-header {
  display: flex;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.detail-poster {
  width: 100px;
  height: 150px;
  border-radius: 8px;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.detail-info {
  flex: 1;
  padding-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.detail-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.4;
}

.detail-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ff976a;
  font-weight: 500;
}

.detail-year {
  color: #999;
  font-size: 13px;
}

.detail-genre {
  color: #999;
  font-size: 13px;
}

.close-icon {
  position: absolute;
  right: 0;
  top: 16px;
  color: #999;
}

.current-status {
  display: flex;
  align-items: center;
  padding: 16px 0;
  gap: 8px;
}

.status-label {
  font-size: 14px;
  color: #666;
}

.action-section {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.review-section {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.rating-row .label {
  font-size: 14px;
  color: #666;
}

.rating-value {
  font-size: 14px;
  color: #ff976a;
  font-weight: 500;
}

.summary-section {
  padding: 16px 0;
  flex: 1;
  overflow-y: auto;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
  display: block;
}

.summary-text {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
}
</style>
