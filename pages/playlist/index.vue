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

        <!-- 片单卡片列表 -->
        <playlist-card
          v-for="playlist in playlists"
          :key="playlist.id"
          :playlist="playlist"
          :progress="getPlaylistProgress(playlist.id)"
          @click="goToDetail(playlist)"
        />
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
  background: #f5f5f5;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.nav-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
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
  padding: 12px 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #999;
  margin-bottom: 24px;
}

.empty-action {
  background: #007AFF;
  color: #fff;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
}
</style>
