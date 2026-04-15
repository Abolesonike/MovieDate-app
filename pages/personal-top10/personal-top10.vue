<template>
  <view class="container">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon"><</text>
      </view>
      <text class="nav-title">个人 TOP10</text>
      <view class="nav-action" @click="onAdd">
        <text v-if="top10List.length < 10" class="nav-add-icon">+</text>
        <text v-else class="nav-add-icon disabled">+</text>
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view class="content-scroll" scroll-y>
      <!-- 空状态 -->
      <view v-if="top10List.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">🏆</text>
        <text class="empty-title">还没有个人 TOP10</text>
        <text class="empty-subtitle">点击右上角 + 搜索添加电影吧</text>
      </view>

      <!-- Top10 列表 -->
      <view v-else class="top10-list">
        <view
          v-for="(movie, index) in top10List"
          :key="movie.id"
          class="top10-item"
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

          <view class="item-actions">
            <view
              v-if="index > 0"
              class="action-btn"
              @click="moveUp(index)"
            >
              <text class="action-icon">↑</text>
            </view>
            <view
              v-if="index < top10List.length - 1"
              class="action-btn"
              @click="moveDown(index)"
            >
              <text class="action-icon">↓</text>
            </view>
            <view class="action-btn delete" @click="removeMovie(movie.id)">
              <text class="action-icon delete">×</text>
            </view>
          </view>
        </view>
      </view>

      <view class="content-footer"></view>
    </scroll-view>

    <!-- 底部生成按钮 -->
    <view class="bottom-bar">
      <view
        :class="['generate-btn', top10List.length === 0 ? 'disabled' : '']"
        @click="onGenerate"
      >
        <text class="generate-text">生成海报</text>
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
      previewImage: ''
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
      uni.navigateTo({
        url: '/pages/personal-top10-search/personal-top10-search'
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

    moveUp(index) {
      if (index <= 0) return
      const list = [...this.top10List]
      const temp = list[index]
      list[index] = list[index - 1]
      list[index - 1] = temp
      this.top10List = list
      this.saveOrder()
    },

    moveDown(index) {
      if (index >= this.top10List.length - 1) return
      const list = [...this.top10List]
      const temp = list[index]
      list[index] = list[index + 1]
      list[index + 1] = temp
      this.top10List = list
      this.saveOrder()
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
}

/* 自定义导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
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
  color: #333;
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
    color: #ccc;
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
  color: #666;
  margin-bottom: 16rpx;
}

.empty-subtitle {
  font-size: 26rpx;
  color: #999;
}

.top10-list {
  padding: 20rpx;
}

.top10-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
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
    background: linear-gradient(135deg, #ffd700 0%, #ffb700 100%);
  }

  &.silver {
    background: linear-gradient(135deg, #e0e0e0 0%, #c0c0c0 100%);
  }

  &.bronze {
    background: linear-gradient(135deg, #e8a87c 0%, #cd7f32 100%);
  }

  &.normal {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  color: #333;
  font-weight: 500;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  font-size: 24rpx;
  color: #999;
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
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  &.delete {
    background: rgba(255, 107, 107, 0.1);
  }
}

.action-icon {
  font-size: 28rpx;
  color: #666;

  &.delete {
    color: #ff6b6b;
  }
}

.content-footer {
  height: 40rpx;
}

/* 底部生成按钮 */
.bottom-bar {
  padding: 20rpx 40rpx 40rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
}

.generate-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  border-radius: 44rpx;
  padding: 26rpx 0;
  text-align: center;
  box-shadow: 0 8rpx 30rpx rgba(255, 107, 107, 0.35);

  &.disabled {
    background: #ddd;
    box-shadow: none;
  }
}

.generate-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
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
  background: #fff;
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
  background: #f0f0f0;

  text {
    font-size: 28rpx;
    color: #666;
  }

  &.primary {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);

    text {
      color: #fff;
      font-weight: 600;
    }
  }
}
</style>
