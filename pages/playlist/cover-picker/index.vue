<template>
  <view class="cover-picker-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-left">
        <text class="nav-back" @click="goBack">‹</text>
        <text class="nav-title">选择封面</text>
      </view>
      <text class="nav-clear" @click="handleClear">清除</text>
    </view>

    <scroll-view class="picker-content" scroll-y>
      <!-- 提示文字 -->
      <view class="picker-tip">
        <text>从片单中选择一张电影海报作为封面</text>
      </view>

      <!-- 加载中 -->
      <view v-if="isLoading" class="loading-state">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 空状态：无电影 -->
      <view v-else-if="movies.length === 0" class="empty-state">
        <text class="empty-icon">🎬</text>
        <text class="empty-text">片单中还没有电影</text>
        <text class="empty-hint">先添加电影，再选择封面</text>
        <view class="empty-action" @click="goToAddMovies">
          <text>去添加电影</text>
        </view>
      </view>

      <!-- 海报网格 -->
      <view v-else class="poster-grid">
        <view
          v-for="movie in movies"
          :key="movie.id"
          class="poster-item"
          :class="{ 'poster-item--selected': isSelected(movie.poster) }"
          @click="selectPoster(movie.poster)"
        >
          <view class="poster-wrapper">
            <image
              class="poster-image"
              :src="movie.poster"
              mode="aspectFill"
            />
            <!-- 选中标记 -->
            <view v-if="isSelected(movie.poster)" class="selected-badge">
              <text class="selected-icon">✓</text>
            </view>
          </view>
          <text class="poster-title">{{ movie.title }}</text>
          <text class="poster-year">{{ movie.year }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import storage from '@/utils/storage.js'
import tmdb from '@/utils/tmdb.js'

export default {
  data() {
    return {
      playlistId: '',
      playlist: null,
      movies: [],
      isLoading: true,
      currentCover: ''
    }
  },
  onLoad(options) {
    if (options.playlistId) {
      this.playlistId = options.playlistId
      this.loadPlaylist()
    }
  },
  methods: {
    loadPlaylist() {
      this.playlist = storage.getPlaylist(this.playlistId)
      if (this.playlist) {
        this.currentCover = this.playlist.coverImage || ''
        this.loadMovieDetails()
      } else {
        this.isLoading = false
        uni.showToast({ title: '片单不存在', icon: 'none' })
      }
    },
    async loadMovieDetails() {
      this.isLoading = true
      const movies = []

      for (const movieId of this.playlist.movieIds) {
        try {
          const detail = await tmdb.getMovieDetails(movieId)
          if (detail && detail.poster) {
            movies.push({
              id: detail.id,
              title: detail.title,
              year: detail.year,
              poster: detail.poster
            })
          }
        } catch (e) {
          console.error('加载电影详情失败:', e)
        }
      }

      this.movies = movies
      this.isLoading = false
    },
    isSelected(posterUrl) {
      return this.currentCover && this.currentCover === posterUrl
    },
    selectPoster(posterUrl) {
      if (!posterUrl) return

      const result = storage.updatePlaylist(this.playlistId, {
        coverImage: posterUrl
      })

      if (result.success) {
        uni.showToast({ title: '封面已更新', icon: 'success' })
        // 通知上一页刷新
        uni.$emit('playlistCoverUpdated', { playlistId: this.playlistId })
        setTimeout(() => {
          uni.navigateBack()
        }, 500)
      } else {
        uni.showToast({ title: result.message || '更新失败', icon: 'none' })
      }
    },
    handleClear() {
      if (!this.currentCover) {
        uni.showToast({ title: '当前没有封面', icon: 'none' })
        return
      }

      uni.showModal({
        title: '确认清除',
        content: '确定要清除当前封面吗？',
        success: (res) => {
          if (res.confirm) {
            const result = storage.updatePlaylist(this.playlistId, {
              coverImage: ''
            })
            if (result.success) {
              uni.showToast({ title: '封面已清除', icon: 'success' })
              uni.$emit('playlistCoverUpdated', { playlistId: this.playlistId })
              setTimeout(() => {
                uni.navigateBack()
              }, 500)
            }
          }
        }
      })
    },
    goBack() {
      uni.navigateBack()
    },
    goToAddMovies() {
      uni.navigateTo({
        url: `/pages/movie/picker/index?source=playlist&playlistId=${this.playlistId}&tabs=search,want,watched,planned&title=添加电影`
      })
    }
  }
}
</script>

<style scoped>
.cover-picker-page {
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

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-back {
  font-size: 24px;
  color: #007AFF;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.nav-clear {
  font-size: 14px;
  color: #007AFF;
}

.picker-content {
  height: calc(100vh - 50px);
}

.picker-tip {
  padding: 24rpx 24rpx 16rpx;
}

.picker-tip text {
  font-size: 24rpx;
  color: var(--text-tertiary);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid var(--primary-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 24rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: var(--text-tertiary);
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
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 32rpx;
  color: var(--text-primary);
  margin-bottom: 12rpx;
  font-weight: 500;
}

.empty-hint {
  font-size: 26rpx;
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

/* 海报网格 */
.poster-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 16rpx 24rpx;
  gap: 16rpx;
}

.poster-item {
  width: calc((100% - 32rpx) / 3);
}

.poster-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 150%; /* 2:3 比例 */
  border-radius: 12rpx;
  overflow: hidden;
  background: var(--bg-hover);
  transition: all 0.2s;
}

.poster-item--selected .poster-wrapper {
  box-shadow: 0 0 0 4rpx var(--primary);
}

.poster-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.selected-badge {
  position: absolute;
  bottom: 8rpx;
  right: 8rpx;
  width: 40rpx;
  height: 40rpx;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-icon {
  font-size: 22rpx;
  color: #fff;
  font-weight: bold;
}

.poster-title {
  display: block;
  font-size: 22rpx;
  color: var(--text-primary);
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poster-year {
  display: block;
  font-size: 20rpx;
  color: var(--text-tertiary);
  margin-top: 4rpx;
}
</style>
