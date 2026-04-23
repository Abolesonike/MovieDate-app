<template>
  <view class="calendar-page">
    <!-- 顶部切换栏 -->
    <view class="header">
      <view class="mode-switch">
        <button
          :class="['mode-btn', viewMode === 'week' ? 'mode-btn-active' : '']"
          size="mini"
          @click="switchMode('week')"
        >
          周视图
        </button>
        <button
            :class="['mode-btn', viewMode === 'month' ? 'mode-btn-active' : '']"
            size="mini"
            @click="switchMode('month')"
        >
          月视图
        </button>
        <button
            :class="['mode-btn', viewMode === 'today' ? 'mode-btn-active' : '']"
            size="mini"
            @click="switchMode('today')"
        >
          每日一部
        </button>
      </view>
      <view v-if="viewMode !== 'today'" class="date-nav">
        <text class="nav-icon" @click="prevPeriod">‹</text>
        <text class="current-date">{{ currentDateText }}</text>
        <text class="nav-icon" @click="nextPeriod">›</text>
      </view>
      <view v-if="viewMode !== 'today'" class="today-btn" @click="goToToday">
        <text>回到今日</text>
      </view>
    </view>

    <!-- 月视图 -->
    <view v-if="viewMode === 'month'" class="month-view">
      <view class="weekdays">
        <text v-for="(day, index) in weekdays" :key="index" class="weekday">
          {{ day }}
        </text>
      </view>
      <view class="calendar-grid">
        <view
          v-for="(day, index) in calendarDays"
          :key="index"
          class="calendar-day"
          :class="{
            'other-month': !day.isCurrentMonth,
            'today': day.isToday,
            'watched': day.isPast && day.watchedCount > 0,
            'planned': day.isFuture && day.plannedCount > 0
          }"
          @click="selectDay(day)"
        >
          <text class="day-number">{{ day.day }}</text>
          <!-- 状态标记点 -->
          <view v-if="day.watchedCount > 0" class="status-dot watched-dot" title="已观看"></view>
          <view v-else-if="day.plannedCount > 0" class="status-dot planned-dot" title="计划观看"></view>
          <!-- 数量徽章 -->
          <view v-if="day.movieCount > 0" class="movie-indicator">
            <view class="badge">{{ day.movieCount > 99 ? '99+' : day.movieCount }}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 周视图 -->
    <view v-else-if="viewMode === 'week'" class="week-view">
      <scroll-view
        scroll-y
        class="week-content"
        :scroll-top="scrollTopValue"
        scroll-with-animation
      >
        <view
          v-for="(day, index) in currentWeekDays"
          :key="index"
          :id="'day-row-' + index"
          class="week-day-row"
          :class="{
            'is-today': day.isToday,
            'watched': day.isPast && day.watchedCount > 0,
            'planned': day.isFuture && day.plannedCount > 0
          }"
          @click="selectDay(day)"
        >
          <view class="day-info">
            <text class="weekday-name">{{ day.weekday }}</text>
            <text class="day-number">{{ day.day }}日</text>
            <text v-if="day.isToday" class="today-badge">今天</text>
          </view>
          <view class="movies-container">
            <view v-if="day.movies && day.movies.length > 0" class="movie-list">
              <movie-card-vertical
                v-for="(movie, mIndex) in day.movies"
                :key="mIndex"
                :movie="movie"
                :show-status="true"
                :clickable="false"
              />
            </view>
            <view v-else class="no-movie">
              <text class="empty-icon">📋</text>
              <text>暂无影片</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 今日推荐视图 -->
    <view v-else-if="viewMode === 'today'" class="today-view">
      <daily-recommend-card />
      <view>

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
    <view v-else-if="!loading && !error" class="empty-container">
      <u-empty icon="movie" text="暂无推荐" />
    </view>
  </view>
    </view>

    <!-- 底部统计 -->
    <view class="footer-stats">
      <text v-if="viewMode === 'month'">本月已观影：{{ monthTotalMovies }} 部</text>
      <text v-else>本周已观影：{{ weekTotalMovies }} 部</text>
    </view>

    <!-- 电影详情弹窗 -->
    <view v-if="showMoviePopup" class="popup-mask" @click="closePopup">
      <view class="movie-detail-popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">{{ selectedDateStr }}</text>
          <view class="popup-actions">
            <button v-if="!isPastDate" class="add-btn" @click="showAddMovieDialog">添加电影</button>
            <text class="close-icon" @click="closePopup">✕</text>
          </view>
        </view>

        <scroll-view scroll-y class="movie-list-container">
          <view v-if="selectedDayMovies.length === 0" class="empty-state">
            <view class="empty-content">
              <text class="empty-text">暂无电影安排</text>
              <button v-if="!isPastDate" class="add-btn-small" @click="showAddMovieDialog">添加电影</button>
            </view>
          </view>

          <view v-for="(movie, index) in selectedDayMovies" :key="index" class="movie-detail-item">
            <movie-card-compact
              :movie="movie"
              :show-status="true"
              @click="goToMovieDetail(movie)"
            />
            <view class="movie-detail-actions">
              <button
                v-if="(isPastDate || isToday) && movie.status !== 'watched'"
                class="action-btn success-btn"
                @click="markEventAsWatched(movie)"
              >
                标记已看
              </button>
              <button
                class="action-btn danger-btn"
                @click="removeEvent(movie)"
              >
                删除
              </button>
            </view>
            <view v-if="index < selectedDayMovies.length - 1" class="divider" />
          </view>
        </scroll-view>
      </view>
    </view>

  </view>
</template>

<script>
import storage, { MOVIE_STATUS } from '@/utils/storage.js'
import tmdbApi from '@/utils/tmdb.js'
import MovieCardVertical from '@/components/movie-card/movie-card-vertical.vue'
import MovieCardCompact from '@/components/movie-card/movie-card-compact.vue'
import DailyRecommendCard from '@/components/daily-recommend/DailyRecommendCard.vue'

export default {
  components: {
    MovieCardVertical,
    MovieCardCompact,
    DailyRecommendCard
  },
  data() {
    return {
      viewMode: 'week',
      currentDate: new Date(),
      weekdays: ['一', '二', '三', '四', '五', '六', '日'],
      calendarDays: [],
      currentWeekDays: [],
      // 弹窗相关
      showMoviePopup: false,
      selectedDateStr: '',
      selectedDateKey: '',
      selectedDayMovies: [],
      isPastDate: false,
      isToday: false,
      isFutureDate: false,
      scrollTopValue: 0
    }
  },
  computed: {
    currentDateText() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth() + 1
      if (this.viewMode === 'month') {
        return `${year}年${month}月`
      } else {
        const startOfWeek = this.getWeekStart(this.currentDate)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(endOfWeek.getDate() + 6)
        const startMonth = startOfWeek.getMonth() + 1
        const endMonth = endOfWeek.getMonth() + 1
        const weekOfMonth = this.getWeekOfMonth(this.currentDate)
        if (startMonth === endMonth) {
          return `${startMonth}月第${weekOfMonth}周`
        } else {
          return `${startMonth}月末 ~ ${endMonth}月初`
        }
      }
    },
    monthTotalMovies() {
      let total = 0
      this.calendarDays.forEach(day => {
        if (day.isCurrentMonth) {
          total += day.watchedCount || 0
        }
      })
      return total
    },
    weekTotalMovies() {
      let total = 0
      this.currentWeekDays.forEach(day => {
        total += day.watchedCount || 0
      })
      return total
    }
  },
  onShow() {
    storage.clearCache()
    this.generateCalendar()
    if (this.viewMode === 'week') {
      this.$nextTick(() => this.scrollToToday())
    }
  },
  methods: {
    generateCalendar() {
      if (this.viewMode === 'month') {
        this.generateMonthCalendar()
      } else {
        this.generateWeekCalendar()
      }
    },

    switchMode(mode) {
      this.viewMode = mode
      if (mode !== 'today') {
        this.generateCalendar()
      }
      if (mode === 'week') {
        // 延长等待时间，确保 DOM 已更新
        setTimeout(() => {
          this.scrollToToday()
        }, 300)
      }
    },

    async generateMonthCalendar() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const startDate = new Date(firstDay)
      const dayOfWeek = firstDay.getDay() || 7
      startDate.setDate(startDate.getDate() - dayOfWeek + 1)

      const days = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)

        const dateKey = this.formatDate(date)
        const events = storage.getEventsByDate(dateKey)

        // 补充电影详细信息
        const movies = await this.enrichMoviesWithDetails(events)

        const isPast = date < today
        const isFuture = date > today

        const watchedCount = events.filter(e => e.status === MOVIE_STATUS.WATCHED).length
        const plannedCount = events.filter(e => e.status === MOVIE_STATUS.PLANNED).length

        days.push({
          day: date.getDate(),
          fullDate: date,
          dateKey: dateKey,
          isCurrentMonth: date.getMonth() === month,
          isToday: this.isSameDate(date, today),
          isPast,
          isFuture,
          movies: movies,
          movieCount: events.length,
          watchedCount,
          plannedCount
        })
      }

      this.calendarDays = days
    },

    async generateWeekCalendar() {
      const weekStart = this.getWeekStart(this.currentDate)
      const days = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // 先清空现有数据，避免状态不一致
      this.currentWeekDays = []

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + i)

        const dateKey = this.formatDate(date)
        const events = storage.getEventsByDate(dateKey)

        // 补充电影详细信息
        const movies = await this.enrichMoviesWithDetails(events)

        const isPast = date < today
        const isFuture = date > today

        const watchedCount = events.filter(e => e.status === MOVIE_STATUS.WATCHED).length
        const plannedCount = events.filter(e => e.status === MOVIE_STATUS.PLANNED).length

        days.push({
          day: date.getDate(),
          weekday: this.weekdays[(date.getDay() + 6) % 7],
          fullDate: date,
          dateKey: dateKey,
          isToday: this.isSameDate(date, today),
          isPast,
          isFuture,
          movies: movies,  // 使用补充后的电影数据
          watchedCount,
          plannedCount
        })
      }

      this.currentWeekDays = days

      // 生成完成后，如果是周视图则自动滚动到合适位置
      if (this.viewMode === 'week') {
        // 增加延迟，确保数据已完全渲染
        setTimeout(() => {
          this.scrollToToday()
        }, 200)
      }
    },

    getWeekStart(date) {
      const d = new Date(date)
      const day = d.getDay() || 7
      d.setDate(d.getDate() - day + 1)
      return d
    },

    getWeekOfMonth(date) {
      const d = new Date(date)
      const year = d.getFullYear()
      const month = d.getMonth()
      const firstDayOfMonth = new Date(year, month, 1).getDay()
      const dayOfMonth = d.getDate()
      return Math.ceil((dayOfMonth + firstDayOfMonth) / 7)
    },

    isSameDate(date1, date2) {
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate()
    },

    formatDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    prevPeriod() {
      if (this.viewMode === 'month') {
        const newDate = new Date(this.currentDate)
        newDate.setMonth(newDate.getMonth() - 1)
        this.currentDate = newDate
      } else {
        const newDate = new Date(this.currentDate)
        newDate.setDate(newDate.getDate() - 7)
        this.currentDate = newDate
      }
      this.generateCalendar()
    },

    nextPeriod() {
      if (this.viewMode === 'month') {
        const newDate = new Date(this.currentDate)
        newDate.setMonth(newDate.getMonth() + 1)
        this.currentDate = newDate
      } else {
        const newDate = new Date(this.currentDate)
        newDate.setDate(newDate.getDate() + 7)
        this.currentDate = newDate
      }
      this.generateCalendar()
    },

    goToToday() {
      this.currentDate = new Date()
      this.generateCalendar()
      if (this.viewMode === 'week') {
        this.$nextTick(() => this.scrollToToday())
      }
      uni.showToast({ title: '已回到今日', icon: 'success' })
    },

    scrollToToday() {
      this.$nextTick(() => {
        // 查找今天的索引
        const todayIndex = this.currentWeekDays.findIndex(day => day.isToday)
        let targetIndex = todayIndex

        if (todayIndex === -1) {
          // 如果本周不包含今天，滚动到第一个有电影的日期或第一个日期
          const firstDayWithMovies = this.currentWeekDays.findIndex(day => day.movies && day.movies.length > 0)
          targetIndex = firstDayWithMovies !== -1 ? firstDayWithMovies : 0
        }

        // 使用 scroll-top 实现滚动，更可靠
        // 每个 day-row 大约高度 100px + 12px padding = 约 112px
        const rowHeight = 112
        this.scrollTopValue = targetIndex * rowHeight
        console.log('滚动到索引:', targetIndex, 'scrollTop:', this.scrollTopValue)
      })
    },

    selectDay(day) {
      this.selectedDateKey = day.dateKey
      const date = day.fullDate
      this.selectedDateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
      this.selectedDayMovies = [...day.movies]
      this.isPastDate = day.isPast
      this.isToday = day.isToday
      this.isFutureDate = day.isFuture
      this.showMoviePopup = true
    },

    closePopup() {
      this.showMoviePopup = false
    },

    // 添加电影相关方法
    showAddMovieDialog() {
      this.showMoviePopup = false
      uni.navigateTo({
        url: `/pages/movie/picker/index?source=calendar&tabs=search,want&dateKey=${this.selectedDateKey}`
      })
    },

    async markEventAsWatched(event) {
      storage.updateCalendarEvent(this.selectedDateKey, event.id, {
        status: MOVIE_STATUS.WATCHED
      })
      storage.markAsWatched(event.movieId)
      // 重新获取事件并补充电影详情
      const events = storage.getEventsByDate(this.selectedDateKey)
      this.selectedDayMovies = await this.enrichMoviesWithDetails(events)
      this.generateCalendar()
      uni.showToast({ title: '已标记为已看', icon: 'success' })
    },

    async removeEvent(event) {
      uni.showModal({
        title: '确认删除',
        content: `确定从 ${this.selectedDateStr} 删除这部电影？`,
        success: async (res) => {
          if (res.confirm) {
            const all = storage.getAllMovieStatus()
            const movieData = all[event.movieId]
            const eventId = movieData.timeline.planned.calendarEventId
            // 1. 从日历事件中删除
            storage.removeCalendarEvent(this.selectedDateKey, eventId)

            // 2. 如果电影状态是 planned 且关联此事件，重置电影状态为未看
            const movieStatus = storage.getMovieStatus(event.movieId)
            if (movieStatus.status === MOVIE_STATUS.PLANNED) {
              const plannedTimeline = movieStatus.timeline?.planned
              if (plannedTimeline?.calendarEventId === event.id) {
                storage.removeMovieStatus(event.movieId)
              }
            }

            // 3. 刷新日历显示并重新补充电影详情
            const events = storage.getEventsByDate(this.selectedDateKey)
            this.selectedDayMovies = await this.enrichMoviesWithDetails(events)
            this.generateCalendar()

            uni.showToast({ title: '已删除', icon: 'success' })
          }
        }
      })
    },

    goToMovieDetail(movie) {
      // 只传递 movieId，详情页从 TMDB API 获取完整信息
      uni.navigateTo({
        url: `/pages/movie/detail/index?movieId=${movie.movieId}`
      })
    },

    /**
     * 补充电影详细信息
     * 从 TMDB API 获取电影的基本信息（title, poster, rating, year, genre, summary）
     */
    async enrichMoviesWithDetails(events) {
      if (!events || events.length === 0) return []

      const enrichedMovies = []

      for (const event of events) {
        try {
          const movieDetail = await tmdbApi.getMovieDetails(event.movieId)
          enrichedMovies.push({
            ...event,
            id: movieDetail.id,
            movieId: movieDetail.id,
            title: movieDetail.title,
            poster: movieDetail.poster,
            rating: movieDetail.rating,
            year: movieDetail.year,
            genre: movieDetail.genre,
            summary: movieDetail.summary
          })
        } catch (err) {
          console.error('获取电影详情失败:', event.movieId, err)
          // 如果获取失败，保留基本状态信息
          enrichedMovies.push({
            ...event,
            id: event.movieId,
            movieId: event.movieId,
            title: '电影信息加载失败',
            poster: '',
            rating: '0',
            year: '',
            genre: '',
            summary: ''
          })
        }
      }

      return enrichedMovies
    }
  }
}
</script>

<style scoped>
.calendar-page {
  height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 60px;
  overflow: hidden;
  position: relative;
  /* 确保 padding 包含在高度内，避免溢出 */
  box-sizing: border-box;
  width: 100%;
  /* 禁用下拉刷新和弹性滚动 */
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
}

/* 头部样式 */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 15px;
  color: #fff;
}

.mode-switch {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 15px;
}

.mode-btn {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 16px;
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s;
}

.mode-btn-active {
  background-color: #fff;
  color: #667eea;
  font-weight: 600;
}

.date-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.nav-icon {
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  padding: 8px;
}

.current-date {
  font-size: 18px;
  font-weight: bold;
}

.today-btn {
  text-align: center;
  margin-top: 12px;
  padding: 6px 16px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: inline-block;
  cursor: pointer;
  transition: all 0.2s;
}

.today-btn:active {
  transform: scale(0.95);
  background-color: rgba(255, 255, 255, 0.3);
}

.today-btn text {
  font-size: 13px;
  color: #fff;
  font-weight: 500;
}

/* 月视图样式 */
.month-view {
  background-color: #fff;
  margin: 15px;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  margin-bottom: 10px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  color: #999;
  padding: 8px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.calendar-day {
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 8px;
  background-color: #fafafa;
  border-radius: 8px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
}

.calendar-day:active {
  transform: scale(0.95);
}

.other-month {
  opacity: 0.3;
}

.today {
  background-color: #e6f0ff;
  border: 2px solid #667eea;
}

.day-number {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.movie-indicator {
  margin-top: auto;
  margin-bottom: 4px;
}

.badge {
  background-color: #ff4d4f;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

/* 周视图样式 */
.week-view {
  background-color: #fff;
  margin: 15px;
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 320px);
}

/* 今日推荐视图样式 */
.today-view {
  margin: 15px;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  height: calc(100vh - 170px);
}

.week-content {
  display: block;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  /* 添加平滑滚动 */
  scroll-behavior: smooth;
  /* 确保 flex 正常工作 */
  position: relative;
}

.week-day-row {
  display: flex;
  align-items: stretch;
  background-color: #fafafa;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 100px;
  border-bottom: 1px solid #e0e0e0;
}

/* 今天的特殊样式 */
.week-day-row.is-today {
  background: linear-gradient(135deg, #e6f0ff 0%, #f0f4ff 100%);
  border-left: 4px solid #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.week-day-row:active {
  background-color: #f0f0f0;
}

.day-info {
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  gap: 4px;
}

.weekday-name {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.day-number {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.today-badge {
  font-size: 10px;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 500;
  margin-top: 2px;
}

.movies-container {
  flex: 1;
  min-width: 0;
}

.movie-list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.no-movie {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

.empty-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

/* 底部统计 */
.footer-stats {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12px;
  text-align: center;
  font-size: 14px;
  color: #666;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

/* 弹窗遮罩 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

/* 电影详情弹窗 */
.movie-detail-popup {
  width: 100%;
  height: 70%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.popup-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.popup-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-btn {
  padding: 6px 12px;
  font-size: 13px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 16px;
}

.close-icon {
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 4px;
}

.movie-list-container {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-text {
  font-size: 14px;
  color: #999;
}

.add-btn-small {
  padding: 8px 16px;
  font-size: 13px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 16px;
}

.movie-detail-item {
  padding: 12px;
}

.movie-detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  border: none;
  border-radius: 8px;
  color: #fff;
}

.success-btn {
  background-color: #52c41a;
}

.danger-btn {
  background-color: #ff4d4f;
}

.divider {
  height: 1px;
  background-color: #eee;
  margin: 12px 0;
}

/* 添加电影弹窗 */
.add-movie-popup {
  width: 100%;
  height: 60%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
}

.search-section {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.search-box {
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

.search-icon {
  font-size: 18px;
  margin-left: 8px;
  cursor: pointer;
}

.search-results {
  flex: 1;
  overflow-y: auto;
}

.loading-center {
  padding: 40px;
  text-align: center;
}

.loading-text {
  font-size: 14px;
  color: #999;
}

.result-list {
  padding: 12px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
}

.result-item:active {
  background: #f0f0f0;
}

.result-poster {
  width: 50px;
  height: 70px;
  border-radius: 4px;
  background-color: #ddd;
  margin-right: 12px;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.result-rating {
  color: #ff9800;
}

.result-year {
  color: #999;
}

.plus-icon {
  font-size: 20px;
  color: #667eea;
  margin-left: 8px;
}

.empty-search {
  padding: 40px;
  text-align: center;
}

.empty-search .empty-text {
  font-size: 14px;
  color: #999;
}
</style>