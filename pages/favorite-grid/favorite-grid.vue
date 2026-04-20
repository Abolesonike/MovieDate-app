<template>
  <view class="container">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @click="goBack">
        <text class="nav-back-icon"><</text>
      </view>
      <text class="nav-title">个人喜好表</text>
      <view class="nav-action" @click="showHelp">
        <text class="nav-action-icon">?</text>
      </view>
    </view>

    <!-- 标题 -->
    <view class="page-header">
      <text class="page-title" @click="openTitleEdit">{{ gridData.title }}</text>
      <text class="page-subtitle">{{ filledCount }}/30</text>
    </view>

    <!-- 网格 -->
    <scroll-view class="grid-scroll" scroll-y>
      <view class="grid">
        <view
          v-for="index in 30"
          :key="index - 1"
          class="grid-item"
          @click="onGridItemClick(index - 1)"
          @longpress="onGridItemLongPress(index - 1)"
        >
          <view class="item-image-wrapper">
            <image
              v-if="getItem(index - 1)?.poster"
              :src="getItem(index - 1).poster"
              class="item-image"
              mode="aspectFill"
            />
            <view v-else class="item-placeholder">
              <text class="placeholder-icon">+</text>
            </view>
          </view>
          <text class="item-label">{{ getItem(index - 1)?.label || '' }}</text>
        </view>
      </view>
      <view class="grid-footer"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <view class="action-btn" @click="saveImage">
        <text class="action-icon">🖼️</text>
        <text class="action-text">保存图片</text>
      </view>
      <view class="action-btn" @click="exportTemplate">
        <text class="action-icon">📤</text>
        <text class="action-text">导出模板</text>
      </view>
      <view class="action-btn" @click="importTemplate">
        <text class="action-icon">📥</text>
        <text class="action-text">导入模板</text>
      </view>
    </view>

    <!-- 编辑弹窗 -->
    <view v-if="showEditModal" class="modal-mask" @click="closeEditModal">
      <view class="modal-content" @click.stop>
        <text class="modal-title">{{ editingIndex >= 0 ? '编辑标签' : '添加标签' }}</text>
        <input
          v-model="editLabel"
          class="modal-input"
          placeholder="输入标签，如：最爱的一部"
          maxlength="20"
        />
        <view class="type-selector">
          <text class="type-label">类型：</text>
          <view
            :class="['type-option', editType === 'movie' ? 'type-active' : '']"
            @click="editType = 'movie'"
          >
            <text>电影</text>
          </view>
          <view
            :class="['type-option', editType === 'person' ? 'type-active' : '']"
            @click="editType = 'person'"
          >
            <text>影人</text>
          </view>
        </view>
        <view class="modal-actions">
          <view class="modal-btn" @click="closeEditModal">
            <text>取消</text>
          </view>
          <view class="modal-btn primary" @click="goToPicker">
            <text>去搜索</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 标题编辑弹窗 -->
    <view v-if="showTitleEdit" class="modal-mask" @click="closeTitleEdit">
      <view class="modal-content" @click.stop>
        <text class="modal-title">编辑标题</text>
        <input
          v-model="editTitle"
          class="modal-input"
          placeholder="输入标题"
          maxlength="50"
        />
        <view class="modal-actions">
          <view class="modal-btn" @click="closeTitleEdit">
            <text>取消</text>
          </view>
          <view class="modal-btn primary" @click="confirmTitleEdit">
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 长按操作菜单 -->
    <view v-if="showActionMenu" class="modal-mask" @click="closeActionMenu">
      <view class="action-menu" @click.stop>
        <view class="action-menu-item" @click="doEditItem">
          <text>编辑标签</text>
        </view>
        <view class="action-menu-item" @click="doReplaceItem">
          <text>重新选择</text>
        </view>
        <view class="action-menu-item danger" @click="doDeleteItem">
          <text>删除</text>
        </view>
        <view class="action-menu-item cancel" @click="closeActionMenu">
          <text>取消</text>
        </view>
      </view>
    </view>

    <!-- 导入弹窗 -->
    <view v-if="showImportModal" class="modal-mask" @click="closeImportModal">
      <view class="modal-content" @click.stop>
        <text class="modal-title">导入模板</text>
        <textarea
          v-model="importText"
          class="modal-textarea"
          placeholder="粘贴模板 JSON 内容"
          maxlength="50000"
        />
        <view class="modal-actions">
          <view class="modal-btn" @click="closeImportModal">
            <text>取消</text>
          </view>
          <view class="modal-btn primary" @click="confirmImport">
            <text>导入</text>
          </view>
        </view>
      </view>
    </view>

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
          <view class="preview-btn primary" @click="saveImageToAlbum">
            <text>保存到相册</text>
          </view>
          <view class="preview-btn" @click="closePreview">
            <text>关闭</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 隐藏 canvas -->
    <canvas canvas-id="favoriteGridCanvas" class="share-canvas"></canvas>
  </view>
</template>

<script>
import storage from '@/utils/storage.js'
import { generateFavoriteGridImage } from '@/utils/posterShare.js'

export default {
  data() {
    return {
      gridData: {
        title: '',
        items: []
      },
      editingIndex: -1,
      showEditModal: false,
      editLabel: '',
      editType: 'movie',
      showTitleEdit: false,
      editTitle: '',
      previewImage: '',
      showActionMenu: false,
      actionMenuIndex: -1,
      showImportModal: false,
      importText: ''
    }
  },

  computed: {
    filledCount() {
      return this.gridData.items.length
    }
  },

  onLoad() {
    this.loadGridData()
  },

  onShow() {
    this.loadGridData()
  },

  onUnload() {
    uni.$off('favoriteGridPicked')
  },

  methods: {
    goBack() {
      uni.navigateBack()
    },

    showHelp() {
      uni.showModal({
        title: '使用说明',
        content: '点击空白格子添加电影或影人，长按已有项可编辑或删除。支持保存为图片分享，也可以导出/导入模板与好友分享。',
        showCancel: false
      })
    },

    loadGridData() {
      this.gridData = storage.getFavoriteGrid()
    },

    getItem(index) {
      return this.gridData.items.find(item => item.index === index)
    },

    onGridItemClick(index) {
      const item = this.getItem(index)
      if (item) {
        // 已有项，打开编辑
        this.editingIndex = index
        this.editLabel = item.label
        this.editType = item.type
        this.showEditModal = true
      } else {
        // 空位，添加新项
        this.editingIndex = index
        this.editLabel = ''
        this.editType = 'movie'
        this.showEditModal = true
      }
    },

    onGridItemLongPress(index) {
      const item = this.getItem(index)
      if (!item) return
      this.actionMenuIndex = index
      this.showActionMenu = true
    },

    closeEditModal() {
      this.showEditModal = false
      this.editingIndex = -1
      this.editLabel = ''
      this.editType = 'movie'
    },

    goToPicker() {
      if (!this.editLabel.trim()) {
        uni.showToast({ title: '请输入标签', icon: 'none' })
        return
      }
      // 先保存标签
      this.showEditModal = false
      // 跳转到选择页面
      const tabs = this.editType === 'person' ? 'personSearch' : 'search,want,watched'
      uni.navigateTo({
        url: `/pages/movie-picker/movie-picker?source=favorite-grid&tabs=${tabs}&pickType=${this.editType}`
      })
      // 监听选择结果
      uni.$once('favoriteGridPicked', this.onPicked)
    },

    onPicked(data) {
      const index = this.editingIndex
      if (index < 0) return

      const label = this.editLabel.trim()
      let meta = {}

      if (data.type === 'person') {
        meta = {
          title: data.name,
          poster: data.profile,
          department: data.knownFor
        }
      } else {
        meta = {
          title: data.title,
          poster: data.poster,
          year: data.year
        }
      }

      storage.addFavoriteGridItem(index, data.type, data.id, label, meta)
      this.loadGridData()
      this.editingIndex = -1
      this.editLabel = ''
      uni.showToast({ title: '添加成功', icon: 'success' })
    },

    openTitleEdit() {
      this.editTitle = this.gridData.title
      this.showTitleEdit = true
    },

    closeTitleEdit() {
      this.showTitleEdit = false
      this.editTitle = ''
    },

    confirmTitleEdit() {
      storage.updateFavoriteGridTitle(this.editTitle.trim())
      this.loadGridData()
      this.closeTitleEdit()
    },

    closeActionMenu() {
      this.showActionMenu = false
      this.actionMenuIndex = -1
    },

    doEditItem() {
      const index = this.actionMenuIndex
      const item = this.getItem(index)
      if (!item) {
        this.closeActionMenu()
        return
      }
      this.closeActionMenu()
      this.editingIndex = index
      this.editLabel = item.label
      this.editType = item.type
      this.showEditModal = true
    },

    doReplaceItem() {
      const index = this.actionMenuIndex
      const item = this.getItem(index)
      if (!item) {
        this.closeActionMenu()
        return
      }
      this.closeActionMenu()
      this.editingIndex = index
      this.editLabel = item.label
      this.editType = item.type
      // 直接跳转到选择页面
      const tabs = this.editType === 'person' ? 'personSearch' : 'search,want,watched'
      uni.navigateTo({
        url: `/pages/movie-picker/movie-picker?source=favorite-grid&tabs=${tabs}&pickType=${this.editType}`
      })
      uni.$once('favoriteGridPicked', this.onPicked)
    },

    doDeleteItem() {
      const index = this.actionMenuIndex
      this.closeActionMenu()
      uni.showModal({
        title: '确认删除',
        content: '确定删除此项吗？',
        confirmColor: '#ff6b6b',
        success: (res) => {
          if (res.confirm) {
            storage.removeFavoriteGridItem(index)
            this.loadGridData()
            uni.showToast({ title: '已删除', icon: 'success' })
          }
        }
      })
    },

    async saveImage() {
      if (this.filledCount === 0) {
        uni.showToast({ title: '请至少添加一项', icon: 'none' })
        return
      }
      uni.showLoading({ title: '生成中...', mask: true })
      try {
        const path = await generateFavoriteGridImage({
          title: this.gridData.title,
          items: this.gridData.items,
          canvasId: 'favoriteGridCanvas',
          componentThis: this
        })
        this.previewImage = path
      } catch (error) {
        console.error('生成喜好海报墙失败:', error)
        uni.showToast({ title: '生成失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },

    closePreview() {
      this.previewImage = ''
    },

    async saveImageToAlbum() {
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
    },

    exportTemplate() {
      const template = storage.exportFavoriteGridTemplate()
      const jsonStr = JSON.stringify(template, null, 2)

      // #ifdef H5
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moviedate_favorite_grid_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      uni.showToast({ title: '已导出', icon: 'success' })
      // #endif

      // #ifndef H5
      uni.setClipboardData({
        data: jsonStr,
        success: () => {
          uni.showToast({ title: '模板已复制到剪贴板', icon: 'success' })
        }
      })
      // #endif
    },

    importTemplate() {
      this.importText = ''
      this.showImportModal = true
    },

    closeImportModal() {
      this.showImportModal = false
      this.importText = ''
    },

    confirmImport() {
      const text = this.importText.trim()
      if (!text) {
        uni.showToast({ title: '请输入模板内容', icon: 'none' })
        return
      }
      const result = storage.importFavoriteGridTemplate(text)
      if (result.success) {
        this.loadGridData()
        this.closeImportModal()
        uni.showToast({ title: `成功导入${result.imported.count}项`, icon: 'success' })
      } else {
        uni.showToast({ title: result.error || '导入失败', icon: 'none' })
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

.nav-action-icon {
  font-size: 32rpx;
  color: #666;
  font-weight: 600;
}

/* 页面标题 */
.page-header {
  text-align: center;
  padding: 30rpx 40rpx 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.page-subtitle {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

/* 网格 */
.grid-scroll {
  flex: 1;
  min-height: 0;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx;
}

.grid-item {
  width: calc((100% - 80rpx) / 6);
  margin-right: 16rpx;
  margin-bottom: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.grid-item:nth-child(6n) {
  margin-right: 0;
}

.item-image-wrapper {
  width: 100%;
  position: relative;
  padding-bottom: 150%;
  border-radius: 12rpx;
  overflow: hidden;
  background: #e8e8e8;
  border: 1rpx solid #e0e0e0;
}

.item-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.item-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  font-size: 48rpx;
  color: #ccc;
  font-weight: 300;
}

.item-label {
  font-size: 20rpx;
  color: #333;
  margin-top: 8rpx;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-footer {
  height: 40rpx;
}

/* 底部操作栏 */
.bottom-actions {
  display: flex;
  justify-content: space-around;
  padding: 20rpx 40rpx 40rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 24rpx;
}

.action-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.action-text {
  font-size: 24rpx;
  color: #666;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 40rpx;
}

.modal-content {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  text-align: center;
  margin-bottom: 30rpx;
  display: block;
}

.modal-input {
  width: 100%;
  height: 80rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 24rpx;
}

.modal-textarea {
  width: 100%;
  height: 300rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: #333;
  margin-bottom: 24rpx;
}

.type-selector {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.type-label {
  font-size: 28rpx;
  color: #666;
  margin-right: 20rpx;
}

.type-option {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  background: #f0f0f0;
  margin-right: 16rpx;

  text {
    font-size: 26rpx;
    color: #666;
  }

  &.type-active {
    background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%);

    text {
      color: #fff;
    }
  }
}

.modal-actions {
  display: flex;
  gap: 20rpx;
}

.modal-btn {
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
    background: linear-gradient(135deg, #007AFF 0%, #0056b3 100%);

    text {
      color: #fff;
      font-weight: 600;
    }
  }
}

/* 操作菜单 */
.action-menu {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.action-menu-item {
  text-align: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  text {
    font-size: 30rpx;
    color: #333;
  }

  &.danger text {
    color: #ff6b6b;
  }

  &.cancel {
    border-bottom: none;

    text {
      color: #999;
    }
  }
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

/* 隐藏 canvas */
.share-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 750px;
  height: 30000px;
  pointer-events: none;
}
</style>
