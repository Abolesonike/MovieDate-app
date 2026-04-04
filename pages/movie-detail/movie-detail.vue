<template>
  <view class="movie-detail-page">
    <!-- 电影头部信息 -->
    <view class="movie-header">
      <image :src="movie.poster" class="header-poster" mode="aspectFill" />
      <view class="header-info">
        <text class="header-title">{{ movie.title }}</text>
        <view class="header-meta">
          <text class="header-rating">
            <van-icon name="star" size="14" color="#ff976a" />
            {{ movie.rating }}
          </text>
          <text class="header-year">{{ movie.year }}</text>
          <text class="header-genre">{{ movie.genre }}</text>
        </view>
      </view>
    </view>

    <!-- 当前状态 -->
    <view class="status-section">
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
      <text class="summary-text">{{ movie.summary || '暂无简介' }}</text>
    </view>

    <!-- 日历选择器 -->
    <van-calendar
      :show="showCalendarPicker"
      :show-title="true"
      :poppable="true"
      :min-date="minCalendarDate"
      @confirm="onCalendarConfirm"
      @close="showCalendarPicker = false"
    />
  </view>
</template>

<script>
import tmdbApi from '@/utils/tmdb.js'
import storage, { MOVIE_STATUS } from '@/utils/storage.js'
import { showToast, showSuccessToast } from 'vant'

export default {
  data() {
    return {
      movie: {
        id: '',
        title: '',
        poster: '',
        rating: 0,
        year: '',
        genre: '',
        summary: ''
      },
      movieCurrentStatus: MOVIE_STATUS.UNWATCHED,
      userRating: 0,
      userReview: '',
      showCalendarPicker: false,
      minCalendarDate: new Date()
    }
  },
  onLoad(options) {
    // 从路由参数获取 movieId
    let movieId = null

    if (options.movieId) {
      movieId = options.movieId
    } else if (options.movieData) {
      try {
        const data = JSON.parse(decodeURIComponent(options.movieData))
        movieId = data.movieId || data.id
      } catch (e) {
        console.error('解析电影数据失败', e)
      }
    }

    if (movieId) {
      // 始终从 TMDB API 获取完整电影信息
      this.loadMovieDetail(movieId)
      // 加载电影状态（评分、评价等）
      this.loadMovieStatus(movieId)
    }
  },
  onShow() {
    // 每次显示时重新加载状态（因为可能从其他页面返回）
    if (this.movie.id) {
      this.loadMovieStatus(this.movie.id)
    }
  },
  methods: {
    async loadMovieDetail(movieId) {
      try {
        const result = await tmdbApi.getMovieDetails(movieId)
        this.movie = {
          id: result.id,
          title: result.title,
          poster: result.poster || '',
          rating: result.rating,
          year: result.year,
          genre: result.genre,
          summary: result.summary
        }
      } catch (err) {
        showToast('加载电影详情失败')
        console.error(err)
      }
    },

    loadMovieStatus(movieId) {
      const statusData = storage.getMovieStatus(movieId)
      this.movieCurrentStatus = statusData.status
      this.userRating = statusData.rating || 0
      this.userReview = statusData.review || ''
    },

    toggleWantToWatch() {
      const movieId = this.movie.id
      if (this.movieCurrentStatus === MOVIE_STATUS.WANT_TO_WATCH) {
        storage.removeMovieStatus(movieId)
        this.movieCurrentStatus = MOVIE_STATUS.UNWATCHED
        showSuccessToast('已取消')
      } else {
        storage.markAsWant(movieId, {
          title: this.movie.title,
          poster: this.movie.poster,
          year: this.movie.year
        })
        this.movieCurrentStatus = MOVIE_STATUS.WANT_TO_WATCH
        showSuccessToast('已添加想看')
      }
    },

    onCalendarConfirm(date) {
      const dateStr = this.formatDate(date)
      const result = storage.addCalendarEvent(dateStr, {
        movieId: this.movie.id,
        title: this.movie.title,
        poster: this.movie.poster,
        rating: this.movie.rating
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
        content: `确定将「${this.movie.title}」标记为已看？`,
        success: (res) => {
          if (res.confirm) {
            storage.markAsWatched(this.movie.id, {
              title: this.movie.title,
              poster: this.movie.poster,
              year: this.movie.year
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
      storage.setMovieStatus(this.movie.id, this.movieCurrentStatus, {
        rating: value
      })
    },

    saveReview() {
      storage.setMovieStatus(this.movie.id, this.movieCurrentStatus, {
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

<style scoped>
.movie-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 16px;
}

/* 头部样式 */
.movie-header {
  display: flex;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-poster {
  width: 100px;
  height: 150px;
  border-radius: 8px;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  padding-left: 12px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.header-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.4;
}

.header-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.header-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ff976a;
  font-weight: 500;
}

.header-year {
  color: #999;
  font-size: 13px;
}

.header-genre {
  color: #999;
  font-size: 13px;
}

/* 状态区域 */
.status-section {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  gap: 8px;
}

.status-label {
  font-size: 14px;
  color: #666;
}

/* 操作按钮 */
.action-section {
  display: flex;
  gap: 10px;
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

/* 评价区域 */
.review-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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

/* 简介区域 */
.summary-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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
