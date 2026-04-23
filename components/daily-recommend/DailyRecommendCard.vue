<template>
  <view class="daily-recommend-card">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <u-loading-icon size="32" color="#667eea"></u-loading-icon>
      <text class="loading-text">正在加载今日推荐...</text>
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error-container">
      <u-empty icon="error" text="加载失败，请重试" />
      <u-button type="primary" size="small" @click="retry">重试</u-button>
    </view>

    <!-- 推荐内容 -->

    <!-- 海报区域 -->
    <view class="poster-section" @click="goToDetail">
      <image
        v-if="recommendation.poster"
        :src="recommendation.poster"
        class="poster-image"
        mode="aspectFill"
      />
      <view v-else class="poster-placeholder">
        <text class="placeholder-icon">🎬</text>
      </view>

      <!-- 渐变遮罩 -->
      <view class="gradient-overlay"></view>

      <!-- 顶部信息栏：评分 | 类型 | 年份 -->
      <view class="top-info-bar">
        <text class="meta-item" v-if="recommendation.title">{{ recommendation.title }}</text>
        <text class="info-separator">|</text>
        <view class="rating-badge">
          <!-- <text class="star-icon">⭐</text> -->
          <text class="meta-item">{{ recommendation.rating || '0' }}</text>
        </view>
        <text class="info-separator">|</text>
        <text class="meta-item" v-if="recommendation.genre">{{ recommendation.genre }}</text>
        <text class="info-separator" v-if="recommendation.genre && recommendation.year">|</text>
        <text class="meta-item" v-if="recommendation.year">{{ recommendation.year }}</text>
      </view>

      <!-- 推荐类型标签 -->
      <view class="type-badge" v-if="recommendation.recommendType">
        <text class="type-text">{{ getRecommendTypeText(recommendation.recommendType) }}</text>
      </view>

    </view>

  


    <!-- 操作按钮（固定底部） -->
    <view v-if="recommendation && !loading && !error" class="action-bar">
      <view
        class="action-btn"
        :class="{ 'action-btn--active': movieStatus === 'want' }"
        @click="handleWant"
      >
        <text class="btn-text">{{ movieStatus === 'want' ? '已想看' : '想看' }}</text>
      </view>
      <view
        class="action-btn"
        :class="{ 'action-btn--active': movieStatus === 'watched' }"
        @click="handleWatched"
      >
        <text class="btn-text">{{ movieStatus === 'watched' ? '已看过' : '标记已看' }}</text>
      </view>
      <view
        class="action-btn"
        :class="{ 'action-btn--active': movieStatus === 'planned' }"
        @click="handleAddToCalendar"
      >
        <text class="btn-text">{{ movieStatus === 'planned' ? '已添加日历' : '添加到日历' }}</text>
      </view>
    </view>

    <!-- 日期选择器弹窗 -->
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

    <!-- 空状态 -->
    <view v-if="!recommendation && !loading && !error" class="empty-container">
      <u-empty icon="movie" text="暂无推荐" />
    </view>
  </view>
</template>

<script>
import dailyRecommend from '@/utils/dailyRecommend.js'
import storage from '@/utils/storage.js'

export default {
  name: 'DailyRecommendCard',

  props: {
    date: {
      type: String,
      default: null
    }
  },

  data() {
    return {
      loading: true,
      error: false,
      recommendation: null,
      movieStatus: null,
      showCalendarPicker: false,
      calendarPickerMode: 'planned',
      selectedDate: '',
      minDateStr: '',
      maxDateStr: ''
    }
  },

  async mounted() {
    await this.loadRecommendation()
    this.checkMovieStatus()
  },

  methods: {
    async loadRecommendation() {
      this.loading = true
      this.error = false

      try {
        if (this.date) {
          this.recommendation = await dailyRecommend.getRecommendationByDate(this.date)
        } else {
          this.recommendation = await dailyRecommend.getTodayRecommendation()
        }
      } catch (e) {
        console.error('[DailyRecommendCard] 加载推荐失败:', e)
        this.error = true
      } finally {
        this.loading = false
      }
    },

    async retry() {
      await this.loadRecommendation()
    },

    checkMovieStatus() {
      if (!this.recommendation || !this.recommendation.tmdbId) return
      try {
        const statusData = storage.getMovieStatus(this.recommendation.tmdbId)
        this.movieStatus = statusData.status
      } catch (e) {
        console.error('[DailyRecommendCard] 检查电影状态失败:', e)
      }
    },

    handleWant() {
      if (!this.recommendation || !this.recommendation.tmdbId) return
      if (this.movieStatus === 'want') return
      try {
        storage.markAsWant(this.recommendation.tmdbId)
        this.movieStatus = 'want'
        uni.showToast({ title: '已加入想看', icon: 'success' })
      } catch (e) {
        console.error('[DailyRecommendCard] 标记想看失败:', e)
        uni.showToast({ title: '操作失败', icon: 'error' })
      }
    },

    handleWatched() {
      if (!this.recommendation || !this.recommendation.tmdbId) return
      if (this.movieStatus === 'watched') return
      this.calendarPickerMode = 'watched'
      const today = new Date()
      const todayStr = this.formatDate(today)
      this.selectedDate = todayStr
      this.maxDateStr = todayStr
      this.minDateStr = ''
      this.showCalendarPicker = true
    },

    handleAddToCalendar() {
      if (!this.recommendation || !this.recommendation.tmdbId) return
      if (this.movieStatus === 'planned') return
      this.calendarPickerMode = 'planned'
      const today = new Date()
      const todayStr = this.formatDate(today)
      this.minDateStr = todayStr
      this.selectedDate = todayStr
      this.showCalendarPicker = true
    },

    formatDate(date) {
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },

    onDateChange(e) {
      this.selectedDate = e.detail.value
    },

    onPickerConfirm() {
      if (this.calendarPickerMode === 'watched') {
        this.confirmWatchedDate()
      } else {
        this.confirmCalendarDate()
      }
    },

    confirmCalendarDate() {
      if (!this.selectedDate) {
        uni.showToast({ title: '请选择日期', icon: 'none' })
        return
      }
      try {
        const result = storage.addCalendarEvent(this.selectedDate, {
          movieId: this.recommendation.tmdbId,
          title: this.recommendation.title,
          poster: this.recommendation.poster,
          rating: this.recommendation.rating
        })
        if (result.success) {
          this.movieStatus = 'planned'
          uni.showToast({ title: `已添加到 ${this.selectedDate}`, icon: 'success' })
        } else {
          uni.showToast({ title: result.message || '添加失败', icon: 'none' })
        }
      } catch (e) {
        console.error('[DailyRecommendCard] 添加到日历失败:', e)
        uni.showToast({ title: '操作失败', icon: 'error' })
      }
      this.showCalendarPicker = false
    },

    confirmWatchedDate() {
      if (!this.selectedDate) {
        uni.showToast({ title: '请选择观看日期', icon: 'none' })
        return
      }
      try {
        const result = storage.markAsWatched(this.recommendation.tmdbId, {
          date: this.selectedDate
        })
        if (result.success) {
          this.movieStatus = 'watched'
          uni.showToast({ title: '已标记为看过', icon: 'success' })
        } else {
          uni.showToast({ title: '标记失败', icon: 'none' })
        }
      } catch (e) {
        console.error('[DailyRecommendCard] 标记已看失败:', e)
        uni.showToast({ title: '操作失败', icon: 'error' })
      }
      this.showCalendarPicker = false
    },

    goToDetail() {
      if (!this.recommendation || !this.recommendation.tmdbId) return
      uni.navigateTo({
        url: `/pages/movie/detail/index?movieId=${this.recommendation.tmdbId}`
      })
    },

    getRecommendTypeText(type) {
      const typeMap = {
        'film_anniversary': '周年纪念',
        'person_birthday': '影人生日',
        'award_anniversary': '获奖纪念',
        'holiday_theme': '节日特荐',
        'trending': '热门推荐',
        'genre_theme': '类型推荐',
        'critics_choice': '编辑精选',
        'hidden_gem': '冷门佳片',
        'default': '每日推荐'
      }
      return typeMap[type] || '推荐'
    }
  }
}
</script>

<style scoped>
.daily-recommend-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #fff;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
}

.loading-text {
  color: #999;
  font-size: 14px;
}

/* ========== 海报区域 ========== */
.poster-section {
  position: relative;
  width: 100%;
  padding-bottom: 150%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.poster-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.poster-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.placeholder-icon {
  font-size: 80px;
  opacity: 0.6;
}

/* 渐变遮罩 - 底部加深用于显示标题 */
.gradient-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.75) 0%,
    rgba(0, 0, 0, 0.35) 50%,
    transparent 100%
  );
}

/* 顶部信息栏：评分 | 类型 | 年份 */
.top-info-bar {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 24px;
  backdrop-filter: blur(4px);
}

.rating-badge {
  display: flex;
  align-items: center;
  gap: 4px;
}

.star-icon {
  font-size: 14px;
}

.rating-value {
  /* color: #ffd700; */
  
  font-size: 15px;
  font-weight: bold;
}

.info-separator {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.meta-item {
  color: rgba(255, 255, 255, 0.95);
  font-size: 14px;
}

/* 推荐类型标签 */
.type-badge {
  position: absolute;
  top: 64px;
  left: 16px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
}

.type-text {
  color: #fff;
  font-size: 12px;
  font-weight: 500;
}

/* 底部标题覆盖层 */
.poster-title-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 60px 20px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.movie-title {
  color: #fff;
  font-size: 22px;
  font-weight: bold;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.movie-original-title {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  text-align: center;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

/* ========== 内容区域 ========== */
.body-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  padding-bottom: 24px;
}

/* 事件区域 */
.event-section,
.quote-section {
  padding: 14px 16px;
  background: #f8f9fa;
  border-radius: 14px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.section-icon {
  font-size: 16px;
}

.section-title {
  font-size: 13px;
  font-weight: bold;
  color: #667eea;
}

.event-text {
  font-size: 15px;
  color: #444;
  line-height: 1.6;
  font-weight: 500;
}

/* 台词区域 */
.quote-text {
  font-size: 15px;
  color: #555;
  font-style: italic;
  line-height: 1.7;
  display: block;
}

.quote-from {
  display: block;
  text-align: right;
  font-size: 13px;
  color: #999;
  margin-top: 8px;
}

/* ========== 底部操作栏 ========== */
.action-bar {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 4px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.96);
  opacity: 0.9;
}

.action-btn--active {
  background: #f0f0f0;
  border-color: #d0d0d0;
}

.action-btn--active .btn-text {
  color: #999;
}

.btn-text {
  font-size: 12px;
  color: #666;
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
