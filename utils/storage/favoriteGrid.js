import { STORAGE_KEYS } from './constants.js'

function getDefaultTitle() {
  return `${new Date().getFullYear()}年电影个人喜好表`
}

export function getFavoriteGrid() {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.FAVORITE_GRID)
    if (data) {
      const parsed = JSON.parse(data)
      return {
        version: parsed.version || 1,
        title: parsed.title || getDefaultTitle(),
        items: Array.isArray(parsed.items) ? parsed.items : []
      }
    }
  } catch (e) {
    console.error('读取个人喜好海报墙失败:', e)
  }
  return { version: 1, title: getDefaultTitle(), items: [] }
}

export function saveFavoriteGrid(data) {
  uni.setStorageSync(STORAGE_KEYS.FAVORITE_GRID, JSON.stringify(data))
}

export function addFavoriteGridItem(index, type, id, label, meta = {}) {
  const grid = getFavoriteGrid()
  const existingIndex = grid.items.findIndex(item => item.index === index)

  const item = {
    index, type, id,
    label: label || '',
    title: meta.title || '',
    poster: meta.poster || '',
    year: meta.year || '',
    department: meta.department || ''
  }

  if (existingIndex >= 0) {
    grid.items[existingIndex] = item
  } else {
    if (grid.items.length >= 30) {
      return { success: false, message: '最多只能添加30项' }
    }
    grid.items.push(item)
  }

  saveFavoriteGrid(grid)
  return { success: true, message: '添加成功' }
}

export function removeFavoriteGridItem(index) {
  const grid = getFavoriteGrid()
  const originalLength = grid.items.length
  grid.items = grid.items.filter(item => item.index !== index)
  if (grid.items.length === originalLength) {
    return { success: false, message: '该项不存在' }
  }
  saveFavoriteGrid(grid)
  return { success: true, message: '移除成功' }
}

export function updateFavoriteGridTitle(title) {
  const grid = getFavoriteGrid()
  grid.title = title || getDefaultTitle()
  saveFavoriteGrid(grid)
}

export function updateFavoriteGridLabel(index, label) {
  const grid = getFavoriteGrid()
  const item = grid.items.find(i => i.index === index)
  if (item) {
    item.label = label
    saveFavoriteGrid(grid)
  }
}

export function exportFavoriteGridTemplate() {
  const grid = getFavoriteGrid()
  return {
    version: 1,
    type: 'favorite-grid-template',
    exportedAt: new Date().toISOString(),
    title: grid.title,
    items: grid.items.map(item => ({
      index: item.index, type: item.type, id: item.id,
      label: item.label, title: item.title, poster: item.poster,
      year: item.year, department: item.department
    }))
  }
}

export function importFavoriteGridTemplate(input) {
  try {
    const data = typeof input === 'string' ? JSON.parse(input) : input
    if (!data.type || data.type !== 'favorite-grid-template') {
      throw new Error('无效的模板格式')
    }
    if (!Array.isArray(data.items)) {
      throw new Error('模板数据不完整')
    }

    const grid = {
      version: 1,
      title: data.title || getDefaultTitle(),
      items: data.items
        .filter(item => item.index >= 0 && item.index < 30)
        .map(item => ({
          index: item.index,
          type: item.type === 'person' ? 'person' : 'movie',
          id: item.id,
          label: item.label || '',
          title: item.title || '',
          poster: item.poster || '',
          year: item.year || '',
          department: item.department || ''
        }))
    }

    saveFavoriteGrid(grid)
    return { success: true, imported: { count: grid.items.length } }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
