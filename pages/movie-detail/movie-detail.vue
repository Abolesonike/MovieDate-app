<template>
  <view class="movie-detail-page">
    <!-- 电影头部信息 -->
    <view class="movie-header">
      <image :src="movie.poster" class="header-poster" mode="aspectFill" />
      <view class="header-info">
        <text class="header-title">{{ movie.title }}</text>
        <view class="header-meta">
          <text class="header-rating">
            <text class="star-icon">⭐</text>
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
      <view class="status-tag" :class="'tag-' + getStatusTagType(movieCurrentStatus)">
        {{ getStatusText(movieCurrentStatus) }}
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-section">
      <button
        :class="['action-btn', movieCurrentStatus === 'want' ? 'btn-primary' : 'btn-default']"
        @click="toggleWantToWatch"
      >
        <text class="btn-icon">{{ movieCurrentStatus === 'want' ? '👍' : '👍🏻' }}</text>
        {{ movieCurrentStatus === 'want' ? '已想看' : '想看' }}
      </button>

      <button
        :class="['action-btn', movieCurrentStatus === 'planned' ? 'btn-primary' : 'btn-default']"
        @click="openCalendarPicker"
      >
        <text class="btn-icon">📅</text>
        {{ movieCurrentStatus === 'planned' ? '已添加日历' : '添加日历' }}
      </button>

      <button
        :class="['action-btn', movieCurrentStatus === 'watched' ? 'btn-primary' : 'btn-default']"
        @click="markAsWatched"
      >
        <text class="btn-icon">{{ movieCurrentStatus === 'watched' ? '✓' : '○' }}</text>
        {{ movieCurrentStatus === 'watched' ? '已看过' : '标记已看' }}
      </button>
    </view>

    <!-- 评分和评价（已看状态显示） -->
    <view v-if="movieCurrentStatus === 'watched'" class="review-section">
      <view class="rating-row">
        <text class="label">我的评分：</text>
        <view class="rating-stars">
          <text 
            v-for="star in 5" 
            :key="star"
            class="star"
            :class="{ 'star-active': star <= userRating }"
            @click="setRating(star)"
          >
            ⭐
          </text>
        </view>
        <text class="rating-value">{{ userRating }} 分</text>
      </view>
      <textarea
        v-model="userReview"
        class="review-textarea"
        placeholder="写下你的观影感受..."
        :maxlength="200"
        @blur="saveReview"
      />
      <text class="word-count">{{ userReview.length }}/200</text>
    </view>

    <!-- 电影简介 -->
    <view class="summary-section">
      <text class="section-title">剧情简介</text>
      <text class="summary-text">{{ movie.summary || '暂无简介' }}</text>
    </view>

    <!-- 日历选择器 -->
    <view v-if="showCalendarPicker" class="calendar-mask" @click="showCalendarPicker = false">
      <view class="calendar-popup" @click.stop>
        <view class="calendar-header">
          <text class="calendar-title">{{ calendarPickerMode === 'watched' ? '选择观看日期' : '选择日期' }}</text>
          <text class="calendar-close" @click="showCalendarPicker = false">✕</text>
        </view>
        <picker mode="date" :value="selectedDate" :start="calendarPickerMode === 'planned' ? minDateStr : undefined" :end="calendarPickerMode === 'watched' ? maxDateStr : undefined" @change="onDateChange">
          <view class="date-picker">
            <text class="date-text">{{ selectedDate || '请选择日期' }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
         <button class="confirm-btn" @click="onPickerConfirm">确定</button>
      </view>
    </view>
  </view>
</template>

<script>
import tmdbApi from '@/utils/tmdb.js'
import storage, { MOVIE_STATUS } from '@/utils/storage.js'

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
      calendarPickerMode: 'planned', // 'planned' 或 'watched'
      selectedDate: '',
      minDateStr: '',
      maxDateStr: '',
      watchedDateStr: ''
    }
  },
  computed: {
    minCalendarDate() {
      return new Date()
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

    // 设置最小日期为今天
    const today = new Date()
    this.minDateStr = this.formatDate(today)
    this.selectedDate = this.minDateStr
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
        uni.showToast({ title: '加载电影详情失败', icon: 'none' })
        console.error(err)
      }
    },

    loadMovieStatus(movieId) {
      const statusData = storage.getMovieStatus(movieId)
      this.movieCurrentStatus = statusData.status
      // 从 watched 时间线中读取评分和评价
      const watchedData = statusData.timeline?.watched || {}
      this.userRating = watchedData.rating || 0
      this.userReview = watchedData.review || ''
    },

    toggleWantToWatch() {
      const movieId = this.movie.id
      if (this.movieCurrentStatus === MOVIE_STATUS.WANT_TO_WATCH) {
        storage.removeMovieStatus(movieId)
        this.movieCurrentStatus = MOVIE_STATUS.UNWATCHED
        uni.showToast({ title: '已取消', icon: 'success' })
      } else {
        storage.markAsWant(movieId)
        this.movieCurrentStatus = MOVIE_STATUS.WANT_TO_WATCH
        uni.showToast({ title: '已添加想看', icon: 'success' })
      }
    },

    onDateChange(e) {
      this.selectedDate = e.detail.value
    },

    onPickerConfirm() {
      if (this.calendarPickerMode === 'watched') {
        this.onWatchedDateConfirm()
      } else {
        this.onCalendarConfirm()
      }
    },

    onCalendarConfirm() {
      if (!this.selectedDate) {
        uni.showToast({ title: '请选择日期', icon: 'none' })
        return
      }

      const dateStr = this.selectedDate
      const result = storage.addCalendarEvent(dateStr, {
        movieId: this.movie.id,
        title: this.movie.title,
        poster: this.movie.poster,
        rating: this.movie.rating
      })

      if (result.success) {
        this.movieCurrentStatus = MOVIE_STATUS.PLANNED
        uni.showToast({ title: `已添加到 ${dateStr}`, icon: 'success' })
      } else {
        uni.showToast({ title: result.message, icon: 'none' })
      }

      this.showCalendarPicker = false
    },

    openCalendarPicker() {
      this.calendarPickerMode = 'planned'
      const today = new Date()
      this.minDateStr = this.formatDate(today)
      this.selectedDate = this.minDateStr
      this.showCalendarPicker = true
    },

    markAsWatched() {
      if (this.movieCurrentStatus === MOVIE_STATUS.WATCHED) {
        return
      }

      // 打开日期选择器，让用户选择观看日期
      this.calendarPickerMode = 'watched'
      // 对于标记已看，默认选中今天，但允许选择过去日期（补录）
      const today = new Date()
      this.watchedDateStr = this.formatDate(today)
      this.selectedDate = this.watchedDateStr
      // 标记已看时不限制最小日期，但限制最大日期为今天（不能选择未来）
      this.minDateStr = ''
      this.maxDateStr = this.watchedDateStr
      this.showCalendarPicker = true
    },

    onWatchedDateConfirm() {
      if (!this.selectedDate) {
        uni.showToast({ title: '请选择观看日期', icon: 'none' })
        return
      }

      const result = storage.markAsWatched(this.movie.id, {
        rating: this.userRating || undefined,
        review: this.userReview || undefined,
        date: this.selectedDate
      })

      if (result.success) {
        this.movieCurrentStatus = MOVIE_STATUS.WATCHED
        uni.showToast({ title: result.message, icon: 'success' })
      } else {
        uni.showToast({ title: '标记失败', icon: 'none' })
      }

      this.showCalendarPicker = false
    },

    setRating(value) {
      this.userRating = value
      if (this.movieCurrentStatus === MOVIE_STATUS.WATCHED) {
        storage.updateWatchedReview(this.movie.id, { rating: value })
      }
    },

    saveReview() {
      if (this.movieCurrentStatus === MOVIE_STATUS.WATCHED) {
        storage.updateWatchedReview(this.movie.id, { review: this.userReview })
      }
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

.star-icon {
  font-size: 14px;
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

.status-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.tag-default {
  background-color: #f5f5f5;
  color: #666;
  border: 1px solid #e0e0e0;
}

.tag-warning {
  background-color: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

.tag-primary {
  background-color: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.tag-success {
  background-color: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
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
  padding: 10px 8px;
  font-size: 13px;
  border: none;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-default {
  background: #f5f5f5;
  color: #666;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-icon {
  font-size: 16px;
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

.rating-stars {
  display: flex;
  gap: 4px;
}

.star {
  font-size: 24px;
  cursor: pointer;
  opacity: 0.3;
  transition: opacity 0.2s;
}

.star-active {
  opacity: 1;
}

.rating-value {
  font-size: 14px;
  color: #ff976a;
  font-weight: 500;
}

.review-textarea {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  font-size: 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  resize: none;
  outline: none;
  box-sizing: border-box;
}

.review-textarea:focus {
  border-color: #667eea;
}

.word-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
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

/* 日历选择器 */
.calendar-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.calendar-popup {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 20px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.calendar-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.calendar-close {
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 4px;
}

.date-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 16px;
}

.date-text {
  font-size: 15px;
  color: #333;
}

.picker-arrow {
  font-size: 20px;
  color: #999;
}

.confirm-btn {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
}
</style>
