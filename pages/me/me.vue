<template>
  <view class="content">
    <!-- 这里放置"我"页面的具体内容 -->
    <text class="title">{{ title }}</text>
    <view>这里是我的页面的内容区域</view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      title: 'Hello'
    }
  },
  onLoad() {
    // 页面加载逻辑
  },
  methods: {
    // 方法逻辑
  }
}
</script>

<style>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.title {
  font-size: 20px;
  margin-bottom: 20px;
}
</style>
