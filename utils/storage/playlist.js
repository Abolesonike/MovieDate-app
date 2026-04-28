import { STORAGE_KEYS, MOVIE_STATUS } from './constants.js'
import { generateId } from './utils.js'
import { getAllMovieStatus } from './movieStatus.js'

/**
 * 片单管理模块
 */

export function getAllPlaylists() {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.PLAYLISTS)
    const list = data ? JSON.parse(data) : []
    return list.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0))
  } catch (e) {
    console.error('读取片单失败:', e)
    return []
  }
}

export function getPlaylist(playlistId) {
  const list = getAllPlaylists()
  return list.find(p => p.id === playlistId) || null
}

export function createPlaylist(data = {}) {
  if (!data.name || !data.name.trim()) {
    return { success: false, message: '片单名称不能为空' }
  }

  const list = getAllPlaylists()
  const now = Date.now()

  const playlist = {
    id: generateId(),
    name: data.name.trim(),
    description: data.description ? data.description.trim() : '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    coverImage: '',
    movieIds: [],
    createdAt: now,
    updatedAt: now,
    sortOrder: now
  }

  list.push(playlist)
  _savePlaylists(list)

  return { success: true, playlist }
}

export function updatePlaylist(playlistId, updates = {}) {
  const list = getAllPlaylists()
  const index = list.findIndex(p => p.id === playlistId)

  if (index < 0) {
    return { success: false, message: '片单不存在' }
  }

  const playlist = list[index]

  if (updates.name !== undefined) {
    if (!updates.name.trim()) {
      return { success: false, message: '片单名称不能为空' }
    }
    playlist.name = updates.name.trim()
  }
  if (updates.description !== undefined) {
    playlist.description = updates.description ? updates.description.trim() : ''
  }
  if (updates.tags !== undefined) {
    playlist.tags = Array.isArray(updates.tags) ? updates.tags : []
  }
  if (updates.coverImage !== undefined) {
    playlist.coverImage = updates.coverImage
  }

  playlist.updatedAt = Date.now()
  _savePlaylists(list)

  return { success: true, playlist }
}

export function deletePlaylist(playlistId) {
  const list = getAllPlaylists()
  const index = list.findIndex(p => p.id === playlistId)

  if (index < 0) {
    return { success: false, message: '片单不存在' }
  }

  list.splice(index, 1)
  _savePlaylists(list)

  return { success: true, message: '删除成功' }
}

export function addMoviesToPlaylist(playlistId, movieIds) {
  if (!Array.isArray(movieIds) || movieIds.length === 0) {
    return { success: false, message: '请选择要添加的电影' }
  }

  const list = getAllPlaylists()
  const index = list.findIndex(p => p.id === playlistId)

  if (index < 0) {
    return { success: false, message: '片单不存在' }
  }

  const playlist = list[index]
  const existingIds = new Set(playlist.movieIds)
  let addedCount = 0

  movieIds.forEach(movieId => {
    if (!existingIds.has(movieId)) {
      playlist.movieIds.push(movieId)
      addedCount++
    }
  })

  if (addedCount === 0) {
    return { success: false, message: '所选电影已在片单中' }
  }

  playlist.updatedAt = Date.now()
  _savePlaylists(list)

  return { success: true, addedCount, message: `已添加 ${addedCount} 部电影` }
}

export function removeMovieFromPlaylist(playlistId, movieId) {
  const list = getAllPlaylists()
  const index = list.findIndex(p => p.id === playlistId)

  if (index < 0) {
    return { success: false, message: '片单不存在' }
  }

  const playlist = list[index]
  const originalLength = playlist.movieIds.length
  playlist.movieIds = playlist.movieIds.filter(id => id !== movieId)

  if (playlist.movieIds.length === originalLength) {
    return { success: false, message: '该电影不在片单中' }
  }

  playlist.updatedAt = Date.now()
  _savePlaylists(list)

  return { success: true, message: '已移除电影' }
}

/**
 * 获取片单完成进度
 * 优化：批量读取所有电影状态，避免 O(n²)
 */
export function getPlaylistProgress(playlistId) {
  const playlist = getPlaylist(playlistId)

  if (!playlist) {
    return { total: 0, watched: 0, progress: 0, want: 0, planned: 0 }
  }

  const total = playlist.movieIds.length
  if (total === 0) {
    return { total: 0, watched: 0, progress: 0, want: 0, planned: 0 }
  }

  // 批量读取所有状态（关键优化：避免 O(n²)）
  const allStatus = getAllMovieStatus()
  let watched = 0
  let want = 0
  let planned = 0

  playlist.movieIds.forEach(movieId => {
    const status = allStatus[movieId]?.status
    if (status === MOVIE_STATUS.WATCHED) watched++
    else if (status === MOVIE_STATUS.WANT_TO_WATCH) want++
    else if (status === MOVIE_STATUS.PLANNED) planned++
  })

  return {
    total,
    watched,
    want,
    planned,
    progress: Math.round((watched / total) * 100)
  }
}

export function duplicatePlaylist(playlistId) {
  const playlist = getPlaylist(playlistId)
  if (!playlist) {
    return { success: false, message: '片单不存在' }
  }

  const newPlaylist = {
    id: generateId(),
    name: playlist.name + ' (副本)',
    description: playlist.description,
    tags: [...playlist.tags],
    coverImage: playlist.coverImage,
    movieIds: [...playlist.movieIds],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sortOrder: Date.now()
  }

  const list = getAllPlaylists()
  list.push(newPlaylist)
  _savePlaylists(list)

  return { success: true, playlist: newPlaylist }
}

export function _savePlaylists(data) {
  uni.setStorageSync(STORAGE_KEYS.PLAYLISTS, JSON.stringify(data))
}
