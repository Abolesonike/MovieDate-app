import { STORAGE_KEYS, MOVIE_STATUS } from './constants.js'
import { formatDate } from './utils.js'
import { getAllMovieStatus } from './movieStatus.js'

/**
 * 日历事件管理模块
 */

export const calendarCache = { value: null }

export function getAllCalendarEvents() {
  if (calendarCache.value) {
    return calendarCache.value
  }
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.CALENDAR_EVENTS)
    calendarCache.value = data ? JSON.parse(data) : {}
  } catch (e) {
    console.error('读取日历事件失败:', e)
    calendarCache.value = {}
  }
  return calendarCache.value
}

export function _saveCalendarEvents(data) {
  calendarCache.value = data
  uni.setStorageSync(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(data))
}

export function getEventsByDate(dateStr) {
  const all = getAllCalendarEvents()
  if (all[dateStr]) {
    all[dateStr].forEach(e => {
      const statusData = getAllMovieStatus()[e.movieId]
      e.status = statusData?.status || MOVIE_STATUS.PLANNED
    })
    return all[dateStr]
  }
  return []
}

export function addCalendarEvent(dateStr, movieEvent) {
  const all = getAllCalendarEvents()
  if (!all[dateStr]) {
    all[dateStr] = []
  }

  const exists = all[dateStr].find(e => e.movieId === movieEvent.movieId)
  if (exists) {
    return { success: false, message: '该电影已在当天安排中' }
  }

  const event = {
    id: `${dateStr}_${movieEvent.movieId}_${Date.now()}`,
    movieId: movieEvent.movieId,
    status: _getDateStatus(dateStr),
    createdAt: Date.now()
  }

  all[dateStr].push(event)
  _saveCalendarEvents(all)

  return { success: true, event }
}

export function removeCalendarEvent(dateStr, eventId) {
  const all = getAllCalendarEvents()
  if (all[dateStr]) {
    all[dateStr] = all[dateStr].filter(e => e.id !== eventId)
    if (all[dateStr].length === 0) {
      delete all[dateStr]
    }
    _saveCalendarEvents(all)
  }
}

export function updateCalendarEvent(dateStr, eventId, updates) {
  const all = getAllCalendarEvents()
  if (all[dateStr]) {
    const event = all[dateStr].find(e => e.id === eventId)
    if (event) {
      Object.assign(event, updates, { updatedAt: Date.now() })
      _saveCalendarEvents(all)
    }
  }
}

export function getEventsByDateRange(startDate, endDate) {
  const all = getAllCalendarEvents()
  const result = []

  const start = new Date(startDate)
  const end = new Date(endDate)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d)
    if (all[dateStr]) {
      result.push({ date: dateStr, events: all[dateStr] })
    }
  }

  return result
}

export function _getDateStatus(dateStr) {
  const today = formatDate(new Date())
  return dateStr < today ? MOVIE_STATUS.WATCHED : MOVIE_STATUS.PLANNED
}
