<template>
  <view
    class="movie-card-vertical"
    :class="{ 'movie-card-vertical--clickable': clickable }"
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
      </view>
    </view>

    <view v-if="showStatus && movie.status" class="status-dot" :class="statusDotClass"></view>
  </view>
</template>

<script>
import { sharedProps, getStatusType, getStatusText, getRankingClass, getStatusDotClass } from './shared.js'

export default {
  name: 'MovieCardVertical',
  props: sharedProps,
  computed: {
    statusType() {
      return getStatusType(this.movie.status)
    },
    statusText() {
      return getStatusText(this.movie.status)
    },
    statusDotClass() {
      return getStatusDotClass(this.movie.status)
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
.movie-card-vertical {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 70px;
  flex-shrink: 0;
  padding: 4px;
  transition: transform 0.2s;
}

.movie-card-vertical--clickable:active {
  transform: scale(0.98);
}

.card-poster {
  width: 48px;
  height: 64px;
  border-radius: 4px;
  background-color: #ddd;
  flex-shrink: 0;
}

.card-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.card-title {
  font-size: 11px;
  color: #666;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  line-height: 1.2;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 2px;
}

.card-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  color: #ff9800;
  font-weight: 600;
}

.star-icon {
  font-size: 9px;
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
