<template>
  <view class="container">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon"><</text>
      </view>
      <text class="nav-title">个人 TOP10</text>
      <view class="nav-action">
        <!-- 移除原来的添加按钮 -->
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view class="content-scroll" scroll-y>
      <!-- 空状态 -->
      <view v-if="top10List.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">🏆</text>
        <text class="empty-title">还没有个人 TOP10</text>
        <text class="empty-subtitle">点击下方添加按钮搜索添加电影</text>
      </view>

      <!-- Top10 列表 -->
      <view v-else class="top10-list">
        <view
          v-for="(movie, index) in top10List"
          :key="movie.id"
          class="top10-item"
          @touchstart="onTouchStart($event, index)"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <view class="rank-badge" :class="getRankClass(index + 1)">
            <text class="rank-text">{{ getRankLabel(index + 1) }}</text>
          </view>

          <image
            :src="movie.poster || '/static/default-poster.png'"
            class="item-poster"
            mode="aspectFill"
          />

          <view class="item-info">
            <text class="item-title">{{ movie.title }}</text>
            <text class="item-meta">{{ movie.year }} · {{ movie.rating }}</text>
          </view>

          <view class="drag-handle">
            <view class="drag-line"></view>
            <view class="drag-line"></view>
            <view class="drag-line"></view>
          </view>

          <view class="item-actions">
            <view class="action-btn delete" @click.stop="removeMovie(movie.id)">
              <text class="action-icon delete">×</text>
            </view>
          </view>
        </view>
      </view>

      <view class="content-footer"></view>
    </scroll-view>

    <!-- 浮动操作按钮 -->
    <view class="fab-container">
      <view 
        :class="['fab-btn', 'fab-btn-left', top10List.length >= 10 ? 'disabled' : '']"
        @click="onAdd"
      >
        <text class="fab-icon">+</text>
        <text v-if="top10List.length >= 10" class="fab-label">已达上限</text>
      </view>
      
      <view 
        :class="['fab-btn', 'fab-btn-right', top10List.length === 0 ? 'disabled' : '']"
        @click="onGenerate"
      >
        <!-- <text class="fab-icon">🎨</text> -->
        <text class="fab-label">海报</text>
      </view>
    </view>

    <!-- 隐藏 canvas -->
    <canvas canvas-id="top10Canvas" class="share-canvas"></canvas>

    <!-- 预览弹窗 -->
    <view v-if="previewImage" class="preview-mask" @click="closePreview">
      <view class="preview-content" @click.stop>
        <image
          class="preview-img"
          :src="previewImage"
          mode="widthFix"
          show-menu-by-longpress
        />
        <view class="preview-actions">
          <view class="preview-btn primary" @click="saveImage">
            <text>保存到相册</text>
          </view>
          <view class="preview-btn" @click="closePreview">
            <text>关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import storage from '@/utils/storage.js'
import tmdbApi from '@/utils/tmdb.js'
import { generatePersonalTop10Image } from '@/utils/posterShare.js'

export default {
  data() {
    return {
      loading: false,
      top10List: [],
      previewImage: '',
      dragState: {
        isDragging: false,
        currentIndex: -1,
        startY: 0,
        currentY: 0,
        offset: 0
      }
    }
  },

  onLoad() {
    this.loadTop10()
  },

  onShow() {
    // 从搜索页返回后刷新
    this.loadTop10()
  },
  
  methods: {
    goBack() {
      uni.navigateBack()
    },

    async loadTop10() {
      this.loading = true
      try {
        const top10Data = storage.getPersonalTop10()
        if (top10Data.length === 0) {
          this.top10List = []
          return
        }

        // 并发获取电影详情
        const promises = top10Data.map(async (item) => {
          try {
            const details = await tmdbApi.getMovieDetails(item.movieId)
            return details
          } catch (error) {
            console.error(`[PersonalTop10] 获取电影详情失败: ${item.movieId}`, error)
            return null
          }
        })

        const movies = (await Promise.all(promises)).filter(m => m !== null)
        this.top10List = movies
      } catch (error) {
        console.error('[PersonalTop10] 加载Top10失败:', error)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    onAdd() {
      if (this.top10List.length >= 10) {
        uni.showToast({ title: '个人Top10最多10部电影', icon: 'none' })
        return
      }
      const excludeIds = this.top10List.map(m => m.id).join(',')
      uni.navigateTo({
        url: `/pages/movie/picker/index?source=personal-top10&tabs=search,watched&maxCount=10&excludeIds=${excludeIds}`
      })
    },

    getRankClass(rank) {
      if (rank === 1) return 'gold'
      if (rank === 2) return 'silver'
      if (rank === 3) return 'bronze'
      return 'normal'
    },

    getRankLabel(rank) {
      if (rank <= 3) return ['🥇', '🥈', '🥉'][rank - 1]
      return rank
    },

    onTouchStart(e, index) {
      // 记录触摸开始位置和当前索引
      this.dragState.startY = e.touches[0].pageY
      this.dragState.currentIndex = index
      this.dragState.isDragging = true
      
      // 为当前拖拽元素添加样式
      const item = e.currentTarget
      item.classList.add('dragging')
    },

    onTouchMove(e) {
      if (!this.dragState.isDragging) return
      
      // 计算移动距离
      const currentY = e.touches[0].pageY
      const diff = currentY - this.dragState.startY
      
      // 获取当前元素的高度，用于计算应该移动到哪个位置
      const rect = e.currentTarget.getBoundingClientRect()
      const itemHeight = rect.height
      
      // 计算应该移动到的目标索引
      const targetIndex = Math.max(
        0, 
        Math.min(
          this.top10List.length - 1, 
          Math.round((this.dragState.currentIndex * itemHeight + diff) / itemHeight)
        )
      )
      
      // 如果目标索引和当前索引不同，则执行交换
      if (targetIndex !== this.dragState.currentIndex) {
        this.swapItems(this.dragState.currentIndex, targetIndex)
        this.dragState.currentIndex = targetIndex
      }
    },

    onTouchEnd() {
      if (!this.dragState.isDragging) return
      
      // 重置拖拽状态
      this.dragState.isDragging = false
      
      // 移除拖拽样式
      const items = document.querySelectorAll('.top10-item')
      items.forEach(item => item.classList.remove('dragging'))
      
      // 保存新顺序
      this.saveOrder()
    },

    swapItems(fromIndex, toIndex) {
      // 交换数组中的元素
      const list = [...this.top10List]
      const temp = list[fromIndex]
      list[fromIndex] = list[toIndex]
      list[toIndex] = temp
      this.top10List = list
    },

    saveOrder() {
      const orderedIds = this.top10List.map(m => m.id)
      storage.updatePersonalTop10Order(orderedIds)
    },

    removeMovie(movieId) {
      uni.showModal({
        title: '确认移除',
        content: '确定将这部电影从个人Top10中移除吗？',
        confirmColor: '#ff6b6b',
        success: (res) => {
          if (res.confirm) {
            storage.removeFromPersonalTop10(movieId)
            this.loadTop10()
          }
        }
      })
    },

    async onGenerate() {
      if (this.top10List.length === 0) {
        uni.showToast({ title: '请至少添加1部电影', icon: 'none' })
        return
      }
      uni.showLoading({ title: '生成中...', mask: true })
      try {
        const path = await generatePersonalTop10Image({
          title: '个人 TOP10',
          subtitle: '我的年度最佳电影',
          movies: this.top10List,
          canvasId: 'top10Canvas',
          componentThis: this
        })
        this.previewImage = path
      } catch (error) {
        console.error('生成个人Top10海报失败:', error)
        uni.showToast({ title: '生成失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    closePreview() {
      this.previewImage = ''
    },

    async saveImage() {
      try {
        await uni.saveImageToPhotosAlbum({ filePath: this.previewImage })
        uni.showToast({ title: '已保存到相册', icon: 'success' })
      } catch (e) {
        if (e.errMsg && e.errMsg.includes('auth deny')) {
          uni.showModal({
            title: '需要授权',
            content: '请允许保存图片到相册',
            success: (res) => {
              if (res.confirm) uni.openSetting()
            }
          })
        } else {
          uni.showToast({ title: '保存失败', icon: 'none' })
        }
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
  padding-top: var(--status-bar-height);
  padding-bottom: 160rpx; // 为浮动按钮留出空间
}

/* 自定义导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 20rpx;
  background: var(--bg-card);
  border-bottom: 1rpx solid var(--border-light);
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back-icon {
  font-size: 36rpx;
  color: var(--text-primary);
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.nav-action {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-add-icon {
  font-size: 48rpx;
  color: #ff6b6b;
  font-weight: 300;
  line-height: 1;

  &.disabled {
    color: var(--text-tertiary);
  }
}

/* 内容滚动区 */
.content-scroll {
  flex: 1;
  min-height: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.empty-title {
  font-size: 32rpx;
  color: var(--text-secondary);
  margin-bottom: 16rpx;
}

.empty-subtitle {
  font-size: 26rpx;
  color: var(--text-tertiary);
}

.top10-list {
  padding: 20rpx;
}

.top10-item {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  transition: transform 0.2s;
  position: relative;
  
  &.dragging {
    z-index: 1000;
    background: #f0f8ff;
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
  }
}

.rank-badge {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;

  &.gold {
    background: #FFD700;
  }

  &.silver {
    background: #C0C0C0;
  }

  &.bronze {
    background: #CD7F32;
  }

  &.normal {
    background: var(--primary);
  }
}

.rank-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
}

.item-poster {
  width: 80rpx;
  height: 120rpx;
  border-radius: 8rpx;
  background: #e0e0e0;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  margin-left: 20rpx;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.item-title {
  font-size: 30rpx;
  color: var(--text-primary);
  font-weight: 500;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  font-size: 24rpx;
  color: var(--text-tertiary);
}

.drag-handle {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 10rpx;
  padding: 10rpx;
  cursor: move;
}

.drag-line {
  width: 6rpx;
  height: 6rpx;
  background-color: var(--text-tertiary);
  border-radius: 3rpx;
  margin: 3rpx 0;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-left: 16rpx;
}

.action-btn {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: var(--bg-page);
  display: flex;
  align-items: center;
  justify-content: center;

  &.delete {
    background: rgba(255, 107, 107, 0.1);
  }
}

.action-icon {
  font-size: 28rpx;
  color: var(--text-secondary);

  &.delete {
    color: #ff6b6b;
  }
}

.content-footer {
  height: 40rpx;
}

/* 新增：浮动操作按钮容器 */
.fab-container {
  position: fixed;
  bottom: 40rpx;
  left: 40rpx;
  right: 40rpx;
  display: flex;
  justify-content: space-between;
  z-index: 100;
}

.fab-btn {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 107, 0.4);
  transition: all 0.3s ease;
  
  .fab-icon {
    font-size: 40rpx;
    line-height: 1;
  }
  
  .fab-label {
    font-size: 20rpx;
    margin-top: 4rpx;
  }
  
  &.disabled {
    background: var(--border);
    box-shadow: none;
    
    .fab-icon {
      opacity: 0.6;
    }
  }
  
  &.fab-btn-left {
    background: var(--primary);
  }
}

/* 隐藏 canvas */
.share-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 750px;
  height: 30000px;
  pointer-events: none;
}

/* 预览弹窗 */
.preview-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 40rpx;
}

.preview-content {
  width: 100%;
  max-width: 640rpx;
  background: var(--bg-card);
  border-radius: 20rpx;
  overflow: hidden;
  padding: 20rpx;
}

.preview-img {
  width: 100%;
  border-radius: 12rpx;
  display: block;
}

.preview-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.preview-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 12rpx;
  background: var(--bg-hover);

  text {
    font-size: 28rpx;
    color: var(--text-secondary);
  }

  &.primary {
    background: var(--primary);

    text {
      color: #fff;
      font-weight: 600;
    }
  }
}
</style>
