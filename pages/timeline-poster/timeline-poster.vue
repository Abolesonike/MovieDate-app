<template>
  <view class="container">
    <!-- 时间范围选择器 -->
    <view class="period-bar">
      <view
        v-for="opt in periodOptions"
        :key="opt.value"
        :class="['period-item', selectedPeriod === opt.value ? 'active' : '']"
        @click="selectPeriod(opt.value)"
      >
        <text class="period-text">{{ opt.label }}</text>
      </view>
    </view>

    <!-- 时间轴内容 -->
    <scroll-view class="timeline-scroll" scroll-y>
      <view v-if="groupedMovies.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">🎬</text>
        <text class="empty-title">该时间段暂无观影记录</text>
        <text class="empty-subtitle">去看电影并标记为已看吧</text>
      </view>

      <view v-else class="timeline-body">
        <view
          v-for="yearGroup in groupedMovies"
          :key="yearGroup.year"
          class="year-section"
        >
          <!-- 年份标题 -->
          <view class="year-header">
            <view class="timeline-line"></view>
            <view class="timeline-dot year-dot"></view>
            <text class="year-title">{{ yearGroup.year }}年</text>
          </view>

          <!-- 月份分组 -->
          <view
            v-for="monthGroup in yearGroup.months"
            :key="monthGroup.month"
            class="month-section"
          >
            <view class="month-header">
              <view class="timeline-line"></view>
              <view class="timeline-dot month-dot"></view>
              <text class="month-title">{{ monthGroup.month }}月</text>
              <text class="month-count">看过 {{ monthGroup.movies.length }}</text>
            </view>

            <!-- 月度海报缩略 -->
            <view class="month-posters">
              <view class="timeline-line"></view>
              <view class="poster-row">
                <image
                  v-for="movie in monthGroup.movies"
                  :key="'poster-' + movie.id"
                  :src="movie.poster || '/static/default-poster.png'"
                  class="month-poster"
                  mode="aspectFill"
                />
              </view>
            </view>

            <!-- 电影条目 -->
            <view
              v-for="movie in monthGroup.movies"
              :key="movie.id"
              class="movie-entry"
            >
              <view class="timeline-line"></view>
              <view class="timeline-dot entry-dot"></view>
              <view class="entry-body">
                <text class="entry-date">{{ formatDay(movie.watchedDate) }}日</text>
                <view class="entry-card">
                  <image
                    :src="movie.poster || '/static/default-poster.png'"
                    class="entry-poster"
                    mode="aspectFill"
                  />
                  <view class="entry-info">
                    <view class="entry-meta">
                      <text class="entry-status">看过</text>
                      <text v-if="movie.userRating" class="entry-stars">{{ '⭐'.repeat(movie.userRating) }}</text>
                    </view>
                    <text class="entry-title">{{ movie.title }}({{ movie.year }})</text>
                    <text v-if="movie.userReview" class="entry-review">{{ movie.userReview }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部留白 -->
        <view class="timeline-footer"></view>
      </view>

      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>
    </scroll-view>

    <!-- 导出按钮 -->
    <view v-if="groupedMovies.length > 0" class="fab" @click="onExport">
      <text class="fab-icon">📷</text>
      <text class="fab-text">导出图片</text>
    </view>

    <!-- 隐藏 canvas -->
    <canvas canvas-id="timelineCanvas" class="share-canvas"></canvas>

    <!-- 预览弹窗 -->
    <view v-if="previewImage" class="preview-mask" @click="closePreview">
      <view class="preview-content" @click.stop>
        <image
          class="preview-img"
          :src="previewImage"
          mode="widthFix"
          show-menu-by-longpress
        />
        <view class="preview-actions">
          <view class="preview-btn primary" @click="saveImage">
            <text>保存到相册</text>
          </view>
          <view class="preview-btn" @click="closePreview">
            <text>关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import tmdbApi from '@/utils/tmdb.js'
import storage from '@/utils/storage.js'
import { generateTimelinePosterImage } from '@/utils/posterShare.js'

export default {
  data() {
    return {
      loading: false,
      selectedPeriod: 12,
      periodOptions: [
        { label: '半年', value: 6 },
        { label: '1年', value: 12 },
        { label: '2年', value: 24 },
        { label: '3年', value: 36 }
      ],
      rawWatchedData: [],
      groupedMovies: [],
      previewImage: ''
    }
  },

  onLoad() {
    this.loadData()
  },

  methods: {
    selectPeriod(value) {
      if (this.selectedPeriod === value) return
      this.selectedPeriod = value
      this.loadData()
    },

    getPeriodStartDate() {
      const now = new Date()
      now.setMonth(now.getMonth() - this.selectedPeriod)
      now.setHours(0, 0, 0, 0)
      return now
    },

    async loadData() {
      this.loading = true
      try {
        // 1. 获取全部已看列表
        const watchedList = storage.getWatchedList()
        if (!watchedList || watchedList.length === 0) {
          this.groupedMovies = []
          this.loading = false
          return
        }

        // 2. 按时间范围过滤
        const startDate = this.getPeriodStartDate()
        this.rawWatchedData = watchedList.filter(item => {
          const watchedTimestamp = item.timeline?.watched?.timestamp
          return watchedTimestamp && watchedTimestamp >= startDate.getTime()
        })

        if (this.rawWatchedData.length === 0) {
          this.groupedMovies = []
          this.loading = false
          return
        }

        // 3. 并发获取电影详情
        const moviePromises = this.rawWatchedData.map(async (item) => {
          try {
            const details = await tmdbApi.getMovieDetails(item.movieId)
            return {
              ...details,
              userRating: item.timeline?.watched?.rating,
              userReview: item.timeline?.watched?.review,
              watchedDate: item.timeline?.watched?.date
            }
          } catch (error) {
            console.error(`[TimelinePoster] 获取电影详情失败: ${item.movieId}`, error)
            return null
          }
        })

        const movies = (await Promise.all(moviePromises)).filter(m => m !== null)

        // 4. 按时间倒序分组
        this.groupedMovies = this.groupMovies(movies)
      } catch (error) {
        console.error('[TimelinePoster] 加载数据失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    groupMovies(movies) {
      // 按日期倒序
      movies.sort((a, b) => {
        const ta = new Date(a.watchedDate || '1970-01-01').getTime()
        const tb = new Date(b.watchedDate || '1970-01-01').getTime()
        return tb - ta
      })

      const yearMap = new Map()

      movies.forEach(movie => {
        const date = new Date(movie.watchedDate || '1970-01-01')
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()

        if (!yearMap.has(year)) {
          yearMap.set(year, { year, months: new Map() })
        }
        const yearGroup = yearMap.get(year)

        if (!yearGroup.months.has(month)) {
          yearGroup.months.set(month, { month, movies: [] })
        }
        const monthGroup = yearGroup.months.get(month)
        monthGroup.movies.push({ ...movie, day })
      })

      // 转换为数组并排序
      return Array.from(yearMap.values()).map(yg => ({
        year: yg.year,
        months: Array.from(yg.months.values())
          .sort((a, b) => b.month - a.month)
      })).sort((a, b) => b.year - a.year)
    },

    formatDay(dateStr) {
      if (!dateStr) return '--'
      const parts = dateStr.split('-')
      return parts[2] || '--'
    },

    async onExport() {
      if (this.groupedMovies.length === 0) return
      uni.showLoading({ title: '生成中...', mask: true })
      try {
        const periodLabel = this.periodOptions.find(o => o.value === this.selectedPeriod)?.label || ''
        const path = await generateTimelinePosterImage({
          title: '观影时间轴',
          subtitle: `近${periodLabel} 已看 ${this.rawWatchedData.length} 部`,
          groupedMovies: this.groupedMovies,
          canvasId: 'timelineCanvas',
          componentThis: this
        })
        this.previewImage = path
      } catch (error) {
        console.error('生成时间轴海报失败:', error)
        uni.showToast({ title: '生成失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    closePreview() {
      this.previewImage = ''
    },

    async saveImage() {
      try {
        await uni.saveImageToPhotosAlbum({ filePath: this.previewImage })
        uni.showToast({ title: '已保存到相册', icon: 'success' })
      } catch (e) {
        if (e.errMsg && e.errMsg.includes('auth deny')) {
          uni.showModal({
            title: '需要授权',
            content: '请允许保存图片到相册',
            success: (res) => {
              if (res.confirm) uni.openSetting()
            }
          })
        } else {
          uni.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
}

/* 顶部时间选择器 */
.period-bar {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  padding: 24rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.period-item {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background: #f0f0f0;

  &.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
}

.period-text {
  font-size: 26rpx;
  color: #666;

  .period-item.active & {
    color: #fff;
    font-weight: 600;
  }
}

/* 时间轴滚动区 */
.timeline-scroll {
  flex: 1;
  min-height: 0;
}

.timeline-body {
  padding: 20rpx 30rpx 40rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.empty-title {
  font-size: 32rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.empty-subtitle {
  font-size: 26rpx;
  color: #999;
  text-align: center;
}

.loading-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 26rpx;
}

/* 年份区块 */
.year-section {
  margin-bottom: 20rpx;
}

.year-header {
  position: relative;
  padding-left: 40rpx;
  padding-bottom: 20rpx;
  display: flex;
  align-items: center;
}

.year-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #1a1a1a;
  margin-left: 24rpx;
}

/* 月份区块 */
.month-section {
  margin-bottom: 16rpx;
}

.month-header {
  position: relative;
  padding-left: 40rpx;
  padding-top: 16rpx;
  padding-bottom: 12rpx;
  display: flex;
  align-items: center;
}

.month-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-left: 24rpx;
}

.month-count {
  font-size: 24rpx;
  color: #999;
  margin-left: 16rpx;
}

/* 时间线公共元素 */
.timeline-line {
  position: absolute;
  left: 10rpx;
  top: 0;
  bottom: 0;
  width: 2rpx;
  background: #e0e0e0;
}

.timeline-dot {
  position: absolute;
  left: 0;
  border-radius: 50%;
  background: #fff;
  border: 2rpx solid #ccc;
}

.year-dot {
  width: 20rpx;
  height: 20rpx;
  top: 50%;
  margin-top: -10rpx;
  border-color: #999;
  background: #999;
}

.month-dot {
  width: 16rpx;
  height: 16rpx;
  top: 50%;
  margin-top: -8rpx;
  border-color: #bbb;
}

.entry-dot {
  width: 12rpx;
  height: 12rpx;
  top: 24rpx;
  border-color: #667eea;
  background: #667eea;
}

/* 月度海报缩略 */
.month-posters {
  position: relative;
  padding-left: 40rpx;
  padding-top: 12rpx;
  padding-bottom: 16rpx;
}

.poster-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.month-poster {
  width: 100rpx;
  height: 150rpx;
  border-radius: 8rpx;
  background: #e0e0e0;
}

/* 电影条目 */
.movie-entry {
  position: relative;
  padding-left: 40rpx;
  padding-top: 8rpx;
  padding-bottom: 20rpx;
}

.entry-body {
  padding-left: 24rpx;
}

.entry-date {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 10rpx;
}

.entry-card {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.entry-poster {
  width: 100rpx;
  height: 150rpx;
  border-radius: 8rpx;
  background: #e0e0e0;
  flex-shrink: 0;
}

.entry-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.entry-status {
  font-size: 22rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.entry-stars {
  font-size: 22rpx;
}

.entry-title {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  line-height: 1.4;
}

.entry-review {
  font-size: 24rpx;
  color: #666;
  margin-top: 10rpx;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.timeline-footer {
  height: 40rpx;
}

/* 导出按钮 */
.fab {
  position: fixed;
  right: 30rpx;
  bottom: 60rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 60rpx;
  padding: 20rpx 34rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 8rpx 30rpx rgba(102, 126, 234, 0.35);
  z-index: 100;
}

.fab-icon {
  font-size: 32rpx;
  margin-right: 10rpx;
}

.fab-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

/* 隐藏 canvas */
.share-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 750px;
  height: 30000px;
  pointer-events: none;
}

/* 预览弹窗 */
.preview-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 40rpx;
}

.preview-content {
  width: 100%;
  max-width: 640rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  padding: 20rpx;
}

.preview-img {
  width: 100%;
  border-radius: 12rpx;
  display: block;
}

.preview-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.preview-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 12rpx;
  background: #f0f0f0;

  text {
    font-size: 28rpx;
    color: #666;
  }

  &.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

    text {
      color: #fff;
      font-weight: 600;
    }
  }
}
</style>
