<template>
  <view
    class="movie-card-compact"
    :class="{ 'movie-card-compact--clickable': clickable }"
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

      <view v-if="showStatus" class="card-status">
        <view class="status-tag tag-mini" :class="'tag-' + statusType">
          {{ statusText }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { sharedProps, getStatusType, getStatusText, getRankingClass } from './shared.js'

export default {
  name: 'MovieCardCompact',
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
.movie-card-compact {
  position: relative;
  display: flex;
  background: var(--bg-card);
  border-radius: 8px;
  margin: 6px 3px;
  padding: 12px;
  box-shadow: 1px 1px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.movie-card-compact--clickable:active {
  transform: scale(0.98);
}

.card-poster {
  width: 60px;
  height: 90px;
  border-radius: 4px;
  background-color: #ddd;
  flex-shrink: 0;
  margin-right: 12px;
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 6px;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.card-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #ff9800;
  font-weight: 500;
}

.star-icon {
  font-size: 10px;
}

.card-genre,
.card-year {
  color: var(--text-tertiary);
}

.card-status {
  align-self: flex-start;
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

.tag-mini {
  font-size: 10px;
  padding: 1px 6px;
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
