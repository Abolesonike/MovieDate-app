import { STORAGE_KEYS } from './constants.js'

export function getTheme() {
  try {
    return uni.getStorageSync(STORAGE_KEYS.THEME)
  } catch (e) {
    return null
  }
}

export function setTheme(themeKey) {
  uni.setStorageSync(STORAGE_KEYS.THEME, themeKey)
}

export function getDarkMode() {
  try {
    const value = uni.getStorageSync(STORAGE_KEYS.DARK_MODE)
    return value === true || value === 'true'
  } catch (e) {
    return false
  }
}

export function setDarkMode(isDark) {
  uni.setStorageSync(STORAGE_KEYS.DARK_MODE, isDark)
}

export function setCloudConfig(config) {
  uni.setStorageSync(STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(config))
}

export function getCloudConfig() {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.SYNC_CONFIG)
    return data ? JSON.parse(data) : null
  } catch (e) {
    return null
  }
}

export function clearCloudConfig() {
  uni.removeStorageSync(STORAGE_KEYS.SYNC_CONFIG)
}
