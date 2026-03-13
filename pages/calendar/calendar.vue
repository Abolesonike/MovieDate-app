
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
              <view
                v-for="(movie, mIndex) in day.movies"
                :key="mIndex"
                class="movie-item"
                :class="{ 'watched': movie.status === 'watched', 'planned': movie.status === 'planned' }"
              >
                <image
                  v-if="movie.poster"
                  :src="movie.poster"
                  class="movie-poster"
                  mode="aspectFill"
                />
                <view v-else class="movie-poster-placeholder">
                  <van-icon name="film-o" size="20" />
                </view>
                <text class="movie-title">{{ movie.title || '电影' }}</text>
                <!-- 评分显示 -->
                <view v-if="movie.rating" class="movie-rating">
                  <van-icon name="star" size="10" color="#ff9800" />
                  <text>{{ movie.rating }}</text>
                </view>
              </view>
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
          <text class="popup-title">{{ selectedDateStr }} - 电影列表</text>
          <van-icon name="cross" size="20" @click="closePopup" />
        </view>
        
        <scroll-view scroll-y class="movie-list-container">
          <view v-for="(movie, index) in selectedDayMovies" :key="index" class="movie-detail-item">
            <view class="movie-info-row">
              <image
                v-if="movie.poster"
                :src="movie.poster"
                class="detail-poster"
                mode="aspectFill"
              />
              <view v-else class="detail-poster-placeholder">
                <van-icon name="film-o" size="30" />
              </view>
              
              <view class="movie-info">
                <text class="detail-title">{{ movie.title }}</text>
                <view class="status-tags">
                  <van-tag v-if="movie.status === 'watched'" type="primary" size="mini">已观看</van-tag>
                  <van-tag v-else type="success" size="mini">计划观看</van-tag>
                  <van-tag v-if="isPastDate" type="warning" size="mini">过去日期</van-tag>
                  <van-tag v-else-if="isFutureDate" type="default" size="mini">未来日期</van-tag>
                </view>
              </view>
            </view>
            
            <!-- 评分和评价区域 -->
            <view class="rating-review-section">
              <!-- 评分 -->
              <view class="rating-section">
                <text class="section-label">评分：</text>
                <view v-if="movie.status === 'watched' || movie.rating" class="rating-display">
                  <van-rate
                    v-model="movie.rating"
                    size="18"
                    :readonly="false"
                    allow-half
                    @change="onRatingChange(movie)"
                  />
                </view>
                <text v-else class="no-rating-text">未评分</text>
              </view>
              
              <!-- 评价 -->
              <view class="review-section">
                <text class="section-label">评价：</text>
                <van-field
                  v-model="movie.review"
                  type="textarea"
                  placeholder="写下你的观影感受..."
                  :readonly="!isPastDate"
                  :disabled="!isPastDate && movie.status !== 'watched'"
                  rows="3"
                  show-word-limit
                  maxlength="200"
                  @blur="onReviewChange(movie)"
                />
              </view>
              
              <!-- 状态切换按钮（仅过去日期且未观看） -->
              <view v-if="isPastDate && movie.status !== 'watched'" class="action-buttons">
                <van-button
                  type="primary"
                  size="small"
                  block
                  @click="markAsWatched(movie)"
                >
                  标记为已观看
                </van-button>
              </view>
            </view>
            
            <van-divider v-if="index < selectedDayMovies.length - 1" />
          </view>
        </scroll-view>
      </view>
    </van-popup>
  </view>
</template>

<script>
import * as uni from "vant";

export default {
  data() {
    return {
      viewMode: 'week', // 'month' 或 'week'
      currentDate: new Date(),
      weekdays: ['一', '二', '三', '四', '五', '六', '日'],
      calendarDays: [],
      currentWeekDays: [],
      // 模拟电影数据
      movieData: {},
      // 弹窗相关
      showMoviePopup: false,
      selectedDateStr: '',
      selectedDayMovies: [],
      isPastDate: false,
      isFutureDate: false,
      scrollToTodayId: ''
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
        // 计算是当月的第几周（从当月 1 号所在周开始算第 1 周）
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
          total += day.movieCount || 0
        }
      })
      return total
    },
    weekTotalMovies() {
      let total = 0
      this.currentWeekDays.forEach(day => {
        total += day.movies ? day.movies.length : 0
      })
      return total
    }
  },
  mounted() {
    this.initMovieData()
    if (this.viewMode === 'month') {
      this.generateMonthCalendar()
    } else {
      this.generateWeekCalendar()
      this.scrollToToday()
    }
  },
  methods: {
    // 初始化模拟电影数据
    initMovieData() {
      const year = new Date().getFullYear()
      const month = new Date().getMonth()
      
      // 生成一些示例电影数据
      for (let day = 1; day <= 31; day++) {
        const dateKey = `${year}-${month}-${day}`
        // 随机为某些日期分配电影
        if (Math.random() > 0.7) {
          this.movieData[dateKey] = [
            {
              title: `非穷尽列举`,
              poster: 'https://nenya.doubanio.com/view/photo/xl/public/p2929612705.jpg?sa_cv=99b91dbd236203418771e02ceac274bd&sa_ct=69b426bb' // 可以添加实际的海报 URL
            },
            {
              title: `非穷尽列举`,
              poster: 'https://nenya.doubanio.com/view/photo/xl/public/p2929612705.jpg?sa_cv=99b91dbd236203418771e02ceac274bd&sa_ct=69b426bb' // 可以添加实际的海报 URL
            },
            {
              title: `非穷尽列举`,
              poster: 'https://nenya.doubanio.com/view/photo/xl/public/p2929612705.jpg?sa_cv=99b91dbd236203418771e02ceac274bd&sa_ct=69b426bb' // 可以添加实际的海报 URL
            },
            {
              title: `非穷尽列举`,
              poster: 'https://nenya.doubanio.com/view/photo/xl/public/p2929612705.jpg?sa_cv=99b91dbd236203418771e02ceac274bd&sa_ct=69b426bb' // 可以添加实际的海报 URL
            },
            {
              title: `非穷尽列举`,
              poster: 'https://nenya.doubanio.com/view/photo/xl/public/p2929612705.jpg?sa_cv=99b91dbd236203418771e02ceac274bd&sa_ct=69b426bb' // 可以添加实际的海报 URL
            }
          ]
        }
      }
    },
    
    // 切换视图模式
    switchMode(mode) {
      this.viewMode = mode
      if (mode === 'month') {
        this.generateMonthCalendar()
      } else {
        this.generateWeekCalendar()
      }
    },
    
    // 生成月历
    generateMonthCalendar() {
      const year = this.currentDate.getFullYear()
      const month = this.currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())
      
      const days = []
      const today = new Date()
      
      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        const movies = this.movieData[dateKey] || []
        
        days.push({
          day: date.getDate(),
          fullDate: date,
          isCurrentMonth: date.getMonth() === month,
          isToday: this.isSameDate(date, today),
          movieCount: movies.length,
          movies: movies
        })
      }
      
      this.calendarDays = days
    },
    
    // 生成周历
    generateWeekCalendar() {
      const weekStart = this.getWeekStart(this.currentDate)
      const days = []
      const today = new Date()
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + i)
        
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        const movies = this.movieData[dateKey] || []
        
        // 判断是过去、今天还是未来
        const isPast = date < today && !this.isSameDate(date, today)
        const isFuture = date > today && !this.isSameDate(date, today)
        
        days.push({
          day: date.getDate(),
          weekday: this.weekdays[date.getDay()],
          fullDate: date,
          isToday: this.isSameDate(date, today),
          isPast: isPast,
          isFuture: isFuture,
          movies: movies
        })
      }
      
      this.currentWeekDays = days
    },
    
    // 获取一周的起始日期（周日）
    getWeekStart(date) {
      const d = new Date(date)
      const day = d.getDay()
      d.setDate(d.getDate() - day)
      return d
    },
    
    // 获取周数
    getWeekNumber(date) {
      const d = new Date(date)
      const startOfYear = new Date(d.getFullYear(), 0, 1)
      const diff = d - startOfYear
      const oneWeek = 7 * 24 * 60 * 60 * 1000
      return Math.ceil((diff + startOfYear.getDay() * oneWeek) / oneWeek)
    },
    
    // 获取当月第几周（从月的第一天开始算）
    getWeekOfMonth(date) {
      const d = new Date(date)
      const year = d.getFullYear()
      const month = d.getMonth()
      // 获取当月 1 号是星期几
      const firstDayOfMonth = new Date(year, month, 1).getDay()
      // 计算从当月 1 号到当前日期的天数
      const dayOfMonth = d.getDate()
      // 计算周数（向上取整，并考虑 1 号的星期偏移）
      return Math.ceil((dayOfMonth + firstDayOfMonth) / 7)
    },
    
    // 判断两个日期是否为同一天
    isSameDate(date1, date2) {
      return date1.getFullYear() === date2.getFullYear() &&
             date1.getMonth() === date2.getMonth() &&
             date1.getDate() === date2.getDate()
    },
    
    // 上一周期
    prevPeriod() {
      if (this.viewMode === 'month') {
        const newDate = new Date(this.currentDate)
        newDate.setMonth(newDate.getMonth() - 1)
        this.currentDate = newDate
        this.generateMonthCalendar()
      } else {
        const newDate = new Date(this.currentDate)
        newDate.setDate(newDate.getDate() - 7)
        this.currentDate = newDate
        this.generateWeekCalendar()
      }
    },
    
    // 下一周期
    nextPeriod() {
      if (this.viewMode === 'month') {
        const newDate = new Date(this.currentDate)
        newDate.setMonth(newDate.getMonth() + 1)
        this.currentDate = newDate
        this.generateMonthCalendar()
      } else {
        const newDate = new Date(this.currentDate)
        newDate.setDate(newDate.getDate() + 7)
        this.currentDate = newDate
        this.generateWeekCalendar()
      }
    },
    
    // 选择日期
    selectDay(day) {
      const date = day.fullDate
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      const movies = this.movieData[dateKey] || []
      
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const dayNum = date.getDate()
      this.selectedDateStr = `${year}年${month}月${dayNum}日`
      
      // 设置弹窗数据
      this.selectedDayMovies = JSON.parse(JSON.stringify(movies)) // 深拷贝
      this.isPastDate = day.isPast
      this.isFutureDate = day.isFuture
      
      // 打开弹窗
      this.showMoviePopup = true
    },
    
    // 关闭弹窗
    closePopup() {
      this.showMoviePopup = false
    },
    
    // 评分变化
    onRatingChange(movie) {
      // 更新原始数据
      const dateKey = `${movie.id.split('_')[0]}-${movie.id.split('_')[1]}-${movie.id.split('_')[2]}`
      const originalMovie = this.movieData[dateKey]?.find(m => m.id === movie.id)
      if (originalMovie) {
        originalMovie.rating = movie.rating
      }
      uni.showToast({
        title: `评分：${movie.rating}星`,
        icon: 'none'
      })
    },
    
    // 评价变化
    onReviewChange(movie) {
      const dateKey = `${movie.id.split('_')[0]}-${movie.id.split('_')[1]}-${movie.id.split('_')[2]}`
      const originalMovie = this.movieData[dateKey]?.find(m => m.id === movie.id)
      if (originalMovie) {
        originalMovie.review = movie.review
      }
    },
    
    // 标记为已观看
    markAsWatched(movie) {
      movie.status = 'watched'
      movie.rating = 0 // 重置评分以便用户打分
      movie.review = '' // 清空评价
      
      // 同步到原始数据
      const dateKey = `${movie.id.split('_')[0]}-${movie.id.split('_')[1]}-${movie.id.split('_')[2]}`
      const originalMovie = this.movieData[dateKey]?.find(m => m.id === movie.id)
      if (originalMovie) {
        Object.assign(originalMovie, movie)
      }
      
      // 重新生成日历以更新统计
      if (this.viewMode === 'month') {
        this.generateMonthCalendar()
      } else {
        this.generateWeekCalendar()
      }
      
      uni.showToast({
        title: '已标记为已观看',
        icon: 'success'
      })
    },

    goToToday() {
      this.currentDate = new Date()  // 重置为今天
      if (this.viewMode === 'month') {
        this.generateMonthCalendar()
      } else {
        this.generateWeekCalendar()
        this.$nextTick(() => {
          this.scrollToToday()
        })
      }
      uni.showToast({
        title: '已回到今日',
        icon: 'success'
      })
    },

    // 滚动到今天所在的行
    scrollToToday() {
      const todayIndex = this.currentWeekDays.findIndex(day => day.isToday)
      if (todayIndex !== -1) {
        this.scrollToTodayId = 'day-row-' + todayIndex
      }
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

.movie-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 70px;
  flex-shrink: 0;
}

.movie-poster {
  width: 48px;
  height: 64px;
  border-radius: 4px;
  background-color: #ddd;
  flex-shrink: 0;
}

.movie-poster-placeholder {
  width: 48px;
  height: 64px;
  border-radius: 4px;
  background-color: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.movie-title {
  font-size: 11px;
  color: #666;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  line-height: 1.2;
}

.movie-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
}

.movie-rating text {
  font-size: 9px;
  color: #ff9800;
  font-weight: 600;
}

/* 电影详情弹窗样式 */
.movie-detail-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.popup-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.movie-list-container {
  flex: 1;
  overflow-x: hidden;
}

.movie-detail-item {
  margin-bottom: 20px;
  max-width: 100%;
  overflow: hidden;
}

.movie-info-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
  max-width: 100%;
}

.detail-poster {
  width: 80px;
  height: 120px;
  border-radius: 8px;
  background-color: #ddd;
  flex-shrink: 0;
}

.detail-poster-placeholder {
  width: 80px;
  height: 120px;
  border-radius: 8px;
  background-color: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.movie-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0; /* 允许缩小 */
  overflow: hidden; /* 隐藏溢出 */
}

.detail-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  word-break: break-word;
  overflow-wrap: break-word;
}

.status-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 100%;
}

.rating-review-section {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
}

.section-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
  display: block;
  margin-bottom: 8px;
}

.rating-section {
  margin-bottom: 15px;
}

.rating-display {
  display: inline-flex;
  align-items: center;
}

.no-rating-text {
  font-size: 13px;
  color: #999;
}

.review-section :deep(.van-cell) {
  padding: 0;
  background-color: transparent;
}

.review-section :deep(.van-field__control) {
  font-size: 14px;
}

.action-buttons {
  margin-top: 15px;
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