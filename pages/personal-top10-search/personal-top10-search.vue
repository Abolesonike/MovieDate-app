<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-wrapper">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchValue"
          class="search-input"
          placeholder="搜索电影名称"
          confirm-type="search"
          @confirm="onSearch"
        />
        <text v-if="searchValue" class="clear-icon" @click="clearSearch">✕</text>
      </view>
      <text class="cancel-text" @click="goBack">取消</text>
    </view>

    <!-- 搜索结果 -->
    <scroll-view class="result-scroll" scroll-y @scrolltolower="loadMore">
      <!-- 初始提示 -->
      <view v-if="!hasSearched" class="search-tip">
        <text class="tip-icon">🎬</text>
        <text class="tip-text">输入电影名称开始搜索</text>
      </view>

      <!-- 加载中 -->
      <view v-else-if="loading" class="loading-state">
        <text>搜索中...</text>
      </view>

      <!-- 空结果 -->
      <view v-else-if="movies.length === 0" class="empty-state">
        <text class="empty-icon">😕</text>
        <text class="empty-text">未找到相关电影</text>
      </view>

      <!-- 电影列表 -->
      <view v-else class="movie-list">
        <view
          v-for="movie in movies"
          :key="movie.id"
          class="movie-item"
        >
          <image
            :src="movie.poster || '/static/default-poster.png'"
            class="movie-poster"
            mode="aspectFill"
          />
          <view class="movie-info">
            <text class="movie-title">{{ movie.title }}</text>
            <text class="movie-meta">{{ movie.year }} · {{ movie.genre || '未知类型' }}</text>
            <text class="movie-rating">⭐ {{ movie.rating }}</text>
          </view>
          <view
            :class="['add-btn', isAdded(movie.id) ? 'added' : '']"
            @click="onAdd(movie)"
          >
            <text class="add-btn-text">{{ isAdded(movie.id) ? '已添加' : '添加' }}</text>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="loadingMore" class="load-more-tip">
          <text>加载中...</text>
        </view>
        <view v-else-if="hasMore" class="load-more-tip">
          <text>上拉加载更多</text>
        </view>
        <view v-else-if="movies.length > 0" class="load-more-tip">
          <text>没有更多了</text>
        </view>
      </view>

      <view class="list-footer"></view>
    </scroll-view>
  </view>
</template>

<script>
import tmdbApi from '@/utils/tmdb.js'
import storage from '@/utils/storage.js'

export default {
  data() {
    return {
      searchValue: '',
      hasSearched: false,
      loading: false,
      loadingMore: false,
      movies: [],
      page: 1,
      hasMore: false,
      addedMovieIds: new Set()
    }
  },

  onLoad() {
    this.loadAddedMovies()
  },

  methods: {
    loadAddedMovies() {
      const top10 = storage.getPersonalTop10()
      this.addedMovieIds = new Set(top10.map(item => item.movieId))
    },

    isAdded(movieId) {
      return this.addedMovieIds.has(movieId)
    },

    goBack() {
      uni.navigateBack()
    },

    clearSearch() {
      this.searchValue = ''
      this.hasSearched = false
      this.movies = []
      this.page = 1
      this.hasMore = false
    },

    async onSearch() {
      const query = this.searchValue.trim()
      if (!query) {
        uni.showToast({ title: '请输入搜索关键词', icon: 'none' })
        return
      }

      this.page = 1
      this.hasMore = false
      this.loading = true
      this.hasSearched = true

      try {
        const result = await tmdbApi.searchMovies(query, 1)
        this.movies = result.movies || []
        this.page = result.page || 1
        this.hasMore = result.page < result.totalPages
      } catch (error) {
        console.error('[PersonalTop10Search] 搜索失败:', error)
        uni.showToast({ title: '搜索失败', icon: 'none' })
        this.movies = []
      } finally {
        this.loading = false
      }
    },

    async loadMore() {
      if (this.loadingMore || !this.hasMore) return

      this.loadingMore = true
      try {
        const nextPage = this.page + 1
        const result = await tmdbApi.searchMovies(this.searchValue.trim(), nextPage)
        this.movies = [...this.movies, ...(result.movies || [])]
        this.page = result.page || nextPage
        this.hasMore = result.page < result.totalPages
      } catch (error) {
        console.error('[PersonalTop10Search] 加载更多失败:', error)
      } finally {
        this.loadingMore = false
      }
    },

    onAdd(movie) {
      if (this.isAdded(movie.id)) return

      const res = storage.addToPersonalTop10(movie.id)
      if (res.success) {
        this.addedMovieIds.add(movie.id)
        // 触发 set 响应式更新
        this.addedMovieIds = new Set(this.addedMovieIds)
        uni.showToast({ title: '添加成功', icon: 'success' })

        // 如果已满10部，自动返回
        if (this.addedMovieIds.size >= 10) {
          setTimeout(() => {
            uni.navigateBack()
          }, 800)
        }
      } else {
        uni.showToast({ title: res.message, icon: 'none' })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.search-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f0f0f0;
  border-radius: 36rpx;
  padding: 14rpx 24rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  height: 40rpx;
}

.clear-icon {
  font-size: 24rpx;
  color: #999;
  padding: 8rpx;
}

.cancel-text {
  font-size: 28rpx;
  color: #666;
  margin-left: 20rpx;
}

/* 结果滚动区 */
.result-scroll {
  flex: 1;
  min-height: 0;
}

.search-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 40rpx;
}

.tip-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.tip-text {
  font-size: 28rpx;
  color: #999;
}

.loading-state {
  text-align: center;
  padding: 80rpx 0;
  color: #999;
  font-size: 28rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 40rpx;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.movie-list {
  padding: 20rpx;
}

.movie-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.movie-poster {
  width: 100rpx;
  height: 150rpx;
  border-radius: 10rpx;
  background: #e0e0e0;
  flex-shrink: 0;
}

.movie-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.movie-title {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.movie-meta {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.movie-rating {
  font-size: 24rpx;
  color: #ff976a;
}

.add-btn {
  padding: 12rpx 28rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  margin-left: 16rpx;
  flex-shrink: 0;

  &.added {
    background: #ddd;
  }
}

.add-btn-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.load-more-tip {
  text-align: center;
  padding: 24rpx 0;
  color: #999;
  font-size: 24rpx;
}

.list-footer {
  height: 40rpx;
}
</style>
