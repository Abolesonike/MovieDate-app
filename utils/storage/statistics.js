import { MOVIE_STATUS } from './constants.js'
import { formatDate } from './utils.js'
import { getAllMovieStatus } from './movieStatus.js'
import { getAllCalendarEvents } from './calendar.js'

export function getStatistics() {
  const status = getAllMovieStatus()
  const events = getAllCalendarEvents()

  let wantCount = 0
  let watchedCount = 0
  let plannedCount = 0
  let totalWatchedCount = 0

  Object.values(status).forEach(item => {
    if (item.status === MOVIE_STATUS.WANT_TO_WATCH) wantCount++
    else if (item.status === MOVIE_STATUS.WATCHED) {
      watchedCount++
      const records = Array.isArray(item.timeline?.watched) ? item.timeline.watched : []
      totalWatchedCount += records.length
    }
    else if (item.status === MOVIE_STATUS.PLANNED) plannedCount++
  })

  const totalEvents = Object.values(events).flat().length

  return {
    wantCount,
    watchedCount,
    plannedCount,
    totalEvents,
    totalWatchedCount,
    thisMonthWatched: getThisMonthWatched(events)
  }
}

export function getThisMonthWatched(events) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  let count = 0
  Object.entries(events).forEach(([dateStr, dayEvents]) => {
    const [y, m] = dateStr.split('-').map(Number)
    if (y === year && m === month) {
      count += dayEvents.filter(e => e.status === MOVIE_STATUS.WATCHED).length
    }
  })
  return count
}
