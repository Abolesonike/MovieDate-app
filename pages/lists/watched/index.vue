<template>
  <view class="list-page">
    <!-- 加载状态 -->
    <view v-if="isLoading" class="loading-container">
      <text class="loading-spinner">⏳</text>
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-else-if="movieList.length === 0" class="empty-container">
      <text class="empty-icon">🎬</text>
      <text class="empty-title">暂无已看电影</text>
      <text class="empty-desc">看完电影后来记录一下吧</text>
      <button class="empty-btn" @click="goToMoviePage">去发现</button>
    </view>

    <!-- 电影列表 -->
    <scroll-view v-else class="movie-list" scroll-y enable-flex @scrolltolower="loadMore">
      <movie-card-horizontal
        v-for="movie in movieList"
        :key="movie.id"
        :movie="movie"
        :show-status="false"
        @click="goToDetail(movie)"
      >
        <template #extra>
          <view class="user-review-section" v-if="movie.userRating || movie.userReview || movie.watchCount > 1">
            <view class="user-rating" v-if="movie.userRating">
              <text class="rating-label">我的评分</text>
              <text class="rating-stars">{{ '⭐'.repeat(movie.userRating) }}</text>
            </view>
            <text v-if="movie.userReview" class="user-review-text">{{ movie.userReview }}</text>
            <view class="watched-meta">
              <text v-if="movie.watchCount > 1" class="watch-count">看过 {{ movie.watchCount }} 次</text>
              <text v-if="movie.watchedDate" class="watched-date">观看于 {{ movie.watchedDate }}</text>
            </view>
          </view>
        </template>
      </movie-card-horizontal>

      <!-- 加载更多提示 -->
      <view v-if="loadingMore" class="load-more-tip">
        <text class="tip-text">加载中...</text>
      </view>
      <view v-else-if="!hasMore && movieList.length > 0" class="load-more-tip">
        <text class="tip-text">没有更多了</text>
      </view>
      <!-- 底部留白 -->
      <view class="list-footer"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import storage from '@/utils/storage.js'
import MovieCardHorizontal from '@/components/movie-card/movie-card-horizontal.vue'
import { useMovieList } from '@/composables/useMovieList.js'

const {
  isLoading,
  loadingMore,
  hasMore,
  movieList,
  loadData,
  loadMore,
  goToDetail,
  goToMoviePage
} = useMovieList({
  fetchList: () => storage.getWatchedList(),
  mapItem: (item) => ({
    userRating: item.timeline?.watched?.rating,
    userReview: item.timeline?.watched?.review,
    watchedDate: item.timeline?.watched?.date,
    watchCount: item.watchCount || 1
  })
})

onLoad(() => loadData())
onShow(() => loadData())
onPullDownRefresh(() => loadData().finally(() => uni.stopPullDownRefresh()))
</script>

<style scoped>
.list-page {
  min-height: 100vh;
  background-color: var(--bg-page);
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
}

.loading-spinner {
  font-size: 32px;
  margin-bottom: 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: var(--text-tertiary);
}

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  color: var(--text-primary);
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-bottom: 24px;
}

.empty-btn {
  padding: 10px 32px;
  font-size: 14px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 20px;
}

/* 电影列表 */
.movie-list {
  padding: 12px;
  height: 100vh;
  box-sizing: border-box;
}

/* 用户评价区域 */
.user-review-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

.user-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.rating-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.rating-stars {
  font-size: 12px;
}

.user-review-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.watched-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.watch-count {
  font-size: 11px;
  color: var(--primary);
  background: rgba(102, 126, 234, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.watched-date {
  font-size: 11px;
  color: var(--text-tertiary);
}

.list-footer {
  height: 20px;
}

/* 加载更多提示 */
.load-more-tip {
  text-align: center;
  padding: 16px 0;
}

.tip-text {
  font-size: 13px;
  color: var(--text-tertiary);
}
</style>
