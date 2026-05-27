/**
 * 本地存储统一入口
 * 按领域拆分为独立模块，保持 StorageManager API 向后兼容
 */

import { MOVIE_STATUS } from './constants.js'
import { formatDate } from './utils.js'

import {
  getAllMovieStatus,
  getMovieStatus,
  setMovieStatus,
  removeMovieStatus,
  markAsWant,
  markAsWatched,
  getWantList,
  getWatchedList,
  getPlannedList,
  getMovieTimeline,
  updateWatchedReview,
  getMovieTimelineHistory,
  getWatchedRecords,
  removeWatchedRecord,
  movieStatusCache
} from './movieStatus.js'

import {
  getAllCalendarEvents,
  getEventsByDate,
  addCalendarEvent,
  removeCalendarEvent,
  updateCalendarEvent,
  getEventsByDateRange,
  _getDateStatus,
  calendarCache
} from './calendar.js'

import {
  getAllPlaylists,
  getPlaylist,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addMoviesToPlaylist,
  removeMovieFromPlaylist,
  getPlaylistProgress,
  duplicatePlaylist
} from './playlist.js'

import {
  getPersonalTop10,
  addToPersonalTop10,
  removeFromPersonalTop10,
  updatePersonalTop10Order,
  isInPersonalTop10
} from './personalTop10.js'

import {
  getFavoriteGrid,
  saveFavoriteGrid,
  addFavoriteGridItem,
  removeFavoriteGridItem,
  updateFavoriteGridTitle,
  updateFavoriteGridLabel,
  exportFavoriteGridTemplate,
  importFavoriteGridTemplate
} from './favoriteGrid.js'

import {
  getTheme,
  setTheme,
  getDarkMode,
  setDarkMode,
  setCloudConfig,
  getCloudConfig,
  clearCloudConfig
} from './settings.js'

import {
  getStatistics
} from './statistics.js'

import {
  exportAllData,
  exportToFile,
  importData,
  importFromFile
} from './importExport.js'

// 存储键名常量（向后兼容）
const STORAGE_KEYS = {
  MOVIE_STATUS: 'movie_status',
  CALENDAR_EVENTS: 'calendar_events',
  USER_SETTINGS: 'user_settings',
  SYNC_CONFIG: 'sync_config',
  PERSONAL_TOP10: 'personal_top10',
  FAVORITE_GRID: 'favorite_grid',
  PLAYLISTS: 'movie_playlists',
  THEME: 'app_theme',
  DARK_MODE: 'app_dark_mode'
}

class StorageManager {
  constructor() {
    this.cache = { movieStatus: null, calendarEvents: null }
  }

  // ==================== 电影状态管理 ====================
  getAllMovieStatus() {
    const result = getAllMovieStatus()
    this.cache.movieStatus = result
    return result
  }

  getMovieStatus(movieId) {
    return getMovieStatus(movieId)
  }

  setMovieStatus(movieId, status, extra = {}) {
    const result = setMovieStatus(movieId, status, extra)
    this.cache.movieStatus = getAllMovieStatus()
    return result
  }

  removeMovieStatus(movieId) {
    const data = getMovieStatus(movieId)
    if (data?.timeline) {
      if (data.timeline.planned?.calendarEventId) {
        removeCalendarEvent(data.timeline.planned.date, data.timeline.planned.calendarEventId)
      }
      const watchedRecords = Array.isArray(data.timeline.watched)
        ? data.timeline.watched
        : (data.timeline.watched ? [data.timeline.watched] : [])
      watchedRecords.forEach(r => {
        if (r.calendarEventId) {
          removeCalendarEvent(r.date, r.calendarEventId)
        }
      })
    }
    removeMovieStatus(movieId)
    this.cache.movieStatus = null
  }

  markAsWant(movieId) {
    const result = markAsWant(movieId)
    this.cache.movieStatus = getAllMovieStatus()
    return result
  }

  markAsWatched(movieId, data = {}) {
    const dateStr = data.date || formatDate(new Date())

    // 判断是否重刷
    const currentStatus = getMovieStatus(movieId)
    const isRewatch = currentStatus.status === MOVIE_STATUS.WATCHED

    // 添加到日历
    let calendarEvent = null

    if (!isRewatch) {
      // 首次标记已看：检查是否已有 planned 事件
      const existingEvents = getEventsByDate(dateStr)
      const exists = existingEvents.find(e => e.movieId === movieId)

      if (!exists) {
        const result = addCalendarEvent(dateStr, { movieId })
        if (result.success) {
          calendarEvent = result.event
        }
      } else {
        calendarEvent = exists
      }
    } else {
      // 重刷：总是创建新日历事件
      const result = addCalendarEvent(dateStr, { movieId })
      if (result.success) {
        calendarEvent = result.event
      }
    }

    if (calendarEvent) {
      updateCalendarEvent(dateStr, calendarEvent.id, { status: MOVIE_STATUS.WATCHED })
    }

    const extra = { date: dateStr }
    if (data.rating !== undefined) extra.rating = data.rating
    if (data.review !== undefined) extra.review = data.review
    if (calendarEvent) extra.calendarEventId = calendarEvent.id

    const movie = setMovieStatus(movieId, MOVIE_STATUS.WATCHED, extra)
    this.cache.movieStatus = getAllMovieStatus()

    return {
      success: true,
      movie,
      event: calendarEvent,
      message: isRewatch ? `已记录重刷 (${dateStr})` : `已标记为已看并添加到 ${dateStr}`
    }
  }

  getWantList() { return getWantList() }
  getWatchedList() { return getWatchedList() }
  getPlannedList() { return getPlannedList() }
  getMovieTimeline(movieId) { return getMovieTimeline(movieId) }

  updateWatchedReview(movieId, data) {
    const result = updateWatchedReview(movieId, data)
    this.cache.movieStatus = getAllMovieStatus()
    return result
  }

  getMovieTimelineHistory(movieId) {
    return getMovieTimelineHistory(movieId)
  }

  getWatchedRecords(movieId) {
    return getWatchedRecords(movieId)
  }

  removeWatchedRecord(movieId, recordId) {
    const result = removeWatchedRecord(movieId, recordId)
    if (result) {
      this.cache.movieStatus = getAllMovieStatus()
    }
    return result
  }

  // ==================== 日历事件管理 ====================
  getAllCalendarEvents() {
    const result = getAllCalendarEvents()
    this.cache.calendarEvents = result
    return result
  }

  getEventsByDate(dateStr) {
    return getEventsByDate(dateStr)
  }

  addCalendarEvent(dateStr, movieEvent) {
    const result = addCalendarEvent(dateStr, movieEvent)
    if (result.success) {
      this.cache.calendarEvents = getAllCalendarEvents()
      setMovieStatus(movieEvent.movieId, MOVIE_STATUS.PLANNED, {
        date: dateStr,
        calendarEventId: result.event.id
      })
      this.cache.movieStatus = getAllMovieStatus()
    }
    return result
  }

  removeCalendarEvent(dateStr, eventId) {
    removeCalendarEvent(dateStr, eventId)
    this.cache.calendarEvents = getAllCalendarEvents()
  }

  updateCalendarEvent(dateStr, eventId, updates) {
    updateCalendarEvent(dateStr, eventId, updates)
    this.cache.calendarEvents = getAllCalendarEvents()
  }

  getEventsByDateRange(startDate, endDate) {
    return getEventsByDateRange(startDate, endDate)
  }

  _getDateStatus(dateStr) {
    return _getDateStatus(dateStr)
  }

  _formatDate(date) {
    return formatDate(date)
  }

  // ==================== 个人 Top10 ====================
  getPersonalTop10() { return getPersonalTop10() }
  addToPersonalTop10(movieId) { return addToPersonalTop10(movieId) }
  removeFromPersonalTop10(movieId) { return removeFromPersonalTop10(movieId) }
  updatePersonalTop10Order(orderedMovieIds) { return updatePersonalTop10Order(orderedMovieIds) }
  isInPersonalTop10(movieId) { return isInPersonalTop10(movieId) }

  // ==================== 喜好海报墙 ====================
  getFavoriteGrid() { return getFavoriteGrid() }
  saveFavoriteGrid(data) { return saveFavoriteGrid(data) }
  addFavoriteGridItem(index, type, id, label, meta) { return addFavoriteGridItem(index, type, id, label, meta) }
  removeFavoriteGridItem(index) { return removeFavoriteGridItem(index) }
  updateFavoriteGridTitle(title) { return updateFavoriteGridTitle(title) }
  updateFavoriteGridLabel(index, label) { return updateFavoriteGridLabel(index, label) }
  exportFavoriteGridTemplate() { return exportFavoriteGridTemplate() }
  importFavoriteGridTemplate(input) { return importFavoriteGridTemplate(input) }

  // ==================== 片单管理 ====================
  getAllPlaylists() { return getAllPlaylists() }
  getPlaylist(playlistId) { return getPlaylist(playlistId) }
  createPlaylist(data) { return createPlaylist(data) }
  updatePlaylist(playlistId, updates) { return updatePlaylist(playlistId, updates) }
  deletePlaylist(playlistId) { return deletePlaylist(playlistId) }
  addMoviesToPlaylist(playlistId, movieIds) { return addMoviesToPlaylist(playlistId, movieIds) }
  removeMovieFromPlaylist(playlistId, movieId) { return removeMovieFromPlaylist(playlistId, movieId) }
  getPlaylistProgress(playlistId) { return getPlaylistProgress(playlistId) }
  duplicatePlaylist(playlistId) { return duplicatePlaylist(playlistId) }

  // ==================== 主题设置 ====================
  getTheme() { return getTheme() }
  setTheme(themeKey) { return setTheme(themeKey) }
  getDarkMode() { return getDarkMode() }
  setDarkMode(isDark) { return setDarkMode(isDark) }

  // ==================== 云同步 ====================
  setCloudConfig(config) { return setCloudConfig(config) }
  getCloudConfig() { return getCloudConfig() }
  clearCloudConfig() { return clearCloudConfig() }

  async syncToCloud() {
    const config = getCloudConfig()
    if (!config) {
      throw new Error('请先配置云同步')
    }
    console.log('[CloudSync] syncToCloud called with config:', config.provider)
    return { success: true, message: '云同步接口已预留' }
  }

  async syncFromCloud() {
    const config = getCloudConfig()
    if (!config) {
      throw new Error('请先配置云同步')
    }
    console.log('[CloudSync] syncFromCloud called with config:', config.provider)
    return { success: true, message: '云同步接口已预留' }
  }

  // ==================== 导入导出 ====================
  exportAllData() { return exportAllData() }
  exportToFile() { return exportToFile() }
  importData(inputData) { return importData(inputData) }
  importFromFile() { return importFromFile() }

  // ==================== 统计 ====================
  getStatistics() { return getStatistics() }

  // ==================== 数据清理 ====================
  clearAllData() {
    this.cache = { movieStatus: null, calendarEvents: null }
    movieStatusCache.value = null
    calendarCache.value = null
    Object.values(STORAGE_KEYS).forEach(key => {
      uni.removeStorageSync(key)
    })
  }

  clearCache() {
    this.cache = { movieStatus: null, calendarEvents: null }
    movieStatusCache.value = null
    calendarCache.value = null
  }
}

// 导出单例和常量
export default new StorageManager()
export { MOVIE_STATUS }
