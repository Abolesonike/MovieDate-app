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
 * 验证媒体 ID 有效性
 * 支持复合 ID 格式: movie_123, tv_123
 * 向后兼容纯数字格式: 123
 */
export function validateMovieId(movieId) {
  if (!movieId) {
    throw new Error(`无效的媒体ID: ${movieId}`)
  }
  // 支持复合 ID 格式 movie_123 或 tv_123
  if (typeof movieId === 'string' && (movieId.startsWith('movie_') || movieId.startsWith('tv_'))) {
    const numericPart = movieId.split('_')[1]
    if (!Number.isNaN(Number(numericPart))) {
      return
    }
  }
  // 向后兼容纯数字
  if (!Number.isNaN(Number(movieId))) {
    return
  }
  throw new Error(`无效的媒体ID: ${movieId}`)
}

/**
 * 从复合 ID 中提取媒体类型和原始 ID
 * @param {string|number} movieId - 媒体 ID
 * @returns {{mediaType: string, id: string}}
 */
export function parseMediaId(movieId) {
  if (typeof movieId === 'string' && movieId.includes('_')) {
    const [mediaType, id] = movieId.split('_')
    return { mediaType, id }
  }
  // 向后兼容：纯数字默认为电影
  return { mediaType: 'movie', id: String(movieId) }
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
