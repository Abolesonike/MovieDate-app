<template>
  <view class="index-page">
    <van-tabbar v-model="active" @change="onTabChange">
      <van-tabbar-item badge="3">
        <span>日历</span>
        <template #icon>
          <van-icon name="calendar-o" />
        </template>
      </van-tabbar-item>
      <van-tabbar-item>
        <span>电影</span>
        <template #icon>
          <van-icon name="video-o" />
        </template>
      </van-tabbar-item>
      <van-tabbar-item>
        <span>我</span>
        <template #icon>
          <van-icon name="contact-o" />
        </template>
      </van-tabbar-item>
    </van-tabbar>
  </view>
</template>

<script>
  import { ref } from 'vue';

	export default {
		data() {
			return {
				title: 'Hello',
				active: 0
			}
		},
		onLoad() {
			// 页面加载时可以根据需要设置 active 状态
		},
		methods: {
			onTabChange(index) {
				// pages.json 中 tabBar 列表顺序为：日历、电影、我
				const pages = [
					'/pages/calendar/calendar', 
					'/pages/movie/movie', 
					'/pages/me/me'
				];
				console.log('跳转到:', pages[index]);
				if (pages[index]) {
					// 切换到 tabBar 页面
					uni.switchTab({
						url: pages[index]
					});
				}
			}
		}

	}
</script>

<style>

</style>
