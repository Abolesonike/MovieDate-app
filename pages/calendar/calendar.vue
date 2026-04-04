
<template>
  <view class="calendar-page">
    <!-- 顶部切换栏 -->
    <view class="header">
      <view class="mode-switch">
        <van-button
          :type="viewMode === 'week' ? 'primary' : 'default'"
          size="small"
          @click="switchMode('week')"
        >
          周视图
        </van-button>
        <van-button
            :type="viewMode === 'month' ? 'primary' : 'default'"
            size="small"
            @click="switchMode('month')"
        >
          月视图
        </van-button>
      </view>
      <view class="date-nav">
        <van-icon name="arrow-left" @click="prevPeriod" />
        <text class="current-date">{{ currentDateText }}</text>
        <van-icon name="arrow" @click="nextPeriod" />
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
            <van-badge :content="day.movieCount" :max="99" />
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
              <van-icon name="todo-list-o" size="24" />
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
    <van-popup
      v-model:show="showMoviePopup"
      position="bottom"
      round
      :style="{ height: '70%' }"
    >
      <view class="movie-detail-popup">
        <view class="popup-header">
          <text class="popup-title">{{ selectedDateStr }}</text>
          <view class="popup-actions">
            <van-button v-if="!isPastDate" type="primary" size="small" @click="showAddMovieDialog">添加电影</van-button>
            <van-icon name="cross" size="20" @click="closePopup" />
          </view>
        </view>

        <scroll-view scroll-y class="movie-list-container">
          <view v-if="selectedDayMovies.length === 0" class="empty-state">
            <van-empty description="暂无电影安排">
              <van-button v-if="!isPastDate" type="primary" size="small" @click="showAddMovieDialog">添加电影</van-button>
            </van-empty>
          </view>

          <view v-for="(movie, index) in selectedDayMovies" :key="index" class="movie-detail-item">
            <movie-card
              :movie="movie"
              variant="compact"
              :show-status="true"
              @click="goToMovieDetail(movie)"
            />
            <view class="movie-detail-actions">
              <van-button
                v-if="(isPastDate || isToday) && movie.status !== 'watched'"
                type="success"
                size="small"
                @click="markEventAsWatched(movie)"
              >
                标记已看
              </van-button>
              <van-button
                type="danger"
                size="small"
                @click="removeEvent(movie)"
              >
                删除
              </van-button>
            </view>
            <van-divider v-if="index < selectedDayMovies.length - 1" />
          </view>
        </scroll-view>
      </view>
    </van-popup>

    <!-- 添加电影弹窗 -->
    <van-popup
      v-model:show="showAddMoviePopup"
      position="bottom"
      round
      :style="{ height: '60%' }"
    >
      <view class="add-movie-popup">
        <view class="popup-header">
          <text class="popup-title">添加电影到 {{ selectedDateStr }}</text>
          <van-icon name="cross" size="20" @click="showAddMoviePopup = false" />
        </view>

        <view class="search-section">
          <van-search
            v-model="searchKeyword"
            placeholder="搜索电影名称"
            shape="round"
            @search="onSearchMovie"
          />
        </view>

        <scroll-view scroll-y class="search-results">
          <van-loading v-if="searching" size="24px" class="loading-center">搜索中...</van-loading>

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
              <van-icon name="plus" size="20" color="#667eea" />
            </view>
          </view>

          <van-empty v-else description="搜索电影添加到日历" />
        </scroll-view>
      </view>
    </van-popup>
  </view>
</template>

<script>
import storage, { MOVIE_STATUS } from '@/utils/storage.js'
import tmdbApi from '@/utils/tmdb.js'
import { showToast, showSuccessToast } from 'vant'
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
      showSuccessToast('已回到今日')
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
        showToast(err.message || '搜索失败')
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
        showSuccessToast('添加成功')
        this.showAddMoviePopup = false
        this.generateCalendar()
        this.selectedDayMovies = storage.getEventsByDate(this.selectedDateKey)
        this.showMoviePopup = true
      } else {
        showToast(result.message)
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
      showSuccessToast('已标记为已看')
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
            showSuccessToast('已移除')
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

.date-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
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

.week-header {
  display: flex;
  padding: 0 0 15px 0;
  margin-bottom: 10px;
  border-bottom: 2px solid #667eea;
  font-weight: bold;
  font-size: 14px;
  color: #666;
}

.header-date {
  width: 80px;
  text-align: center;
}

.header-movies {
  flex: 1;
}

.day-name {
  font-size: 12px;
  color: #999;
}

.day-num {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.week-content {
  display: block;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.week-content::-webkit-scrollbar {
  width: 6px;
}

.week-content::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
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

.week-day-row:last-child {
  border-bottom: none;
}

.week-day-row:active {
  transform: scale(0.98);
  background-color: #f0f0f0;
}

.is-today {
  background-color: #e6f0ff;
  border-left: 4px solid #667eea;
}

.day-info {
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  flex-shrink: 0;
  align-self: stretch;
}

.weekday-name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.day-number {
  font-size: 14px;

  color: #999;
}

.movies-container {
  flex: 1;
  height: 100%;
  min-width: 0;
}

.movie-list {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-content: flex-start;
}

.movie-list::-webkit-scrollbar {
  width: 3px;
}

.movie-list::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 2px;
}

.no-movie {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
  gap: 5px;
  flex: 1;
}

/* 电影详情弹窗样式 */
.movie-detail-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
  width: 100%;
  box-sizing: border-box;
}

.popup-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.popup-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}

.movie-list-container {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px;
  width: 100%;
  box-sizing: border-box;
}

.movie-detail-item {
  margin-bottom: 16px;
  width: 100%;
  box-sizing: border-box;
}

.movie-detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  justify-content: flex-end;
  flex-wrap: nowrap;
}

/* 底部统计 */
.footer-stats {
  position: fixed;
  bottom: 50px; /* 留出 tabBar 的空间 */
  left: 0;
  right: 0;
  background-color: #fff;
  padding: 12px 20px;
  display: flex;
  border-top: 1px solid #eee;
  font-size: 14px;
  color: #666;
  justify-content: center;
  z-index: 999;
}
</style>