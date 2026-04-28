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
      <text class="empty-title">暂无待看电影</text>
      <text class="empty-desc">将电影添加到日历来安排观看计划</text>
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
          <view class="planned-section" v-if="movie.plannedDate">
            <text class="planned-label">计划观看</text>
            <text class="planned-date">{{ movie.plannedDate }}</text>
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
  fetchList: () => storage.getPlannedList(),
  mapItem: (item) => ({ plannedDate: item.timeline?.planned?.date })
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

/* 计划观看区域 */
.planned-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

.planned-label {
  font-size: 12px;
  color: var(--primary);
  background: #e6f7ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.planned-date {
  font-size: 12px;
  color: var(--text-secondary);
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