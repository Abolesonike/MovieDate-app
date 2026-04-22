<template>
  <view
    class="playlist-card"
    :class="{ 'playlist-card--clickable': clickable }"
    @click="handleClick"
  >
    <view class="playlist-info">
      <view class="playlist-header">
        <text class="playlist-icon">📋</text>
        <text class="playlist-name">{{ playlist.name }}</text>
      </view>

      <view class="playlist-meta">
        <text class="playlist-progress">🏆 {{ progress.watched }}/{{ progress.total }} 已完成</text>
      </view>

      <view v-if="playlist.tags && playlist.tags.length > 0" class="playlist-tags">
        <text v-for="tag in playlist.tags.slice(0, 3)" :key="tag" class="tag-item">{{ tag }}</text>
      </view>
    </view>

    <view class="playlist-arrow">›</view>
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
  methods: {
    handleClick() {
      if (this.clickable) {
        this.$emit('click', this.playlist)
      }
    }
  }
}
</script>

<style scoped>
.playlist-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.playlist-card--clickable:active {
  transform: scale(0.98);
}

.playlist-info {
  flex: 1;
  min-width: 0;
}

.playlist-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.playlist-icon {
  font-size: 18px;
  margin-right: 8px;
}

.playlist-name {
  font-size: 16px;
  color: #333;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-meta {
  margin-bottom: 8px;
}

.playlist-progress {
  font-size: 13px;
  color: #666;
}

.playlist-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  display: inline-block;
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 11px;
  color: #666;
}

.playlist-arrow {
  font-size: 20px;
  color: #ccc;
  margin-left: 12px;
}
</style>
