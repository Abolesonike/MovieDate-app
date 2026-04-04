<template>
  <view class="index-page">
    <!-- uni-app 的 tabBar 已在 pages.json 中配置，此页面仅作为占位 -->
    <view class="placeholder">
      <text class="hint-text">请使用底部导航栏切换页面</text>
    </view>
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
			// 页面加载时可以根据需要设置 active 状态
		},
		methods: {
		}
	}
</script>

<style scoped>
.index-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

.placeholder {
  text-align: center;
}

.hint-text {
  font-size: 14px;
  color: #999;
}
</style>
