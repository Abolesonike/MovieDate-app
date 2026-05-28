import { STORAGE_KEYS, MOVIE_STATUS } from './constants.js'
import { validateMovieId, formatDate } from './utils.js'

/**
 * 电影状态管理模块
 * 负责电影想看/已看/待看状态的 CRUD
 */

export const movieStatusCache = { value: null }

export function getAllMovieStatus() {
  if (movieStatusCache.value) {
    return movieStatusCache.value
  }
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.MOVIE_STATUS)
    movieStatusCache.value = data ? JSON.parse(data) : {}
  } catch (e) {
    console.error('读取电影状态失败:', e)
    movieStatusCache.value = {}
  }
  return movieStatusCache.value
}

export function _saveMovieStatus(data) {
  movieStatusCache.value = data
  uni.setStorageSync(STORAGE_KEYS.MOVIE_STATUS, JSON.stringify(data))
}

export function getMovieStatus(movieId) {
  const all = getAllMovieStatus()
  return all[movieId] || { status: MOVIE_STATUS.UNWATCHED }
}

export function setMovieStatus(movieId, status, extra = {}) {
  validateMovieId(movieId)
  const all = getAllMovieStatus()
  const now = Date.now()
  const existing = all[movieId] || {}

  const timeline = existing.timeline || {}
  const dateStr = extra.date || formatDate(new Date())

  if (status === MOVIE_STATUS.WATCHED) {
    const record = {
      id: `watch_${now}_${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr,
      timestamp: now,
      ...extra
    }
    if (!Array.isArray(timeline.watched)) {
      timeline.watched = []
    }
    timeline.watched.push(record)
  } else {
    timeline[status] = {
      date: dateStr,
      timestamp: now,
      ...extra
    }
  }

  all[movieId] = { status, timeline, updatedAt: now }
  _saveMovieStatus(all)
  return all[movieId]
}

export function removeMovieStatus(movieId) {
  validateMovieId(movieId)
  const all = getAllMovieStatus()
  delete all[movieId]
  _saveMovieStatus(all)
}

export function markAsWant(movieId) {
  validateMovieId(movieId)
  return setMovieStatus(movieId, MOVIE_STATUS.WANT_TO_WATCH)
}

export function markAsWatched(movieId, data = {}) {
  validateMovieId(movieId)
  const dateStr = data.date || formatDate(new Date())

  const extra = { date: dateStr }
  if (data.rating !== undefined) extra.rating = data.rating
  if (data.review !== undefined) extra.review = data.review

  const movie = setMovieStatus(movieId, MOVIE_STATUS.WATCHED, extra)
  return { success: true, movie, message: `已标记为已看 (${dateStr})` }
}

export function getWantList() {
  const all = getAllMovieStatus()
  return Object.entries(all)
    .filter(([_, data]) => data.status === MOVIE_STATUS.WANT_TO_WATCH)
    .map(([id, data]) => ({ movieId: id, ...data }))
    .sort((a, b) => (b.timeline?.want?.timestamp || 0) - (a.timeline?.want?.timestamp || 0))
}

export function getWatchedList() {
  const all = getAllMovieStatus()
  return Object.entries(all)
    .filter(([_, data]) => data.status === MOVIE_STATUS.WATCHED)
    .map(([id, data]) => {
      const records = Array.isArray(data.timeline?.watched) ? data.timeline.watched : []
      const latest = records[records.length - 1] || {}
      return {
        movieId: id,
        status: data.status,
        updatedAt: data.updatedAt,
        timeline: {
          watched: latest
        },
        watchCount: records.length
      }
    })
    .sort((a, b) => (b.timeline?.watched?.timestamp || 0) - (a.timeline?.watched?.timestamp || 0))
}

export function getPlannedList() {
  const all = getAllMovieStatus()
  return Object.entries(all)
    .filter(([_, data]) => data.status === MOVIE_STATUS.PLANNED)
    .map(([id, data]) => ({ movieId: id, ...data }))
    .sort((a, b) => (b.timeline?.planned?.timestamp || 0) - (a.timeline?.planned?.timestamp || 0))
}

export function getMovieTimeline(movieId) {
  const statusData = getMovieStatus(movieId)
  return statusData.timeline || {}
}

export function updateWatchedReview(movieId, data) {
  validateMovieId(movieId)
  const all = getAllMovieStatus()
  const movie = all[movieId]

  if (!movie || movie.status !== MOVIE_STATUS.WATCHED) {
    return null
  }

  if (!movie.timeline) movie.timeline = {}
  if (!Array.isArray(movie.timeline.watched)) {
    movie.timeline.watched = []
  }

  const watchedArr = movie.timeline.watched
  if (watchedArr.length === 0) {
    return null
  }

  const targetIndex = data.recordId
    ? watchedArr.findIndex(r => r.id === data.recordId)
    : watchedArr.length - 1

  if (targetIndex === -1) return null

  if (data.rating !== undefined) watchedArr[targetIndex].rating = data.rating
  if (data.review !== undefined) watchedArr[targetIndex].review = data.review

  movie.updatedAt = Date.now()
  _saveMovieStatus(all)
  return movie
}

export function getMovieTimelineHistory(movieId) {
  const timeline = getMovieTimeline(movieId)
  const history = []

  const statusOrder = ['want', 'planned', 'watched']
  const statusNames = { want: '想看', planned: '计划观看', watched: '已观看' }

  statusOrder.forEach(status => {
    if (timeline[status]) {
      if (status === 'watched' && Array.isArray(timeline[status])) {
        timeline[status].forEach(record => {
          history.push({ status, statusName: statusNames[status], ...record })
        })
      } else {
        history.push({ status, statusName: statusNames[status], ...timeline[status] })
      }
    }
  })

  return history.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
}

export function getWatchedRecords(movieId) {
  const statusData = getMovieStatus(movieId)
  const watched = statusData.timeline?.watched
  return Array.isArray(watched) ? watched : []
}

export function getLatestWatchedRecord(movieId) {
  const records = getWatchedRecords(movieId)
  return records[records.length - 1] || null
}

export function removeWatchedRecord(movieId, recordId) {
  validateMovieId(movieId)
  const all = getAllMovieStatus()
  const movie = all[movieId]

  if (!movie || !Array.isArray(movie.timeline?.watched)) {
    return false
  }

  const idx = movie.timeline.watched.findIndex(r => r.id === recordId)
  if (idx === -1) return false

  movie.timeline.watched.splice(idx, 1)

  if (movie.timeline.watched.length === 0) {
    movie.status = MOVIE_STATUS.UNWATCHED
    delete movie.timeline.watched
  }

  movie.updatedAt = Date.now()
  _saveMovieStatus(all)
  return true
}
