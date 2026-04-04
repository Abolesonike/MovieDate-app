<template>
  <view
    class="movie-card"
    :class="[`movie-card--${variant}`, { 'movie-card--clickable': clickable }]"
    @click="handleClick"
  >
    <!-- 排名（可选） -->
    <view v-if="ranking" class="card-ranking" :class="getRankingClass(ranking)">
      {{ ranking }}
    </view>

    <!-- 海报 -->
    <image
      :src="movie.poster"
      class="card-poster"
      mode="aspectFill"
      @click.stop="handlePosterClick"
      v-if="clickable"
    />
    <image
      v-else
      :src="movie.poster"
      class="card-poster"
      mode="aspectFill"
    />

    <!-- 内容 -->
    <view class="card-content">
      <text class="card-title">{{ movie.title }}</text>
      <view class="card-meta">
        <text class="card-rating">
          <van-icon name="star" :size="ratingIconSize" color="#ff976a" />
          {{ movie.rating }}
        </text>
        <text v-if="showGenre" class="card-genre">{{ movie.genre }}</text>
        <text v-if="showYear" class="card-year">{{ movie.year }}</text>
      </view>
      <text v-if="shouldShowSummary" class="card-summary">{{ movie.summary || '暂无简介' }}</text>

      <!-- 状态标签 -->
      <view v-if="showStatus" class="card-status">
        <van-tag :type="statusType" :size="variant === 'compact' ? 'mini' : 'small'">
          {{ statusText }}
        </van-tag>
      </view>
    </view>

    <!-- 状态标记点（vertical 变体） -->
    <view v-if="variant === 'vertical' && showStatusDot" class="status-dot" :class="statusDotClass"></view>
  </view>
</template>

<script>
import { MOVIE_STATUS } from '@/utils/storage.js'

export default {
  name: 'MovieCard',
  props: {
    // 电影数据
    movie: {
      type: Object,
      required: true
    },
    // 变体类型
    variant: {
      type: String,
      default: 'horizontal',
      validator: (value) => ['horizontal', 'compact', 'vertical'].includes(value)
    },
    // 是否显示状态
    showStatus: {
      type: Boolean,
      default: false
    },
    // 是否可点击
    clickable: {
      type: Boolean,
      default: true
    },
    // 是否显示类型
    showGenre: {
      type: Boolean,
      default: true
    },
    // 是否显示年份
    showYear: {
      type: Boolean,
      default: true
    },
    // 是否显示简介
    showSummary: {
      type: Boolean,
      default: true
    },
    // 排名（仅 Top250 使用）
    ranking: {
      type: Number,
      default: null
    }
  },
  computed: {
    ratingIconSize() {
      return this.variant === 'compact' ? 10 : 12
    },
    shouldShowSummary() {
      // compact 类型不显示简介
      if (this.variant === 'compact') {
        return false
      }
      return this.showSummary
    },
    statusType() {
      const map = {
        [MOVIE_STATUS.UNWATCHED]: 'default',
        [MOVIE_STATUS.WANT_TO_WATCH]: 'warning',
        [MOVIE_STATUS.PLANNED]: 'primary',
        [MOVIE_STATUS.WATCHED]: 'success'
      }
      return map[this.movie.status] || 'default'
    },
    statusText() {
      const map = {
        [MOVIE_STATUS.UNWATCHED]: '未看',
        [MOVIE_STATUS.WANT_TO_WATCH]: '想看',
        [MOVIE_STATUS.PLANNED]: '待看',
        [MOVIE_STATUS.WATCHED]: '已看'
      }
      return map[this.movie.status] || '未看'
    },
    showStatusDot() {
      return this.showStatus && this.movie.status
    },
    statusDotClass() {
      if (this.movie.status === MOVIE_STATUS.WATCHED) return 'watched-dot'
      if (this.movie.status === MOVIE_STATUS.PLANNED) return 'planned-dot'
      return ''
    }
  },
  methods: {
    handleClick() {
      if (this.clickable) {
        this.$emit('click', this.movie)
      }
    },
    handlePosterClick() {
      this.$emit('poster-click', this.movie)
    },
    getRankingClass(index) {
      if (index === 1) return 'gold'
      if (index === 2) return 'silver'
      if (index === 3) return 'bronze'
      return ''
    }
  }
}
</script>

<style scoped>
/* 基础样式 */
.movie-card {
  position: relative;
  transition: transform 0.2s;
}

.movie-card--clickable:active {
  transform: scale(0.98);
}

/* ========== horizontal 变体（默认）========== */
.movie-card--horizontal {
  display: flex;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.movie-card--horizontal .card-poster {
  width: 100px;
  height: 150px;
  background-color: #f0f0f0;
  flex-shrink: 0;
}

.movie-card--horizontal .card-content {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.movie-card--horizontal .card-title {
  font-size: 16px;
  color: #333;
  font-weight: 600;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.movie-card--horizontal .card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  margin-bottom: 8px;
}

.movie-card--horizontal .card-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ff976a;
  font-weight: 600;
}

.movie-card--horizontal .card-genre {
  color: #999;
}

.movie-card--horizontal .card-year {
  color: #999;
}

.movie-card--horizontal .card-summary {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.movie-card--horizontal .card-status {
  margin-top: auto;
}

/* ========== compact 变体（紧凑型）========== */
.movie-card--compact {
  display: flex;
  background: #fff;
  border-radius: 8px;
  margin-top: 6px;
  margin-bottom: 6px;
  margin-left: 3px;
  margin-right: 3px;
  padding: 12px;
  box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.08);
}

.movie-card--compact .card-poster {
  width: 60px;
  height: 90px;
  border-radius: 4px;
  background-color: #ddd;
  flex-shrink: 0;
  margin-right: 12px;
}

.movie-card--compact .card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 6px;
  min-width: 0;
}

.movie-card--compact .card-title {
  font-size: 15px;
  color: #333;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.movie-card--compact .card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.movie-card--compact .card-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ff9800;
  font-weight: 500;
}

.movie-card--compact .card-genre {
  color: #999;
}

.movie-card--compact .card-year {
  color: #999;
}

.movie-card--compact .card-status {
  align-self: flex-start;
}

/* ========== vertical 变体（纵向小卡片）========== */
.movie-card--vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 70px;
  flex-shrink: 0;
  padding: 4px;
}

.movie-card--vertical .card-poster {
  width: 48px;
  height: 64px;
  border-radius: 4px;
  background-color: #ddd;
  flex-shrink: 0;
}

.movie-card--vertical .card-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.movie-card--vertical .card-title {
  font-size: 11px;
  color: #666;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  line-height: 1.2;
}

.movie-card--vertical .card-meta {
  display: flex;
  align-items: center;
  gap: 2px;
}

.movie-card--vertical .card-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  color: #ff9800;
  font-weight: 600;
}

.movie-card--vertical .card-rating text {
  font-size: 9px;
}

.movie-card--vertical .card-genre,
.movie-card--vertical .card-year,
.movie-card--vertical .card-summary,
.movie-card--vertical .card-status {
  display: none;
}

/* 状态标记点 */
.status-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.watched-dot {
  background-color: #07c160;
}

.status-dot.planned-dot {
  background-color: #1989fa;
}

/* 排名样式 */
.card-ranking {
  position: absolute;
  left: 0;
  top: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #666;
  background: #f5f5f5;
  border-radius: 0 0 8px 0;
  z-index: 1;
}

.card-ranking.gold {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
}

.card-ranking.silver {
  background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(192, 192, 192, 0.4);
}

.card-ranking.bronze {
  background: linear-gradient(135deg, #cd7f32 0%, #e8a87c 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(205, 127, 50, 0.4);
}
</style>
