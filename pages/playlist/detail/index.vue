<template>
  <view class="playlist-detail-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">‹</text>
      <text class="nav-title">{{ playlist ? playlist.name : '片单详情' }}</text>
      <view class="nav-actions">
        <text class="nav-edit" @click="goToEdit">编辑</text>
        <text class="nav-more" @click="showMoreMenu">⋮</text>
      </view>
    </view>

    <scroll-view class="detail-content" scroll-y>
      <!-- 加载状态 -->
      <view v-if="!playlist" class="loading-state">
        <text>加载中...</text>
      </view>

      <template v-else>
        <!-- 封面区域 -->
        <view class="cover-section">
          <view v-if="playlist.coverImage" class="cover-image">
            <image :src="playlist.coverImage" mode="aspectFill" />
          </view>
          <view v-else class="cover-placeholder">
            <text class="cover-placeholder-text">📋</text>
          </view>
        </view>

        <!-- 描述 -->
        <view v-if="playlist.description" class="description-section">
          <text class="description-text">{{ playlist.description }}</text>
        </view>

        <!-- 进度条 -->
        <view class="progress-section">
          <view class="progress-header">
            <text class="progress-label">进度：{{ progress.watched }}/{{ progress.total }}</text>
            <text class="progress-percent">{{ progress.progress }}%</text>
          </view>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: progress.progress + '%' }"></view>
          </view>
        </view>

        <!-- 标签筛选 -->
        <view class="filter-section">
          <view
            v-for="tab in filterTabs"
            :key="tab.key"
            class="filter-tab"
            :class="{ active: currentFilter === tab.key }"
            @click="currentFilter = tab.key"
          >
            {{ tab.label }}
          </view>
        </view>

        <!-- 电影列表 -->
        <view class="movie-list-section">
          <view v-if="filteredMovies.length === 0" class="empty-movies">
            <text class="empty-text">暂无电影</text>
            <text class="empty-hint">点击下方添加电影</text>
          </view>

          <view
            v-for="movie in filteredMovies"
            :key="movie.id"
            class="movie-item-wrapper"
          >
            <movie-card-horizontal
              :movie="movie"
              :show-status="true"
              @click="goToDetail(movie)"
            />
            <view class="remove-btn" @click="removeMovie(movie.id)">
              <text>移除</text>
            </view>
          </view>
        </view>

        <!-- 添加电影按钮 -->
        <view class="add-movie-btn" @click="goToAddMovies">
          <text>+ 添加电影</text>
        </view>
      </template>
    </scroll-view>

    <!-- 更多操作弹窗 -->
    <view v-if="showMenu" class="menu-overlay" @click="showMenu = false">
      <view class="menu-sheet" @click.stop>
        <view class="menu-item" @click="handleRename">
          <text>✏️ 重命名</text>
        </view>
        <view class="menu-item" @click="handleDuplicate">
          <text>📋 复制片单</text>
        </view>
        <view class="menu-item menu-item-danger" @click="handleDelete">
          <text>🗑️ 删除片单</text>
        </view>
        <view class="menu-cancel" @click="showMenu = false">
          <text>取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import storage from '@/utils/storage.js'
import tmdb from '@/utils/tmdb.js'
import MovieCardHorizontal from '@/components/movie-card/movie-card-horizontal.vue'

export default {
  components: {
    MovieCardHorizontal
  },
  data() {
    return {
      playlistId: '',
      playlist: null,
      progress: { total: 0, watched: 0, progress: 0 },
      currentFilter: 'all',
      filterTabs: [
        { key: 'all', label: '全部' },
        { key: 'want', label: '想看' },
        { key: 'watched', label: '已看' }
      ],
      movieDetails: [],
      showMenu: false
    }
  },
  computed: {
    filteredMovies() {
      if (this.currentFilter === 'all') {
        return this.movieDetails
      }
      return this.movieDetails.filter(m => m.status === this.currentFilter)
    }
  },
  onLoad(options) {
    if (options.playlistId) {
      this.playlistId = options.playlistId
      this.loadPlaylist()
    }
  },
  onShow() {
    if (this.playlistId) {
      this.loadPlaylist()
    }
  },
  methods: {
    loadPlaylist() {
      this.playlist = storage.getPlaylist(this.playlistId)
      if (this.playlist) {
        this.progress = storage.getPlaylistProgress(this.playlistId)
        this.loadMovieDetails()
      }
    },
    async loadMovieDetails() {
      const movies = []
      for (const movieId of this.playlist.movieIds) {
        try {
          const detail = await tmdb.getMovieDetails(movieId)
          const statusData = storage.getMovieStatus(movieId)
          movies.push({
            ...detail,
            status: statusData.status
          })
        } catch (e) {
          console.error('加载电影详情失败:', e)
        }
      }
      this.movieDetails = movies
    },
    goBack() {
      uni.navigateBack()
    },
    goToEdit() {
      uni.navigateTo({
        url: `/pages/playlist/edit/index?playlistId=${this.playlistId}`
      })
    },
    goToDetail(movie) {
      uni.navigateTo({
        url: `/pages/movie/detail/index?movieId=${movie.id}`
      })
    },
    goToAddMovies() {
      // 排除已添加的电影
      const excludeIds = this.playlist.movieIds.join(',')
      uni.navigateTo({
        url: `/pages/movie/picker/index?source=playlist&playlistId=${this.playlistId}&tabs=search,want,watched,planned&excludeIds=${excludeIds}&title=添加电影`
      })
    },
    removeMovie(movieId) {
      uni.showModal({
        title: '确认移除',
        content: '确定要从片单中移除这部电影吗？',
        success: (res) => {
          if (res.confirm) {
            const result = storage.removeMovieFromPlaylist(this.playlistId, movieId)
            if (result.success) {
              this.loadPlaylist()
              uni.showToast({ title: '已移除', icon: 'success' })
            }
          }
        }
      })
    },
    showMoreMenu() {
      this.showMenu = true
    },
    handleRename() {
      this.showMenu = false
      uni.navigateTo({
        url: `/pages/playlist/edit/index?playlistId=${this.playlistId}`
      })
    },
    handleDuplicate() {
      this.showMenu = false
      const result = storage.duplicatePlaylist(this.playlistId)
      if (result.success) {
        uni.showToast({ title: '已复制', icon: 'success' })
        uni.navigateBack()
      }
    },
    handleDelete() {
      this.showMenu = false
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这个片单吗？此操作不可恢复。',
        success: (res) => {
          if (res.confirm) {
            const result = storage.deletePlaylist(this.playlistId)
            if (result.success) {
              uni.showToast({ title: '已删除', icon: 'success' })
              uni.navigateBack()
            }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.playlist-detail-page {
  height: 100vh;
  background: var(--bg-page);
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
}

.nav-back {
  font-size: 24px;
  color: #007AFF;
  margin-right: 12px;
}

.nav-title {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-actions {
  display: flex;
  gap: 16px;
}

.nav-edit, .nav-more {
  font-size: 14px;
  color: #007AFF;
}

.detail-content {
  height: calc(100vh - 50px);
}

.cover-section {
  margin: 16px;
}

.cover-image {
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
}

.cover-image image {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  height: 120px;
  background: var(--primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-placeholder-text {
  font-size: 48px;
}

.description-section {
  padding: 0 16px;
  margin-bottom: 16px;
}

.description-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.progress-section {
  padding: 0 16px;
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.progress-percent {
  font-size: 13px;
  color: #007AFF;
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width 0.3s;
}

.filter-section {
  display: flex;
  padding: 0 16px;
  margin-bottom: 12px;
  gap: 12px;
}

.filter-tab {
  padding: 6px 16px;
  background: var(--bg-card);
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.filter-tab.active {
  background: #007AFF;
  color: #fff;
}

.movie-list-section {
  padding: 0 16px;
}

.empty-movies {
  text-align: center;
  padding: 40px 0;
}

.empty-text {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.remove-btn {
  display: inline-block;
  padding: 4px 12px;
  background: var(--bg-card);
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.add-movie-btn {
  margin: 16px;
  padding: 14px;
  background: #007AFF;
  color: #fff;
  border-radius: 8px;
  text-align: center;
  font-size: 15px;
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.menu-sheet {
  width: 100%;
  background: var(--bg-card);
  border-radius: 16px 16px 0 0;
  padding: 8px 0;
}

.menu-item {
  padding: 14px 20px;
  text-align: center;
  font-size: 16px;
  color: var(--text-primary);
}

.menu-item-danger {
  color: #ff4d4f;
}

.menu-cancel {
  padding: 14px 20px;
  text-align: center;
  font-size: 16px;
  color: var(--text-secondary);
  border-top: 8px solid #f5f5f5;
  margin-top: 8px;
}
</style>
