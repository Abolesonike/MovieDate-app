<template>
  <view
    class="movie-card-horizontal"
    :class="{ 'movie-card-horizontal--clickable': clickable }"
    @click="handleClick"
  >
    <view v-if="ranking" class="card-ranking" :class="getRankingClass(ranking)">
      {{ ranking }}
    </view>

    <image
      v-if="clickable"
      :src="movie.poster"
      class="card-poster"
      mode="aspectFill"
      @click.stop="handlePosterClick"
    />
    <image
      v-else
      :src="movie.poster"
      class="card-poster"
      mode="aspectFill"
    />

    <view class="card-content">
      <text class="card-title">{{ movie.title }}</text>
      <view class="card-meta">
        <text class="card-rating">
          <text class="star-icon">⭐</text>
          {{ movie.rating }}
        </text>
        <text v-if="showGenre" class="card-genre">{{ movie.genre }}</text>
        <text v-if="showYear" class="card-year">{{ movie.year }}</text>
      </view>
      <text v-if="showSummary" class="card-summary">{{ movie.summary || '暂无简介' }}</text>

      <view v-if="showStatus" class="card-status">
        <view class="status-tag" :class="'tag-' + statusType">
          {{ statusText }}
        </view>
      </view>
      <slot name="extra"></slot>
    </view>
  </view>
</template>

<script>
import { sharedProps, getStatusType, getStatusText, getRankingClass } from './shared.js'

export default {
  name: 'MovieCardHorizontal',
  props: sharedProps,
  computed: {
    statusType() {
      return getStatusType(this.movie.status)
    },
    statusText() {
      return getStatusText(this.movie.status)
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
    getRankingClass
  }
}
</script>

<style scoped>
.movie-card-horizontal {
  position: relative;
  display: flex;
  background: var(--bg-card);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.movie-card-horizontal--clickable:active {
  transform: scale(0.98);
}

.card-poster {
  width: 100px;
  height: 150px;
  background-color: var(--bg-hover);
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.card-title {
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  margin-bottom: 8px;
}

.card-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ff976a;
  font-weight: 600;
}

.star-icon {
  font-size: 12px;
}

.card-genre,
.card-year {
  color: var(--text-tertiary);
}

.card-summary {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-status {
  margin-top: auto;
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
  color: var(--text-secondary);
  background: var(--bg-page);
  border-radius: 0 0 8px 0;
  z-index: 1;
}

.card-ranking.gold {
  background: #FFD700;
  color: #fff;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
}

.card-ranking.silver {
  background: #C0C0C0;
  color: #fff;
  box-shadow: 0 2px 8px rgba(192, 192, 192, 0.4);
}

.card-ranking.bronze {
  background: #CD7F32;
  color: #fff;
  box-shadow: 0 2px 8px rgba(205, 127, 50, 0.4);
}

/* 状态标签样式 */
.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
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
</style>
