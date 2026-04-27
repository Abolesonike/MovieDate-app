<script>
	import { initTheme } from './utils/theme.js'

	export default {
		onLaunch: function() {
			console.log('App Launch')
			initTheme()
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/* 亮色模式默认变量 */
	page {
		--primary: #667eea;
		--primary-light: rgba(102, 126, 234, 0.1);
		--primary-rgb: 102, 126, 234;

		--bg-page: #f5f5f5;
		--bg-card: #ffffff;
		--bg-hover: #f0f0f0;
		--bg-input: #f5f5f5;

		--text-primary: #333333;
		--text-secondary: #666666;
		--text-tertiary: #999999;
		--text-inverse: #ffffff;
		--text-link: #667eea;

		--border: #e0e0e0;
		--border-light: #f0f0f0;

		--shadow: rgba(0, 0, 0, 0.08);
		--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08);

		--gold: #FFD700;
		--silver: #C0C0C0;
		--bronze: #CD7F32;

		--tag-want-bg: #fff7e6;
		--tag-want-text: #fa8c16;
		--tag-want-border: #ffd591;
		--tag-planned-bg: #e6f7ff;
		--tag-planned-text: #1890ff;
		--tag-planned-border: #91d5ff;
		--tag-watched-bg: #f6ffed;
		--tag-watched-text: #52c41a;
		--tag-watched-border: #b7eb8f;
		--tag-default-bg: #f5f5f5;
		--tag-default-text: #666666;
		--tag-default-border: #e0e0e0;

		--rating-color: #ff9800;
	}

	/* 深色模式变量覆盖 */
	page.theme-dark {
		--bg-page: #121212;
		--bg-card: #1e1e1e;
		--bg-hover: #2d2d2d;
		--bg-input: #2d2d2d;

		--text-primary: #ffffff;
		--text-secondary: #b0b0b0;
		--text-tertiary: #808080;
		--text-inverse: #000000;
		--text-link: var(--primary);

		--border: #404040;
		--border-light: #2a2a2a;

		--shadow: rgba(0, 0, 0, 0.3);
		--shadow-card: 0 2px 8px rgba(0, 0, 0, 0.3);

		--tag-want-bg: rgba(250, 140, 22, 0.15);
		--tag-want-text: #ffb347;
		--tag-want-border: rgba(250, 140, 22, 0.3);
		--tag-planned-bg: rgba(24, 144, 255, 0.15);
		--tag-planned-text: #5cadff;
		--tag-planned-border: rgba(24, 144, 255, 0.3);
		--tag-watched-bg: rgba(82, 196, 26, 0.15);
		--tag-watched-text: #73d13d;
		--tag-watched-border: rgba(82, 196, 26, 0.3);
		--tag-default-bg: rgba(255, 255, 255, 0.08);
		--tag-default-text: #b0b0b0;
		--tag-default-border: rgba(255, 255, 255, 0.15);
	}

	/* 全局基础样式 */
	page {
		background-color: var(--bg-page);
		color: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}

	/* 统一卡片样式 */
	.card {
		background: var(--bg-card);
		border-radius: 12rpx;
		box-shadow: var(--shadow-card);
	}

	/* 统一按钮样式 */
	.btn-primary {
		background: var(--primary);
		color: #fff;
		border: none;
		border-radius: 8rpx;
	}

	.btn-primary::after {
		border: none;
	}

	/* 页面头部 */
	.page-header {
		background: var(--primary);
		color: #fff;
	}

	/* 文字颜色工具类 */
	.text-primary { color: var(--text-primary); }
	.text-secondary { color: var(--text-secondary); }
	.text-tertiary { color: var(--text-tertiary); }
	.text-theme { color: var(--primary); }
</style>
