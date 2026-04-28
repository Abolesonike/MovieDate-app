import { STORAGE_KEYS } from './constants.js'

export function getPersonalTop10() {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.PERSONAL_TOP10)
    const list = data ? JSON.parse(data) : []
    return list.sort((a, b) => a.order - b.order)
  } catch (e) {
    console.error('读取个人Top10失败:', e)
    return []
  }
}

export function addToPersonalTop10(movieId) {
  const list = getPersonalTop10()
  if (list.find(item => item.movieId === movieId)) {
    return { success: false, message: '该电影已在Top10中' }
  }
  if (list.length >= 10) {
    return { success: false, message: '个人Top10最多10部电影' }
  }
  list.push({ movieId, order: list.length, addedAt: Date.now() })
  _savePersonalTop10(list)
  return { success: true, message: '添加成功' }
}

export function removeFromPersonalTop10(movieId) {
  let list = getPersonalTop10()
  const originalLength = list.length
  list = list.filter(item => item.movieId !== movieId)
  if (list.length === originalLength) {
    return { success: false, message: '该电影不在Top10中' }
  }
  list.forEach((item, index) => { item.order = index })
  _savePersonalTop10(list)
  return { success: true, message: '移除成功' }
}

export function updatePersonalTop10Order(orderedMovieIds) {
  const list = orderedMovieIds.map((movieId, index) => ({
    movieId, order: index, addedAt: Date.now()
  }))
  _savePersonalTop10(list)
  return { success: true, message: '排序已更新' }
}

export function isInPersonalTop10(movieId) {
  const list = getPersonalTop10()
  return list.some(item => item.movieId === movieId)
}

export function _savePersonalTop10(data) {
  uni.setStorageSync(STORAGE_KEYS.PERSONAL_TOP10, JSON.stringify(data))
}
