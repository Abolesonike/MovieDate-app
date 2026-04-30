<template>
  <view
    class="playlist-card"
    :class="{ 'playlist-card--clickable': clickable }"
    @click="handleClick"
  >
    <!-- 封面区域 -->
    <view class="cover-wrapper">
      <image
        v-if="playlist.coverImage"
        class="cover-image"
        :src="playlist.coverImage"
        mode="aspectFill"
        @error="onCoverError"
      />
      <view v-else class="cover-placeholder">
        <text class="cover-placeholder-icon">📋</text>
        <text class="cover-placeholder-text">片单</text>
      </view>

      <!-- 渐变遮罩 + 信息叠加 -->
      <view class="cover-overlay">
        <view class="cover-content">
          <text class="playlist-name">{{ playlist.name }}</text>
          <view class="progress-row">
            <text class="progress-text">🏆 {{ progress.watched || 0 }}/{{ progress.total || 0 }}</text>
            <view class="progress-bar">
              <view
                class="progress-fill"
                :style="{ width: (progress.progress || 0) + '%' }"
              />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 信息区域 -->
    <view class="info-section">
      <!-- 标签 -->
      <view v-if="playlist.tags && playlist.tags.length > 0" class="playlist-tags">
        <text v-for="tag in displayTags" :key="tag" class="tag-item">{{ tag }}</text>
      </view>

      <!-- 描述 + 数量 -->
      <view v-if="playlist.description || movieCount > 0" class="playlist-meta">
        <text class="meta-text">{{ metaText }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'PlaylistCard',
  props: {
    playlist: {
      type: Object,
      required: true
    },
    progress: {
      type: Object,
      default: () => ({ total: 0, watched: 0, progress: 0 })
    },
    clickable: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    displayTags() {
      if (!this.playlist.tags || this.playlist.tags.length === 0) return []
      return this.playlist.tags.slice(0, 2)
    },
    movieCount() {
      return this.playlist.movieIds ? this.playlist.movieIds.length : 0
    },
    metaText() {
      const parts = []
      if (this.movieCount > 0) {
        parts.push(`${this.movieCount}部`)
      }
      if (this.playlist.description) {
        parts.push(this.playlist.description)
      }
      return parts.join(' · ')
    }
  },
  methods: {
    handleClick() {
      if (this.clickable) {
        this.$emit('click', this.playlist)
      }
    },
    onCoverError() {
      // 封面加载失败时，由 v-if 切换为占位图
      // 但 image 的 src 已绑定，需要通过修改数据来处理
      // 这里 emit 事件让父组件处理
      this.$emit('cover-error', this.playlist.id)
    }
  }
}
</script>

<style scoped>
.playlist-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx var(--shadow);
  transition: transform 0.15s;
}

.playlist-card--clickable:active {
  transform: scale(0.97);
}

/* 封面区域 */
.cover-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 150%; /* 2:3 比例 */
  border-radius: 16rpx 16rpx 0 0;
  overflow: hidden;
}

.cover-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
}

.cover-placeholder-icon {
  font-size: 48rpx;
  margin-bottom: 8rpx;
}

.cover-placeholder-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 渐变遮罩 + 叠加信息 */
.cover-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 80rpx 16rpx 16rpx;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.75) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0) 100%
  );
}

.cover-content {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.playlist-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.progress-text {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
}

.progress-bar {
  flex: 1;
  height: 6rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #ffffff;
  border-radius: 3rpx;
  transition: width 0.3s ease;
}

/* 信息区域 */
.info-section {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.playlist-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.tag-item {
  display: inline-block;
  padding: 4rpx 12rpx;
  background: var(--primary-light);
  border-radius: 8rpx;
  font-size: 20rpx;
  color: var(--primary);
}

.playlist-meta {
  min-width: 0;
}

.meta-text {
  font-size: 22rpx;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
</style>
