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
        <text class="btn-icon">{{ movieCurrentStatus === 'watched' ? '↻' : '○' }}</text>
        {{ movieCurrentStatus === 'watched' ? '重刷' : '标记已看' }}
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

    <!-- 演职人员 -->
    <view class="credits-section" v-if="hasCredits">
      <text class="section-title">演职人员</text>

      <!-- 导演 -->
      <view v-if="credits.directors.length" class="credit-group">
        <text class="credit-label">导演</text>
        <scroll-view scroll-x class="credit-scroll">
          <view
            v-for="p in credits.directors"
            :key="p.id"
            class="credit-item"
            @click="goToPerson(p.id)"
          >
            <image
              class="credit-avatar"
              :src="p.profile || '/static/default-avatar.png'"
              mode="aspectFill"
            />
            <text class="credit-name">{{ p.name }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 主演 -->
      <view v-if="credits.cast.length" class="credit-group">
        <text class="credit-label">主演</text>
        <scroll-view scroll-x class="credit-scroll">
          <view
            v-for="p in credits.cast"
            :key="p.id"
            class="credit-item"
            @click="goToPerson(p.id)"
          >
            <image
              class="credit-avatar"
              :src="p.profile || '/static/default-avatar.png'"
              mode="aspectFill"
            />
            <text class="credit-name">{{ p.name }}</text>
            <text class="credit-role">{{ p.role }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 编剧 -->
      <view v-if="credits.writers.length" class="credit-group">
        <text class="credit-label">编剧</text>
        <scroll-view scroll-x class="credit-scroll">
          <view
            v-for="p in credits.writers"
            :key="p.id"
            class="credit-item"
            @click="goToPerson(p.id)"
          >
            <image
              class="credit-avatar"
              :src="p.profile || '/static/default-avatar.png'"
              mode="aspectFill"
            />
            <text class="credit-name">{{ p.name }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 观影历史 -->
    <view v-if="watchRecords.length > 0" class="history-section">
      <text class="section-title">观影记录（共 {{ watchRecords.length }} 次）</text>
      <view
        v-for="(record, index) in reversedWatchRecords"
        :key="record.id"
        class="history-item"
      >
        <view class="history-header">
          <view class="history-meta">
            <text class="history-index">{{ watchRecords.length - index }}</text>
            <text v-if="index === 0" class="history-latest-tag">最新</text>
            <text class="history-date">{{ record.date }}</text>
          </view>
          <view v-if="record.rating" class="history-rating">
            <text v-for="s in record.rating" :key="s">⭐</text>
          </view>
        </view>
        <text v-if="record.review" class="history-review">{{ record.review }}</text>
      </view>
    </view>

    <!-- 日历选择器 -->
    <view v-if="showCalendarPicker" class="calendar-mask" @click="showCalendarPicker = false">
      <view class="calendar-popup" @click.stop>
        <view class="calendar-header">
          <text class="calendar-title">{{ calendarPickerMode === 'watched' ? (movieCurrentStatus === 'watched' ? '记录重刷' : '选择观看日期') : '选择日期' }}</text>
          <text class="calendar-close" @click="showCalendarPicker = false">✕</text>
        </view>
        <picker mode="date" :value="selectedDate" :start="calendarPickerMode === 'planned' ? minDateStr : undefined" :end="calendarPickerMode === 'watched' ? maxDateStr : undefined" @change="onDateChange">
          <view class="date-picker">
            <text class="date-text">{{ selectedDate || '请选择日期' }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>

        <!-- 重刷时显示评分和评论 -->
        <view v-if="calendarPickerMode === 'watched' && movieCurrentStatus === 'watched'" class="rewatch-review-section">
          <view class="rating-row">
            <text class="label">本次评分：</text>
            <view class="rating-stars">
              <text
                v-for="star in 5"
                :key="star"
                class="star"
                :class="{ 'star-active': star <= rewatchRating }"
                @click="setRewatchRating(star)"
              >
                ⭐
              </text>
            </view>
            <text class="rating-value">{{ rewatchRating }} 分</text>
          </view>
          <textarea
            v-model="rewatchReview"
            class="review-textarea"
            placeholder="写下本次观影感受..."
            :maxlength="200"
          />
          <text class="word-count">{{ rewatchReview.length }}/200</text>
        </view>

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
      credits: {
        cast: [],
        directors: [],
        writers: []
      },
      movieCurrentStatus: MOVIE_STATUS.UNWATCHED,
      userRating: 0,
      userReview: '',
      watchRecords: [],
      rewatchRating: 0,
      rewatchReview: '',
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
    },
    hasCredits() {
      return this.credits.cast.length > 0 ||
        this.credits.directors.length > 0 ||
        this.credits.writers.length > 0
    },
    reversedWatchRecords() {
      return [...this.watchRecords].reverse()
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
        const [result, credits] = await Promise.all([
          tmdbApi.getMovieDetails(movieId),
          tmdbApi.getMovieCredits(movieId)
        ])
        this.movie = {
          id: result.id,
          title: result.title,
          poster: result.poster || '',
          rating: result.rating,
          year: result.year,
          genre: result.genre,
          summary: result.summary
        }
        this.credits = credits
      } catch (err) {
        uni.showToast({ title: '加载电影详情失败', icon: 'none' })
        console.error(err)
      }
    },

    loadMovieStatus(movieId) {
      const statusData = storage.getMovieStatus(movieId)
      this.movieCurrentStatus = statusData.status
      // 从 watched 数组中读取所有观影记录
      this.watchRecords = storage.getWatchedRecords(movieId) || []
      const latest = this.watchRecords[this.watchRecords.length - 1] || {}
      this.userRating = latest.rating || 0
      this.userReview = latest.review || ''
    },

    _checkMovieLoaded() {
      if (!this.movie.id) {
        uni.showToast({ title: '电影信息未加载完成', icon: 'none' })
        return false
      }
      return true
    },

    toggleWantToWatch() {
      if (!this._checkMovieLoaded()) return
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
      if (!this._checkMovieLoaded()) return
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
      // 打开日期选择器，让用户选择观看日期
      this.calendarPickerMode = 'watched'
      const today = new Date()
      this.watchedDateStr = this.formatDate(today)
      this.selectedDate = this.watchedDateStr
      // 标记已看时不限制最小日期，但限制最大日期为今天（不能选择未来）
      this.minDateStr = ''
      this.maxDateStr = this.watchedDateStr

      // 如果是重刷，初始化弹窗内的评分评论
      if (this.movieCurrentStatus === MOVIE_STATUS.WATCHED) {
        this.rewatchRating = 0
        this.rewatchReview = ''
      }

      this.showCalendarPicker = true
    },

    onWatchedDateConfirm() {
      if (!this._checkMovieLoaded()) return
      if (!this.selectedDate) {
        uni.showToast({ title: '请选择观看日期', icon: 'none' })
        return
      }

      const isRewatch = this.movieCurrentStatus === MOVIE_STATUS.WATCHED

      const result = storage.markAsWatched(this.movie.id, {
        rating: isRewatch ? (this.rewatchRating || undefined) : (this.userRating || undefined),
        review: isRewatch ? (this.rewatchReview || undefined) : (this.userReview || undefined),
        date: this.selectedDate
      })

      if (result.success) {
        this.movieCurrentStatus = MOVIE_STATUS.WATCHED
        this.loadMovieStatus(this.movie.id)
        uni.showToast({ title: result.message, icon: 'success' })
      } else {
        uni.showToast({ title: '标记失败', icon: 'none' })
      }

      this.showCalendarPicker = false
    },

    setRewatchRating(value) {
      this.rewatchRating = value
    },

    setRating(value) {
      if (!this._checkMovieLoaded()) return
      this.userRating = value
      if (this.movieCurrentStatus === MOVIE_STATUS.WATCHED) {
        storage.updateWatchedReview(this.movie.id, { rating: value })
      }
    },

    saveReview() {
      if (!this._checkMovieLoaded()) return
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

    goToPerson(personId) {
      uni.navigateTo({
        url: `/pages/movie/person/index?personId=${personId}`
      })
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
  background-color: var(--bg-page);
  padding: 16px;
}

/* 头部样式 */
.movie-header {
  display: flex;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-card);
}

.header-poster {
  width: 100px;
  height: 150px;
  border-radius: 8px;
  background-color: var(--bg-hover);
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
  color: var(--text-primary);
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
  color: var(--text-tertiary);
  font-size: 13px;
}

.header-genre {
  color: var(--text-tertiary);
  font-size: 13px;
}

/* 状态区域 */
.status-section {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-card);
  gap: 8px;
}

.status-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.status-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.tag-default {
  background-color: var(--bg-page);
  color: var(--text-secondary);
  border: 1px solid var(--border);
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
  background: var(--bg-card);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-card);
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
  background: var(--bg-page);
  color: var(--text-secondary);
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}

.btn-icon {
  font-size: 16px;
}

/* 评价区域 */
.review-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-card);
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.rating-row .label {
  font-size: 14px;
  color: var(--text-secondary);
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
  border: 1px solid var(--border);
  border-radius: 8px;
  resize: none;
  outline: none;
  box-sizing: border-box;
}

.review-textarea:focus {
  border-color: var(--primary);
}

.word-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

/* 简介区域 */
.summary-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 10px;
  display: block;
}

.summary-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
}

/* 演职人员 */
.credits-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-top: 12px;
  box-shadow: var(--shadow-card);
}

.credit-group {
  margin-bottom: 16px;
}

.credit-group:last-child {
  margin-bottom: 0;
}

.credit-label {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-bottom: 10px;
  display: block;
}

.credit-scroll {
  white-space: nowrap;
}

.credit-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 72px;
  margin-right: 12px;
  vertical-align: top;
}

.credit-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--bg-hover);
  margin-bottom: 6px;
}

.credit-name {
  font-size: 13px;
  color: var(--text-primary);
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.credit-role {
  font-size: 11px;
  color: var(--text-tertiary);
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

/* 观影历史 */
.history-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-card);
}

.history-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
}

.history-item:last-child {
  border-bottom: none;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.history-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-index {
  font-size: 13px;
  color: var(--primary);
  font-weight: 600;
  min-width: 20px;
}

.history-latest-tag {
  font-size: 11px;
  color: #fff;
  background: var(--primary);
  padding: 2px 6px;
  border-radius: 4px;
}

.history-date {
  font-size: 13px;
  color: var(--text-secondary);
}

.history-rating {
  font-size: 12px;
}

.history-review {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-top: 4px;
}

/* 重刷弹窗评分区 */
.rewatch-review-section {
  margin-bottom: 16px;
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
  background: var(--bg-card);
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
  color: var(--text-primary);
}

.calendar-close {
  font-size: 20px;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
}

.date-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-page);
  border-radius: 8px;
  margin-bottom: 16px;
}

.date-text {
  font-size: 15px;
  color: var(--text-primary);
}

.picker-arrow {
  font-size: 20px;
  color: var(--text-tertiary);
}

.confirm-btn {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
}
</style>
