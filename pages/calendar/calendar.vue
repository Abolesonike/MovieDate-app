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
      </view>
      <view class="date-nav">
        <text class="nav-icon" @click="prevPeriod">‹</text>
        <text class="current-date">{{ currentDateText }}</text>
        <text class="nav-icon" @click="nextPeriod">›</text>
      </view>
      <view class="today-btn" @click="goToToday">
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
    <view v-else class="week-view">
      <scroll-view 
        scroll-y 
        class="week-content"
        :scroll-into-view="scrollToTodayId"
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
          </view>
          <view class="movies-container">
            <view v-if="day.movies && day.movies.length > 0" class="movie-list">
              <movie-card
                v-for="(movie, mIndex) in day.movies"
                :key="mIndex"
                :movie="movie"
                variant="vertical"
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
            <movie-card
              :movie="movie"
              variant="compact"
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

    <!-- 添加电影弹窗 -->
    <view v-if="showAddMoviePopup" class="popup-mask" @click="showAddMoviePopup = false">
      <view class="add-movie-popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">添加电影到 {{ selectedDateStr }}</text>
          <text class="close-icon" @click="showAddMoviePopup = false">✕</text>
        </view>

        <view class="search-section">
          <view class="search-box">
            <input
              v-model="searchKeyword"
              class="search-input"
              placeholder="搜索电影名称"
              @confirm="onSearchMovie"
            />
            <text class="search-icon" @click="onSearchMovie">🔍</text>
          </view>
        </view>

        <scroll-view scroll-y class="search-results">
          <view v-if="searching" class="loading-center">
            <text class="loading-text">搜索中...</text>
          </view>

          <view v-else-if="searchResults.length > 0" class="result-list">
            <view
              v-for="movie in searchResults"
              :key="movie.id"
              class="result-item"
              @click="selectMovieToAdd(movie)"
            >
              <image :src="movie.poster" class="result-poster" mode="aspectFill" />
              <view class="result-info">
                <text class="result-title">{{ movie.title }}</text>
                <view class="result-meta">
                  <text class="result-rating">⭐ {{ movie.rating }}</text>
                  <text class="result-year">{{ movie.year }}</text>
                </view>
              </view>
              <text class="plus-icon">➕</text>
            </view>
          </view>

          <view v-else class="empty-search">
            <text class="empty-text">搜索电影添加到日历</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import storage, { MOVIE_STATUS } from '@/utils/storage.js'
import tmdbApi from '@/utils/tmdb.js'
import MovieCard from '@/components/movie-card/movie-card.vue'

export default {
  components: {
    MovieCard
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
      scrollToTodayId: '',
      // 添加电影相关
      showAddMoviePopup: false,
      searchKeyword: '',
      searchResults: [],
      searching: false
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
      this.generateCalendar()
      if (mode === 'week') {
        this.$nextTick(() => this.scrollToToday())
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
      const todayIndex = this.currentWeekDays.findIndex(day => day.isToday)
      if (todayIndex !== -1) {
        this.scrollToTodayId = 'day-row-' + todayIndex
      }
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
      this.showAddMoviePopup = true
      this.searchKeyword = ''
      this.searchResults = []
    },

    async onSearchMovie() {
      if (!this.searchKeyword.trim()) return

      this.searching = true
      try {
        const result = await tmdbApi.searchMovies(this.searchKeyword)
        this.searchResults = result.movies
      } catch (err) {
        uni.showToast({ title: err.message || '搜索失败', icon: 'none' })
      } finally {
        this.searching = false
      }
    },

    selectMovieToAdd(movie) {
      const result = storage.addCalendarEvent(this.selectedDateKey, {
        movieId: movie.id,
        title: movie.title,
        poster: movie.poster,
        rating: movie.rating
      })

      if (result.success) {
        uni.showToast({ title: '添加成功', icon: 'success' })
        this.showAddMoviePopup = false
        this.generateCalendar()
        this.selectedDayMovies = storage.getEventsByDate(this.selectedDateKey)
        this.showMoviePopup = true
      } else {
        uni.showToast({ title: result.message, icon: 'none' })
      }
    },

    markEventAsWatched(event) {
      storage.updateCalendarEvent(this.selectedDateKey, event.id, {
        status: MOVIE_STATUS.WATCHED
      })
      storage.markAsWatched(event.movieId, {
        title: event.title,
        poster: event.poster
      })

      this.selectedDayMovies = storage.getEventsByDate(this.selectedDateKey)
      this.generateCalendar()
      uni.showToast({ title: '已标记为已看', icon: 'success' })
    },

    removeEvent(event) {
      uni.showModal({
        title: '确认移除',
        content: `确定移除「${event.title}」？`,
        success: (res) => {
          if (res.confirm) {
            storage.removeCalendarEvent(this.selectedDateKey, event.id)
            this.selectedDayMovies = storage.getEventsByDate(this.selectedDateKey)
            this.generateCalendar()
            uni.showToast({ title: '已移除', icon: 'success' })
          }
        }
      })
    },

    goToMovieDetail(movie) {
      // 只传递 movieId，详情页从 TMDB API 获取完整信息
      uni.navigateTo({
        url: `/pages/movie-detail/movie-detail?movieId=${movie.movieId}`
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

.week-content {
  display: block;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
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
  z-index: 1000;
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
