<template>
  <view class="playlist-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <text class="nav-title">片单</text>
      <view class="nav-actions">
        <text class="nav-add" @click="goToCreate">+</text>
      </view>
    </view>

    <!-- 片单列表 -->
    <scroll-view
      class="playlist-list"
      scroll-y
      @pullingdown="onPullDownRefresh"
    >
      <view class="list-content">
        <!-- 空状态 -->
        <view v-if="playlists.length === 0 && !isLoading" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">还没有片单</text>
          <text class="empty-hint">创建你的第一个片单吧</text>
          <view class="empty-action" @click="goToCreate">
            <text>+ 新建片单</text>
          </view>
        </view>

        <!-- 片单双列网格 -->
        <view v-else class="playlist-grid">
          <view
            v-for="playlist in playlists"
            :key="playlist.id"
            class="playlist-grid-item"
          >
            <playlist-card
              :playlist="playlist"
              :progress="getPlaylistProgress(playlist.id)"
              @click="goToDetail(playlist)"
            />
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import storage from '@/utils/storage.js'
import PlaylistCard from '@/components/playlist-card/index.vue'

export default {
  components: {
    PlaylistCard
  },
  data() {
    return {
      playlists: [],
      isLoading: true
    }
  },
  onLoad() {
    this.loadPlaylists()
  },
  onShow() {
    this.loadPlaylists()
  },
  onPullDownRefresh() {
    this.loadPlaylists()
    setTimeout(() => {
      uni.stopPullDownRefresh()
    }, 500)
  },
  methods: {
    loadPlaylists() {
      this.isLoading = true
      this.playlists = storage.getAllPlaylists()
      this.isLoading = false
    },
    getPlaylistProgress(playlistId) {
      return storage.getPlaylistProgress(playlistId)
    },
    goToDetail(playlist) {
      uni.navigateTo({
        url: `/pages/playlist/detail/index?playlistId=${playlist.id}`
      })
    },
    goToCreate() {
      uni.navigateTo({
        url: '/pages/playlist/edit/index'
      })
    }
  }
}
</script>

<style scoped>
.playlist-page {
  height: 100vh;
  background: var(--bg-page);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.nav-actions {
  display: flex;
  gap: 16px;
}

.nav-add {
  font-size: 24px;
  color: #007AFF;
  padding: 4px 8px;
}

.playlist-list {
  height: calc(100vh - 50px);
}

.list-content {
  padding: 24rpx;
}

/* 双列网格 */
.playlist-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.playlist-grid-item {
  width: calc((100% - 16rpx) / 2);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 96rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 32rpx;
  color: var(--text-primary);
  margin-bottom: 16rpx;
  font-weight: 500;
}

.empty-hint {
  font-size: 28rpx;
  color: var(--text-tertiary);
  margin-bottom: 48rpx;
}

.empty-action {
  background: #007AFF;
  color: #fff;
  padding: 20rpx 48rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
}
</style>
