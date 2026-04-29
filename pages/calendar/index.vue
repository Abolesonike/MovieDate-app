<template>
  <view class="calendar-page">
    <!-- 顶部切换栏 -->
    <view class="header">
      <view class="mode-switch">
        <button
          :class="['mode-btn', viewMode === 'today' ? 'mode-btn-active' : '']"
          size="mini"
          @click="switchMode('today')"
        >
          今日
        </button>
        <button
          :class="['mode-btn', viewMode === 'week' ? 'mode-btn-active' : '']"
          size="mini"
          @click="switchMode('week')"
        >
          周
        </button>
        <button
            :class="['mode-btn', viewMode === 'month' ? 'mode-btn-active' : '']"
            size="mini"
            @click="switchMode('month')"
        >
          月
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
          v-for="day in calendarDays"
          :key="day.dateKey"
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
          :key="day.dateKey"
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
                v-for="movie in day.movies"
                :key="movie.id"
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

          <view v-for="(movie, index) in selectedDayMovies" :key="movie.id" class="movie-detail-item">
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

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import storage, { MOVIE_STATUS } from '@/utils/storage.js'
import tmdbApi from '@/utils/tmdb.js'
import MovieCardVertical from '@/components/movie-card/movie-card-vertical.vue'
import MovieCardCompact from '@/components/movie-card/movie-card-compact.vue'
import DailyRecommendCard from '@/components/daily-recommend/DailyRecommendCard.vue'

const viewMode = ref('today')
const currentDate = ref(new Date())
const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const calendarDays = ref([])
const currentWeekDays = ref([])

const showMoviePopup = ref(false)
const selectedDateStr = ref('')
const selectedDateKey = ref('')
const selectedDayMovies = ref([])
const isPastDate = ref(false)
const isToday = ref(false)
const isFutureDate = ref(false)
const scrollTopValue = ref(0)

const currentDateText = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1
  if (viewMode.value === 'month') {
    return `${year}年${month}月`
  }
  const startOfWeek = getWeekStart(currentDate.value)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(endOfWeek.getDate() + 6)
  const startMonth = startOfWeek.getMonth() + 1
  const endMonth = endOfWeek.getMonth() + 1
  const weekOfMonth = getWeekOfMonth(currentDate.value)
  if (startMonth === endMonth) {
    return `${startMonth}月第${weekOfMonth}周`
  }
  return `${startMonth}月末 ~ ${endMonth}月初`
})

const monthTotalMovies = computed(() =>
  calendarDays.value.reduce((sum, day) =>
    day.isCurrentMonth ? sum + (day.watchedCount || 0) : sum, 0)
)

const weekTotalMovies = computed(() =>
  currentWeekDays.value.reduce((sum, day) => sum + (day.watchedCount || 0), 0)
)

function generateCalendar() {
  if (viewMode.value === 'month') {
    generateMonthCalendar()
  } else {
    generateWeekCalendar()
  }
}

function switchMode(mode) {
  viewMode.value = mode
  if (mode !== 'today') {
    generateCalendar()
  }
  if (mode === 'week') {
    setTimeout(() => scrollToToday(), 300)
  }
}

async function generateMonthCalendar() {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
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

    const dateKey = formatDate(date)
    const events = storage.getEventsByDate(dateKey)
    const movies = await enrichMoviesWithDetails(events)

    const isPast = date < today
    const isFuture = date > today

    const watchedCount = events.filter(e => e.status === MOVIE_STATUS.WATCHED).length
    const plannedCount = events.filter(e => e.status === MOVIE_STATUS.PLANNED).length

    days.push({
      day: date.getDate(),
      fullDate: date,
      dateKey,
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameDate(date, today),
      isPast,
      isFuture,
      movies,
      movieCount: events.length,
      watchedCount,
      plannedCount
    })
  }

  calendarDays.value = days
}

async function generateWeekCalendar() {
  const weekStart = getWeekStart(currentDate.value)
  const days = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  currentWeekDays.value = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)

    const dateKey = formatDate(date)
    const events = storage.getEventsByDate(dateKey)
    const movies = await enrichMoviesWithDetails(events)

    const isPast = date < today
    const isFuture = date > today

    const watchedCount = events.filter(e => e.status === MOVIE_STATUS.WATCHED).length
    const plannedCount = events.filter(e => e.status === MOVIE_STATUS.PLANNED).length

    days.push({
      day: date.getDate(),
      weekday: weekdays[(date.getDay() + 6) % 7],
      fullDate: date,
      dateKey,
      isToday: isSameDate(date, today),
      isPast,
      isFuture,
      movies,
      watchedCount,
      plannedCount
    })
  }

  currentWeekDays.value = days

  if (viewMode.value === 'week') {
    setTimeout(() => scrollToToday(), 200)
  }
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d
}

function getWeekOfMonth(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const dayOfMonth = d.getDate()
  return Math.ceil((dayOfMonth + firstDayOfMonth) / 7)
}

function isSameDate(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function prevPeriod() {
  const newDate = new Date(currentDate.value)
  if (viewMode.value === 'month') {
    newDate.setMonth(newDate.getMonth() - 1)
  } else {
    newDate.setDate(newDate.getDate() - 7)
  }
  currentDate.value = newDate
  generateCalendar()
}

function nextPeriod() {
  const newDate = new Date(currentDate.value)
  if (viewMode.value === 'month') {
    newDate.setMonth(newDate.getMonth() + 1)
  } else {
    newDate.setDate(newDate.getDate() + 7)
  }
  currentDate.value = newDate
  generateCalendar()
}

function goToToday() {
  currentDate.value = new Date()
  generateCalendar()
  if (viewMode.value === 'week') {
    nextTick(() => scrollToToday())
  }
  uni.showToast({ title: '已回到今日', icon: 'success' })
}

function scrollToToday() {
  nextTick(() => {
    const todayIndex = currentWeekDays.value.findIndex(day => day.isToday)
    let targetIndex = todayIndex

    if (todayIndex === -1) {
      const firstDayWithMovies = currentWeekDays.value.findIndex(day => day.movies && day.movies.length > 0)
      targetIndex = firstDayWithMovies !== -1 ? firstDayWithMovies : 0
    }

    const rowHeight = 112
    scrollTopValue.value = targetIndex * rowHeight
  })
}

function selectDay(day) {
  selectedDateKey.value = day.dateKey
  const date = day.fullDate
  selectedDateStr.value = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  selectedDayMovies.value = [...day.movies]
  isPastDate.value = day.isPast
  isToday.value = day.isToday
  isFutureDate.value = day.isFuture
  showMoviePopup.value = true
}

function closePopup() {
  showMoviePopup.value = false
}

function showAddMovieDialog() {
  showMoviePopup.value = false
  uni.navigateTo({
    url: `/pages/movie/picker/index?source=calendar&tabs=search,want&dateKey=${selectedDateKey.value}`
  })
}

async function markEventAsWatched(event) {
  storage.updateCalendarEvent(selectedDateKey.value, event.id, {
    status: MOVIE_STATUS.WATCHED
  })
  storage.markAsWatched(event.movieId)
  const events = storage.getEventsByDate(selectedDateKey.value)
  selectedDayMovies.value = await enrichMoviesWithDetails(events)
  generateCalendar()
  uni.showToast({ title: '已标记为已看', icon: 'success' })
}

async function removeEvent(event) {
  uni.showModal({
    title: '确认删除',
    content: `确定从 ${selectedDateStr.value} 删除这部电影？`,
    success: async (res) => {
      if (res.confirm) {
        const all = storage.getAllMovieStatus()
        const movieData = all[event.movieId]
        const eventId = movieData.timeline.planned.calendarEventId
        storage.removeCalendarEvent(selectedDateKey.value, eventId)

        const movieStatus = storage.getMovieStatus(event.movieId)
        if (movieStatus.status === MOVIE_STATUS.PLANNED) {
          const plannedTimeline = movieStatus.timeline?.planned
          if (plannedTimeline?.calendarEventId === event.id) {
            storage.removeMovieStatus(event.movieId)
          }
        }

        const events = storage.getEventsByDate(selectedDateKey.value)
        selectedDayMovies.value = await enrichMoviesWithDetails(events)
        generateCalendar()
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}

function goToMovieDetail(movie) {
  uni.navigateTo({
    url: `/pages/movie/detail/index?movieId=${movie.movieId}`
  })
}

async function enrichMoviesWithDetails(events) {
  if (!events || events.length === 0) return []

  return Promise.all(
    events.map(async (event) => {
      try {
        const movieDetail = await tmdbApi.getMovieDetails(event.movieId)
        return {
          ...event,
          id: movieDetail.id,
          movieId: movieDetail.id,
          title: movieDetail.title,
          poster: movieDetail.poster,
          rating: movieDetail.rating,
          year: movieDetail.year,
          genre: movieDetail.genre,
          summary: movieDetail.summary
        }
      } catch (err) {
        console.error('获取电影详情失败:', event.movieId, err)
        return {
          ...event,
          id: event.movieId,
          movieId: event.movieId,
          title: '电影信息加载失败',
          poster: '',
          rating: '0',
          year: '',
          genre: '',
          summary: ''
        }
      }
    })
  )
}

onShow(() => {
  storage.clearCache()
  generateCalendar()
  if (viewMode.value === 'week') {
    nextTick(() => scrollToToday())
  }
})
</script>

<style scoped>
.calendar-page {
  height: 100vh;
  background-color: var(--bg-page);
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
  background: var(--primary);
  padding: 10px 6px;
  color: #fff;
}

.mode-switch {
  display: flex;
  justify-content: center;
  gap: 15px;
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
  background-color: var(--bg-card);
  color: var(--primary);
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
  background-color: var(--bg-card);
  margin: 15px;
  border-radius: 12px;
  padding: 15px;
  box-shadow: var(--shadow-card);
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
  color: var(--text-tertiary);
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
  background-color: var(--bg-hover);
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
  border: 2px solid var(--primary);
}

.day-number {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
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
  background-color: var(--bg-card);
  margin: 15px;
  border-radius: 12px;
  padding: 0;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 320px);
}

/* 今日推荐视图样式 */
.today-view {
  margin: 15px;
  background-color: var(--bg-card);
  border-radius: 16px;
  box-shadow: 0 2px 12px var(--shadow);
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
  background-color: var(--bg-hover);
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 100px;
  border-bottom: 1px solid #e0e0e0;
}

/* 今天的特殊样式 */
.week-day-row.is-today {
  background: var(--primary-light);
  border-left: 4px solid var(--primary);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.week-day-row:active {
  background-color: var(--bg-hover);
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
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.day-number {
  font-size: 18px;
  font-weight: bold;
  color: var(--text-primary);
}

.today-badge {
  font-size: 10px;
  color: #fff;
  background: var(--primary);
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
  color: var(--text-tertiary);
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
  background: var(--bg-card);
  padding: 12px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
  box-shadow: 0 -2px 8px var(--shadow);
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
  background: var(--bg-card);
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border-light);
}

.popup-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.popup-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-btn {
  padding: 6px 12px;
  font-size: 13px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 16px;
}

.close-icon {
  font-size: 20px;
  color: var(--text-tertiary);
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
  color: var(--text-tertiary);
}

.add-btn-small {
  padding: 8px 16px;
  font-size: 13px;
  background: var(--primary);
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
  background-color: var(--border-light);
  margin: 12px 0;
}

/* 添加电影弹窗 */
.add-movie-popup {
  width: 100%;
  height: 60%;
  background: var(--bg-card);
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
}

.search-section {
  padding: 12px;
  border-bottom: 1px solid var(--border-light);
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--bg-page);
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
  color: var(--text-tertiary);
}

.result-list {
  padding: 12px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--bg-hover);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
}

.result-item:active {
  background: var(--bg-hover);
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
  color: var(--text-primary);
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
  color: var(--text-tertiary);
}

.plus-icon {
  font-size: 20px;
  color: var(--primary);
  margin-left: 8px;
}

.empty-search {
  padding: 40px;
  text-align: center;
}

.empty-search .empty-text {
  font-size: 14px;
  color: var(--text-tertiary);
}
</style>