/**
 * 主题管理模块
 * 管理主题色、深色模式，提供 applyTheme 统一应用
 */

import storage from './storage.js'

// 主题色配置
export const THEME_COLORS = {
  blue: {
    name: '蓝',
    primary: '#007AFF',
    primaryLight: 'rgba(0, 122, 255, 0.1)',
    primaryRgb: '0, 122, 255'
  },
  green: {
    name: '绿',
    primary: '#34C759',
    primaryLight: 'rgba(52, 199, 89, 0.1)',
    primaryRgb: '52, 199, 89'
  },
  pink: {
    name: '粉',
    primary: '#FF2D55',
    primaryLight: 'rgba(255, 45, 85, 0.1)',
    primaryRgb: '255, 45, 85'
  },
  purple: {
    name: '紫',
    primary: '#667eea',
    primaryLight: 'rgba(102, 126, 234, 0.1)',
    primaryRgb: '102, 126, 234'
  },
  orange: {
    name: '橙',
    primary: '#FF9500',
    primaryLight: 'rgba(255, 149, 0, 0.1)',
    primaryRgb: '255, 149, 0'
  }
}

export const DEFAULT_THEME = 'purple'

// 获取当前主题色 key
export function getTheme() {
  return storage.getTheme() || DEFAULT_THEME
}

// 设置主题色
export function setTheme(themeKey) {
  if (!THEME_COLORS[themeKey]) {
    themeKey = DEFAULT_THEME
  }
  storage.setTheme(themeKey)
  applyTheme()
}

// 获取深色模式开关
export function getDarkMode() {
  return storage.getDarkMode() || false
}

// 设置深色模式
export function setDarkMode(isDark) {
  storage.setDarkMode(isDark)
  applyTheme()
}

// 获取当前主题色配置对象
export function getThemeColor() {
  return THEME_COLORS[getTheme()] || THEME_COLORS[DEFAULT_THEME]
}

// 应用主题到当前页面
export function applyTheme() {
  const themeKey = getTheme()
  const isDark = getDarkMode()
  const themeConfig = THEME_COLORS[themeKey] || THEME_COLORS[DEFAULT_THEME]

  // 获取当前页面元素（尝试多种方式）
  const pages = getCurrentPages()
  if (pages.length === 0) return

  const page = pages[pages.length - 1]
  let pageEl = null

  // 尝试多种方式获取页面根元素
  try {
    pageEl = page.$page?.$el || page.$el
  } catch (e) {
    // 某些平台可能无法直接获取 DOM
  }

  // 使用 createSelectorQuery 作为跨平台兼容方案
  if (!pageEl) {
    try {
      const query = uni.createSelectorQuery()
      query.select('page').fields({ node: true }, (res) => {
        if (res?.node) {
          applyThemeToElement(res.node, themeKey, isDark, themeConfig)
        }
      }).exec()
    } catch (e) {
      // 忽略错误，继续设置导航栏
    }
  } else {
    applyThemeToElement(pageEl, themeKey, isDark, themeConfig)
  }

  // 同步设置导航栏和 tabBar 颜色（所有平台都支持）
  syncNavigationBar(themeConfig.primary, isDark)
  syncTabBar(themeConfig.primary, isDark)
}

// 将主题应用到指定元素
function applyThemeToElement(pageEl, themeKey, isDark, themeConfig) {
  if (!pageEl) return

  try {
    // 移除旧主题 class
    Object.keys(THEME_COLORS).forEach(key => {
      if (pageEl.classList) {
        pageEl.classList.remove(`theme-${key}`)
      }
    })
    if (pageEl.classList) {
      pageEl.classList.remove('theme-dark')
    }

    // 添加新主题 class
    if (pageEl.classList) {
      pageEl.classList.add(`theme-${themeKey}`)
      if (isDark) {
        pageEl.classList.add('theme-dark')
      }
    }

    // 设置 CSS 变量
    if (pageEl.style) {
      pageEl.style.setProperty('--primary', themeConfig.primary)
      pageEl.style.setProperty('--primary-light', themeConfig.primaryLight)
      pageEl.style.setProperty('--primary-rgb', themeConfig.primaryRgb)
    }
  } catch (e) {
    console.warn('应用主题到元素失败:', e)
  }
}

// 同步导航栏颜色
function syncNavigationBar(primaryColor, isDark) {
  const frontColor = isDark ? '#ffffff' : '#000000'
  const bgColor = isDark ? '#121212' : '#F8F8F8'

  uni.setNavigationBarColor({
    frontColor,
    backgroundColor: bgColor,
    animation: {
      duration: 200,
      timingFunc: 'easeIn'
    }
  })
}

// 同步 tabBar 颜色
function syncTabBar(primaryColor, isDark) {
  const color = isDark ? '#808080' : '#7A7E83'
  const selectedColor = primaryColor
  const bgColor = isDark ? '#1e1e1e' : '#ffffff'
  const borderStyle = isDark ? 'white' : 'black'

  uni.setTabBarStyle({
    color,
    selectedColor,
    backgroundColor: bgColor,
    borderStyle
  })
}

// 初始化主题（应用启动时调用）
export function initTheme() {
  applyTheme()
}
