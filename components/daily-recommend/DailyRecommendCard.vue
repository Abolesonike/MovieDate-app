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
    <view v-else-if="recommendation" class="calendar-card">
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

        <!-- 左上角日期信息 -->
        <view class="date-info">
          <text class="date-day">{{ todayDay }}</text>
          <view class="date-meta">
            <text class="date-month">{{ todayMonth }}</text>
            <text class="date-weekday">{{ todayWeekday }}</text>
            <text class="date-lunar">{{ todayLunar }}</text>
            <text v-if="todayFestival" class="date-festival">{{ todayFestival }}</text>
          </view>
        </view>

        <!-- 底部渐变遮罩 -->
        <view class="gradient-overlay"></view>

        <!-- 底部电影信息覆盖层 -->
        <view class="poster-info-overlay">
          <!-- 台词 -->
          <view class="quote-section" v-if="recommendation.quote">
            <text class="quote-text">{{ recommendation.quote }}</text>
            <text v-if="recommendation.quoteFrom" class="quote-from">—— {{ recommendation.quoteFrom }}</text>
          </view>

          <!-- 事件标题 -->
          <view class="event-section" v-if="recommendation.eventTitle">
            <text class="event-text">{{ recommendation.eventTitle }}</text>
          </view>

          <!-- 电影元信息 -->
          <view class="movie-meta">
            <view class="title-row">
              <text class="movie-title">《{{ recommendation.title }}》</text>
              <text v-if="recommendation.originalTitle && recommendation.originalTitle !== recommendation.title" class="movie-original-title">{{ recommendation.originalTitle }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-item" v-if="recommendation.year">{{ recommendation.year }}</text>
              <text class="detail-separator" v-if="recommendation.year && recommendation.genre">|</text>
              <text class="detail-item" v-if="recommendation.genre">{{ recommendation.genre }}</text>
              <text class="detail-separator" v-if="recommendation.director">|</text>
              <text class="detail-item" v-if="recommendation.director">{{ recommendation.director }} 导演</text>
            </view>
            <view class="rating-row" v-if="recommendation.rating && recommendation.rating !== '0'">
              <text class="rating-label">TMDB</text>
              <view class="stars">
                <text
                  v-for="n in 5"
                  :key="n"
                  class="star"
                  :class="{ 'star-filled': n <= Math.round(parseFloat(recommendation.rating) / 2) }"
                >★</text>
              </view>
              <text class="rating-value">{{ recommendation.rating }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 操作按钮（独立于海报之外） -->
      <view class="action-bar">
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

/**
 * 简易农历计算（1900-2100年）
 */
function getLunarDate(date) {
  const lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
    0x0d520
  ]

  const lunarMonthNames = ['正','二','三','四','五','六','七','八','九','十','冬','腊']
  const lunarDayNames = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十']

  const festivals = {
    '1-1': '春节', '1-15': '元宵节', '2-2': '龙抬头', '5-5': '端午节',
    '7-7': '七夕', '7-15': '中元节', '8-15': '中秋节', '9-9': '重阳节',
    '10-1': '寒衣节', '10-15': '下元节', '12-8': '腊八节', '12-23': '小年',
    '12-30': '除夕'
  }

  function lYearDays(y) {
    let sum = 348
    for (let i = 0x8000; i > 0x8; i >>= 1) {
      sum += (lunarInfo[y - 1900] & i) ? 1 : 0
    }
    return sum + leapDays(y)
  }

  function leapDays(y) {
    if (leapMonth(y)) {
      return (lunarInfo[y - 1900] & 0x10000) ? 30 : 29
    }
    return 0
  }

  function monthDays(y, m) {
    return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29
  }

  function leapMonth(y) {
    return lunarInfo[y - 1900] & 0xf
  }

  const baseDate = new Date(1900, 0, 31)
  let offset = Math.floor((date - baseDate) / 86400000)

  let year = 1900
  let daysInYear = 0
  let tempOffset = offset

  for (year = 1900; year < 2100 && tempOffset > 0; year++) {
    daysInYear = lYearDays(year)
    tempOffset -= daysInYear
  }

  if (tempOffset < 0) {
    tempOffset += daysInYear
    year--
  }

  const leap = leapMonth(year)
  let isLeap = false
  let month = 1
  let daysInMonth = 0

  for (month = 1; month < 13 && tempOffset > 0; month++) {
    if (leap > 0 && month === leap + 1 && !isLeap) {
      month--
      isLeap = true
      daysInMonth = leapDays(year)
    } else {
      daysInMonth = monthDays(year, month)
    }
    if (isLeap && month === leap + 1) isLeap = false
    tempOffset -= daysInMonth
  }

  if (tempOffset === 0 && leap > 0 && month === leap + 1) {
    if (isLeap) {
      isLeap = false
    } else {
      isLeap = true
      month--
    }
  }

  if (tempOffset < 0) {
    tempOffset += daysInMonth
    month--
  }

  const lunarMonthNum = month
  const lunarDayNum = tempOffset + 1

  const festivalKey = `${lunarMonthNum}-${lunarDayNum}`
  const festival = festivals[festivalKey] || ''

  return {
    month: lunarMonthNames[lunarMonthNum - 1] + '月',
    day: lunarDayNames[lunarDayNum - 1],
    festival
  }
}

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
      maxDateStr: '',
      // 日期展示
      todayDay: '',
      todayMonth: '',
      todayWeekday: '',
      todayLunar: '',
      todayFestival: ''
    }
  },

  async mounted() {
    await this.loadRecommendation()
    this.checkMovieStatus()
    this.initDateInfo()
  },

  methods: {
    initDateInfo() {
      const date = this.date ? new Date(this.date) : new Date()
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
      const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']

      this.todayDay = String(date.getDate()).padStart(2, '0')
      this.todayMonth = `${date.getMonth() + 1}月 ${months[date.getMonth()]}`
      this.todayWeekday = weekdays[date.getDay()]

      const lunar = getLunarDate(date)
      this.todayLunar = `${lunar.month}${lunar.day}`
      this.todayFestival = lunar.festival || ''
    },

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
  background: #1a1a1a;
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

/* ========== 日历卡片 ========== */
.calendar-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

/* ========== 海报区域 ========== */
.poster-section {
  position: relative;
  flex: 1;
  width: 100%;
  overflow: hidden;
  min-height: 0;
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

/* 左上角日期信息 */
.date-info {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  z-index: 10;
}

.date-day {
  font-size: 64px;
  font-weight: 200;
  color: #fff;
  line-height: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.date-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 6px;
}

.date-month {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.date-weekday {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.date-lunar {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.date-festival {
  font-size: 12px;
  color: #ffd700;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

/* 底部渐变遮罩 */
.gradient-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70%;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.9) 0%,
    rgba(0, 0, 0, 0.6) 35%,
    transparent 100%
  );
}

/* 底部电影信息覆盖层 */
.poster-info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 50px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  z-index: 5;
}

/* 台词区域 */
.quote-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quote-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.7;
  font-style: italic;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.quote-from {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

/* 事件标题 */
.event-section {
  padding: 6px 10px;
  background: rgba(102, 126, 234, 0.35);
  border-radius: 8px;
  align-self: flex-start;
}

.event-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

/* 电影元信息 */
.movie-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.movie-title {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.movie-original-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-item {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.detail-separator {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

/* 评分区域 */
.rating-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rating-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.stars {
  display: flex;
  gap: 1px;
}

.star {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.25);
}

.star-filled {
  color: #ffd700;
}

.rating-value {
  font-size: 15px;
  font-weight: bold;
  color: #ffd700;
}

/* ========== 操作按钮 ========== */
.action-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 20px;
  background: #1a1a1a;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 4px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  transition: all 0.2s;
}

.action-btn:active {
  transform: scale(0.96);
  opacity: 0.8;
}

.action-btn--active {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.25);
}

.action-btn--active .btn-text {
  color: rgba(255, 255, 255, 0.45);
}

.btn-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.88);
}

/* 日历选择器 */
.calendar-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.calendar-popup {
  width: 100%;
  background: #262626;
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
  color: #fff;
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
  background: #333;
  border-radius: 8px;
  margin-bottom: 16px;
}

.date-text {
  font-size: 15px;
  color: #fff;
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
