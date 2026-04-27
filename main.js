import App from './App'
import { applyTheme } from './utils/theme.js'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
  ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)

  // 注册全局 mixin：每个页面显示时自动应用主题
  app.mixin({
    onShow() {
      applyTheme()
    }
  })

  // Vant 4 已移除，使用 uni-app 原生组件
  return {
    app
  }
}
// #endif
