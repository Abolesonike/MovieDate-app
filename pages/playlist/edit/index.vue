<template>
  <view class="edit-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <text class="nav-cancel" @click="goBack">取消</text>
      <text class="nav-title">{{ isEdit ? '编辑片单' : '新建片单' }}</text>
      <text class="nav-save" @click="savePlaylist">保存</text>
    </view>

    <view class="form-content">
      <!-- 片单名称 -->
      <view class="form-item">
        <text class="form-label">片单名称</text>
        <input
          v-model="formData.name"
          class="form-input"
          placeholder="请输入片单名称"
          maxlength="50"
        />
      </view>

      <!-- 片单描述 -->
      <view class="form-item">
        <text class="form-label">片单描述（可选）</text>
        <textarea
          v-model="formData.description"
          class="form-textarea"
          placeholder="请输入片单描述"
          maxlength="200"
        />
      </view>

      <!-- 标签 -->
      <view class="form-item">
        <text class="form-label">标签（可选）</text>
        <view class="tags-container">
          <view v-for="(tag, index) in formData.tags" :key="index" class="tag-item">
            <text>{{ tag }}</text>
            <text class="tag-remove" @click="removeTag(index)">×</text>
          </view>
          <view v-if="formData.tags.length < 5" class="tag-add" @click="showTagInput">
            <text>+ 添加标签</text>
          </view>
        </view>
      </view>

      <!-- 热门标签提示 -->
      <view class="hot-tags">
        <text class="hot-tags-label">热门标签：</text>
        <view class="hot-tags-list">
          <text
            v-for="tag in hotTags"
            :key="tag"
            class="hot-tag"
            @click="addHotTag(tag)"
          >{{ tag }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import storage from '@/utils/storage.js'

export default {
  data() {
    return {
      playlistId: '',
      isEdit: false,
      formData: {
        name: '',
        description: '',
        tags: []
      },
      hotTags: ['科幻', '喜剧', '剧情', '动作', '爱情', '悬疑', '恐怖', '动画']
    }
  },
  onLoad(options) {
    if (options.playlistId) {
      this.playlistId = options.playlistId
      this.isEdit = true
      this.loadPlaylist()
    }
  },
  methods: {
    loadPlaylist() {
      const playlist = storage.getPlaylist(this.playlistId)
      if (playlist) {
        this.formData.name = playlist.name
        this.formData.description = playlist.description || ''
        this.formData.tags = [...(playlist.tags || [])]
      }
    },
    goBack() {
      uni.navigateBack()
    },
    savePlaylist() {
      if (!this.formData.name.trim()) {
        uni.showToast({ title: '请输入片单名称', icon: 'none' })
        return
      }

      let result
      if (this.isEdit) {
        result = storage.updatePlaylist(this.playlistId, {
          name: this.formData.name,
          description: this.formData.description,
          tags: this.formData.tags
        })
      } else {
        result = storage.createPlaylist({
          name: this.formData.name,
          description: this.formData.description,
          tags: this.formData.tags
        })
      }

      if (result.success) {
        uni.showToast({
          title: this.isEdit ? '已更新' : '已创建',
          icon: 'success'
        })
        uni.navigateBack()
      } else {
        uni.showToast({ title: result.message, icon: 'none' })
      }
    },
    showTagInput() {
      uni.showModal({
        title: '添加标签',
        editable: true,
        placeholderText: '请输入标签名称',
        success: (res) => {
          if (res.confirm && res.content) {
            const tag = res.content.trim()
            if (tag && !this.formData.tags.includes(tag)) {
              this.formData.tags.push(tag)
            }
          }
        }
      })
    },
    removeTag(index) {
      this.formData.tags.splice(index, 1)
    },
    addHotTag(tag) {
      if (!this.formData.tags.includes(tag)) {
        if (this.formData.tags.length >= 5) {
          uni.showToast({ title: '最多添加5个标签', icon: 'none' })
          return
        }
        this.formData.tags.push(tag)
      }
    }
  }
}
</script>

<style scoped>
.edit-page {
  min-height: 100vh;
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

.nav-cancel, .nav-save {
  font-size: 15px;
  color: #007AFF;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-content {
  padding: 16px;
}

.form-item {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-input {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
}

.form-textarea {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
  min-height: 80px;
  width: 100%;
  box-sizing: border-box;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #007AFF;
  color: #fff;
  border-radius: 16px;
  font-size: 13px;
}

.tag-remove {
  font-size: 16px;
  opacity: 0.8;
}

.tag-add {
  padding: 6px 12px;
  background: var(--bg-card);
  border: 1px dashed #ddd;
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.hot-tags {
  margin-top: -12px;
}

.hot-tags-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.hot-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.hot-tag {
  padding: 4px 10px;
  background: var(--bg-card);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
