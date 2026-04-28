import { STORAGE_KEYS } from './constants.js'

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 生成唯一 ID
 */
export function generateId() {
  return 'playlist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * 验证电影 ID 有效性
 */
export function validateMovieId(movieId) {
  if (!movieId || Number.isNaN(Number(movieId))) {
    throw new Error(`无效的电影ID: ${movieId}`)
  }
}

/**
 * 通用读取存储
 */
export function readStorage(key, defaultValue = null) {
  try {
    const data = uni.getStorageSync(key)
    return data !== '' && data !== undefined ? JSON.parse(data) : defaultValue
  } catch (e) {
    console.error(`读取存储失败 [${key}]:`, e)
    return defaultValue
  }
}

/**
 * 通用写入存储
 */
export function writeStorage(key, value) {
  uni.setStorageSync(key, JSON.stringify(value))
}
