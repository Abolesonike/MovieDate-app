import { MOVIE_STATUS } from '@/utils/storage.js'

export const statusMap = {
  [MOVIE_STATUS.UNWATCHED]: { type: 'default', text: '未看' },
  [MOVIE_STATUS.WANT_TO_WATCH]: { type: 'warning', text: '想看' },
  [MOVIE_STATUS.PLANNED]: { type: 'primary', text: '待看' },
  [MOVIE_STATUS.WATCHED]: { type: 'success', text: '已看' }
}

export function getStatusType(status) {
  return statusMap[status]?.type || 'default'
}

export function getStatusText(status) {
  return statusMap[status]?.text || '未看'
}

export function getRankingClass(index) {
  if (index === 1) return 'gold'
  if (index === 2) return 'silver'
  if (index === 3) return 'bronze'
  return ''
}

export function getStatusDotClass(status) {
  if (status === MOVIE_STATUS.WATCHED) return 'watched-dot'
  if (status === MOVIE_STATUS.PLANNED) return 'planned-dot'
  return ''
}

export const sharedProps = {
  movie: {
    type: Object,
    required: true
  },
  showStatus: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: true
  },
  showGenre: {
    type: Boolean,
    default: true
  },
  showYear: {
    type: Boolean,
    default: true
  },
  showSummary: {
    type: Boolean,
    default: true
  },
  ranking: {
    type: Number,
    default: null
  }
}
