<template>
  <view class="container">
    <!-- 搜索栏 -->
    <view v-if="activeTab === 'search' || activeTab === 'personSearch'" class="search-bar">
      <view class="search-wrapper">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchValue"
          class="search-input"
          :placeholder="activeTab === 'personSearch' ? '搜索演员/导演名称' : '搜索电影名称'"
          confirm-type="search"
          @confirm="onSearch"
        />
        <text v-if="searchValue" class="clear-icon" @click="clearSearch">✕</text>
      </view>
      <text class="cancel-text" @click="goBack">取消</text>
    </view>

    <!-- Tab 切换栏 -->
    <view class="tab-bar">
      <view
        v-for="tab in tabsList"
        :key="tab.key"
        :class="['tab-item', activeTab === tab.key ? 'tab-active' : '']"
        @click="switchTab(tab.key)"
      >
        <text class="tab-icon">{{ tab.icon }}</text>
        <text class="tab-text">{{ tab.label }}</text>
      </view>
    </view>

    <!-- 电影列表 -->
    <scroll-view class="result-scroll" scroll-y @scrolltolower="loadMore">
      <!-- 搜索 Tab 初始提示 -->
      <view v-if="(activeTab === 'search' || activeTab === 'personSearch') && !hasSearched" class="search-tip">
        <text class="tip-icon">{{ activeTab === 'personSearch' ? '👤' : '🎬' }}</text>
        <text class="tip-text">{{ activeTab === 'personSearch' ? '输入影人名称开始搜索' : '输入电影名称开始搜索' }}</text>
      </view>

      <!-- 加载中 -->
      <view v-else-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>

      <!-- 空结果 -->
      <view v-else-if="isEmptyList" class="empty-state">
        <text class="empty-icon">😕</text>
        <text class="empty-text">
          {{ activeTab === 'search' ? '未找到相关电影' : (activeTab === 'personSearch' ? '未找到相关影人' : `暂无${getTabLabel(activeTab)}的电影`) }}
        </text>
        <text v-if="activeTab !== 'search' && activeTab !== 'personSearch'" class="empty-subtext">去发现好电影吧</text>
      </view>

      <!-- 影人列表 -->
      <view v-else-if="activeTab === 'personSearch'" class="movie-list">
        <view
          v-for="person in persons"
          :key="person.id"
          class="movie-item"
        >
          <image
            :src="person.profile || '/static/default-poster.png'"
            class="movie-poster person-poster"
            mode="aspectFill"
          />
          <view class="movie-info">
            <text class="movie-title">{{ person.name }}</text>
            <text class="movie-meta">{{ person.knownFor || '影人' }}</text>
            <text v-if="person.knownForMovies.length > 0" class="movie-rating">代表作: {{ person.knownForMovies.join(' / ') }}</text>
          </view>
          <view class="select-btn" @click="onSelect(person)">
            <text class="select-btn-text">选择</text>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="loadingMore" class="load-more-tip">
          <text>加载中...</text>
        </view>
        <view v-else-if="hasMore" class="load-more-tip">
          <text>上拉加载更多</text>
        </view>
        <view v-else-if="persons.length > 0" class="load-more-tip">
          <text>没有更多了</text>
        </view>
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
            :class="['select-btn', isExcluded(movie.id) || isSelected(movie.id) ? 'disabled' : '']"
            @click="onSelect(movie)"
          >
            <text class="select-btn-text">
              {{ isExcluded(movie.id) ? '已添加' : (isSelected(movie.id) ? '已选择' : '选择') }}
            </text>
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

const TAB_CONFIG = {
  search: { label: '搜索', icon: '🔍' },
  want: { label: '想看', icon: '💭' },
  watched: { label: '已看', icon: '👁' },
  planned: { label: '待看', icon: '📅' },
  personSearch: { label: '影人', icon: '👤' }
}

export default {
  data() {
    return {
      // 页面参数
      source: '',
      playlistId: '',
      tabsList: [],
      pageTitle: '选择电影',
      maxCount: 0,
      dateKey: '',
      pickType: 'movie',

      // 搜索
      searchValue: '',
      hasSearched: false,

      // Tab 与列表
      activeTab: '',
      movies: [],
      persons: [],
      loading: false,
      loadingMore: false,
      page: 1,
      hasMore: false,

      // 已选/排除
      selectedIds: new Set(),
      excludedIds: new Set()
    }
  },

  computed: {
    isEmptyList() {
      if (this.activeTab === 'personSearch') {
        return this.persons.length === 0
      }
      return this.movies.length === 0
    }
  },

  onLoad(options) {
    // 解析参数
    this.source = options.source || ''
    this.playlistId = options.playlistId || ''
    this.pageTitle = options.title || '选择电影'
    this.maxCount = parseInt(options.maxCount) || 0
    this.dateKey = options.dateKey || ''
    this.pickType = options.pickType || 'movie'

    // 解析 tabs
    const tabKeys = (options.tabs || 'search').split(',').map(t => t.trim()).filter(Boolean)
    this.tabsList = tabKeys.map(key => ({
      key,
      label: TAB_CONFIG[key]?.label || key,
      icon: TAB_CONFIG[key]?.icon || ''
    }))

    // 解析排除 ID
    if (options.excludeIds) {
      const ids = options.excludeIds.split(',').map(id => parseInt(id.trim())).filter(Boolean)
      this.excludedIds = new Set(ids)
    }

    // 默认激活第一个 Tab
    if (this.tabsList.length > 0) {
      this.activeTab = this.tabsList[0].key
      // 非搜索 Tab 直接加载数据
      if (this.activeTab !== 'search' && this.activeTab !== 'personSearch') {
        this.loadTabData(this.activeTab)
      }
    }

    // 设置导航栏标题
    uni.setNavigationBarTitle({ title: this.pageTitle })
  },

  methods: {
    getTabLabel(key) {
      return TAB_CONFIG[key]?.label || key
    },

    goBack() {
      uni.navigateBack()
    },

    switchTab(tabKey) {
      if (this.activeTab === tabKey) return
      this.activeTab = tabKey
      this.movies = []
      this.persons = []
      this.hasMore = false
      this.page = 1

      if (tabKey === 'search' || tabKey === 'personSearch') {
        this.hasSearched = false
        this.searchValue = ''
      } else {
        this.loadTabData(tabKey)
      }
    },

    clearSearch() {
      this.searchValue = ''
      this.hasSearched = false
      this.movies = []
      this.persons = []
      this.page = 1
      this.hasMore = false
    },

    async loadTabData(tabKey) {
      this.loading = true
      try {
        let movieIds = []
        if (tabKey === 'want') {
          const list = storage.getWantList()
          movieIds = list.map(item => item.movieId)
        } else if (tabKey === 'watched') {
          const list = storage.getWatchedList()
          movieIds = list.map(item => item.movieId)
        } else if (tabKey === 'planned') {
          const list = storage.getPlannedList()
          movieIds = list.map(item => item.movieId)
        }

        if (movieIds.length === 0) {
          this.movies = []
          this.loading = false
          return
        }

        // 异步获取每部电影详情
        const details = await Promise.all(
          movieIds.map(id => tmdbApi.getMovieDetails(id).catch(() => null))
        )

        this.movies = details.filter(Boolean)
      } catch (error) {
        console.error('[MoviePicker] 加载列表失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
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
        if (this.activeTab === 'personSearch' || this.pickType === 'person') {
          const result = await tmdbApi.searchPerson(query, 1)
          this.persons = result.persons || []
          this.page = result.page || 1
          this.hasMore = result.page < result.totalPages
        } else {
          const result = await tmdbApi.searchMovies(query, 1)
          this.movies = result.movies || []
          this.page = result.page || 1
          this.hasMore = result.page < result.totalPages
        }
      } catch (error) {
        console.error('[MoviePicker] 搜索失败:', error)
        uni.showToast({ title: '搜索失败', icon: 'none' })
        this.movies = []
        this.persons = []
      } finally {
        this.loading = false
      }
    },

    async loadMore() {
      if (this.loadingMore || !this.hasMore) return
      if (this.activeTab !== 'search' && this.activeTab !== 'personSearch') return

      this.loadingMore = true
      try {
        const nextPage = this.page + 1
        const query = this.searchValue.trim()
        if (this.activeTab === 'personSearch') {
          const result = await tmdbApi.searchPerson(query, nextPage)
          this.persons = [...this.persons, ...(result.persons || [])]
          this.page = result.page || nextPage
          this.hasMore = result.page < result.totalPages
        } else {
          const result = await tmdbApi.searchMovies(query, nextPage)
          this.movies = [...this.movies, ...(result.movies || [])]
          this.page = result.page || nextPage
          this.hasMore = result.page < result.totalPages
        }
      } catch (error) {
        console.error('[MoviePicker] 加载更多失败:', error)
      } finally {
        this.loadingMore = false
      }
    },

    isSelected(movieId) {
      return this.selectedIds.has(movieId)
    },

    isExcluded(movieId) {
      return this.excludedIds.has(movieId)
    },

    onSelect(item) {
      const isPerson = this.activeTab === 'personSearch' || this.pickType === 'person'
      const itemId = item.id

      if (!isPerson && (this.isExcluded(itemId) || this.isSelected(itemId))) return

      // favorite-grid 场景：通过事件返回数据
      if (this.source === 'favorite-grid') {
        const pickedData = isPerson
          ? {
              type: 'person',
              id: item.id,
              name: item.name,
              profile: item.profile,
              knownFor: item.knownFor
            }
          : {
              type: 'movie',
              id: item.id,
              title: item.title,
              poster: item.poster,
              year: item.year,
              rating: item.rating
            }
        uni.$emit('favoriteGridPicked', pickedData)
        uni.navigateBack()
        return
      }

      // playlist 场景：添加到片单
      if (this.source === 'playlist') {
        const result = storage.addMoviesToPlaylist(this.playlistId, [itemId])
        if (result.success) {
          this.selectedIds.add(itemId)
          this.selectedIds = new Set(this.selectedIds)
          uni.showToast({ title: result.message, icon: 'success' })

          // 达到上限自动返回
          const currentCount = this.excludedIds.size + this.selectedIds.size
          if (this.maxCount > 0 && currentCount >= this.maxCount) {
            setTimeout(() => {
              uni.navigateBack()
            }, 800)
          }
        } else {
          uni.showToast({ title: result.message, icon: 'none' })
        }
        return
      }

      let result = null
      let successMsg = ''

      if (this.source === 'calendar') {
        if (!this.dateKey) {
          uni.showToast({ title: '缺少日期参数', icon: 'none' })
          return
        }
        result = storage.addCalendarEvent(this.dateKey, { movieId: itemId })
        successMsg = '已添加到日历'
      } else if (this.source === 'personal-top10') {
        result = storage.addToPersonalTop10(itemId)
        successMsg = '添加成功'
      } else {
        uni.showToast({ title: '未知来源', icon: 'none' })
        return
      }

      if (result && result.success) {
        this.selectedIds.add(itemId)
        // 触发响应式更新
        this.selectedIds = new Set(this.selectedIds)
        uni.showToast({ title: successMsg, icon: 'success' })

        // 检查是否达到上限
        const currentCount = this.excludedIds.size + this.selectedIds.size
        if (this.maxCount > 0 && currentCount >= this.maxCount) {
          setTimeout(() => {
            uni.navigateBack()
          }, 800)
        }
      } else {
        uni.showToast({ title: result?.message || '添加失败', icon: 'none' })
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
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}

.search-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--bg-hover);
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
  color: var(--text-primary);
  height: 40rpx;
}

.clear-icon {
  font-size: 24rpx;
  color: var(--text-tertiary);
  padding: 8rpx;
}

.cancel-text {
  font-size: 28rpx;
  color: var(--text-secondary);
  margin-left: 20rpx;
}

/* Tab 栏 */
.tab-bar {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
  padding: 0 20rpx;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  margin-right: 16rpx;
  border-bottom: 4rpx solid transparent;
  transition: all 0.2s;
}

.tab-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}

.tab-text {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.tab-active {
  border-bottom-color: #007AFF;

  .tab-text {
    color: #007AFF;
    font-weight: 500;
  }
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
  color: var(--text-tertiary);
}

.loading-state {
  text-align: center;
  padding: 80rpx 0;
  color: var(--text-tertiary);
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
  color: var(--text-tertiary);
  margin-bottom: 12rpx;
}

.empty-subtext {
  font-size: 24rpx;
  color: #bbb;
}

.movie-list {
  padding: 20rpx;
}

.movie-item {
  display: flex;
  align-items: center;
  background: var(--bg-card);
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

.person-poster {
  border-radius: 50%;
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
  color: var(--text-primary);
  font-weight: 500;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.movie-meta {
  font-size: 24rpx;
  color: var(--text-tertiary);
  margin-bottom: 10rpx;
}

.movie-rating {
  font-size: 24rpx;
  color: #ff976a;
}

.select-btn {
  padding: 12rpx 28rpx;
  border-radius: 28rpx;
  background: var(--primary);
  margin-left: 16rpx;
  flex-shrink: 0;

  &.disabled {
    background: #ddd;
  }
}

.select-btn-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.load-more-tip {
  text-align: center;
  padding: 24rpx 0;
  color: var(--text-tertiary);
  font-size: 24rpx;
}

.list-footer {
  height: 40rpx;
}
</style>
