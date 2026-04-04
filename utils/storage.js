/**
 * 本地存储工具类
 * 统一管理所有本地数据的存取、导入导出、云同步接口
 */

// 存储键名常量
const STORAGE_KEYS = {
  MOVIE_STATUS: 'movie_status',      // 电影状态数据
  CALENDAR_EVENTS: 'calendar_events', // 日历事件数据
  USER_SETTINGS: 'user_settings',    // 用户设置
  SYNC_CONFIG: 'sync_config'         // 云同步配置
}

// 电影状态枚举
export const MOVIE_STATUS = {
  UNWATCHED: 'unwatched',   // 未看（默认）
  WANT_TO_WATCH: 'want',    // 想看
  PLANNED: 'planned',       // 待看（已添加到日历）
  WATCHED: 'watched'        // 已看
}

class StorageManager {
  constructor() {
    this.cache = {
      movieStatus: null,
      calendarEvents: null
    }
  }

  // ==================== 电影状态管理 ====================

  /**
   * 获取所有电影状态
   * @returns {Object} { movieId: { status, updatedAt, ... } }
   */
  getAllMovieStatus() {
    if (this.cache.movieStatus) {
      return this.cache.movieStatus
    }
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.MOVIE_STATUS)
      this.cache.movieStatus = data ? JSON.parse(data) : {}
    } catch (e) {
      console.error('读取电影状态失败:', e)
      this.cache.movieStatus = {}
    }
    return this.cache.movieStatus
  }

  /**
   * 获取单个电影状态
   * @param {number} movieId
   * @returns {Object} { status, ... }
   */
  getMovieStatus(movieId) {
    const all = this.getAllMovieStatus()
    return all[movieId] || { status: MOVIE_STATUS.UNWATCHED }
  }

  /**
   * 设置电影状态
   * @param {number} movieId
   * @param {string} status - 'want' | 'planned' | 'watched'
   * @param {Object} extra - 额外信息 { rating, review, watchDate, title, poster, year }
   */
  setMovieStatus(movieId, status, extra = {}) {
    const all = this.getAllMovieStatus()
    all[movieId] = {
      status,
      updatedAt: Date.now(),
      ...extra
    }
    this._saveMovieStatus(all)
    return all[movieId]
  }

  /**
   * 移除电影状态（重置为未看）
   * @param {number} movieId
   */
  removeMovieStatus(movieId) {
    const all = this.getAllMovieStatus()
    delete all[movieId]
    this._saveMovieStatus(all)
  }

  /**
   * 标记为想看
   * @param {number} movieId
   * @param {Object} movieInfo - { title, poster, year }
   */
  markAsWant(movieId, movieInfo = {}) {
    return this.setMovieStatus(movieId, MOVIE_STATUS.WANT_TO_WATCH, {
      addedAt: Date.now(),
      ...movieInfo
    })
  }

  /**
   * 标记为已看
   * @param {number} movieId
   * @param {Object} movieInfo - { title, poster, year, rating, review }
   */
  markAsWatched(movieId, movieInfo = {}) {
    return this.setMovieStatus(movieId, MOVIE_STATUS.WATCHED, {
      watchedAt: Date.now(),
      ...movieInfo
    })
  }

  /**
   * 获取想看列表
   * @returns {Array} [{ movieId, status, addedAt, ... }]
   */
  getWantList() {
    const all = this.getAllMovieStatus()
    return Object.entries(all)
      .filter(([_, data]) => data.status === MOVIE_STATUS.WANT_TO_WATCH)
      .map(([id, data]) => ({ movieId: parseInt(id), ...data }))
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
  }

  /**
   * 获取已看列表
   * @returns {Array} [{ movieId, status, watchedAt, rating, ... }]
   */
  getWatchedList() {
    const all = this.getAllMovieStatus()
    return Object.entries(all)
      .filter(([_, data]) => data.status === MOVIE_STATUS.WATCHED)
      .map(([id, data]) => ({ movieId: parseInt(id), ...data }))
      .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))
  }

  /**
   * 获取待看列表（已添加到日历）
   * @returns {Array}
   */
  getPlannedList() {
    const all = this.getAllMovieStatus()
    return Object.entries(all)
      .filter(([_, data]) => data.status === MOVIE_STATUS.PLANNED)
      .map(([id, data]) => ({ movieId: parseInt(id), ...data }))
  }

  _saveMovieStatus(data) {
    this.cache.movieStatus = data
    uni.setStorageSync(STORAGE_KEYS.MOVIE_STATUS, JSON.stringify(data))
  }

  // ==================== 日历事件管理 ====================

  /**
   * 获取所有日历事件
   * @returns {Object} { 'YYYY-MM-DD': [events] }
   */
  getAllCalendarEvents() {
    if (this.cache.calendarEvents) {
      return this.cache.calendarEvents
    }
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.CALENDAR_EVENTS)
      this.cache.calendarEvents = data ? JSON.parse(data) : {}
    } catch (e) {
      console.error('读取日历事件失败:', e)
      this.cache.calendarEvents = {}
    }
    return this.cache.calendarEvents
  }

  /**
   * 获取某天的电影事件
   * @param {string} dateStr - 'YYYY-MM-DD'
   * @returns {Array} [event, ...]
   */
  getEventsByDate(dateStr) {
    const all = this.getAllCalendarEvents()
    if (all[dateStr]) {
      all[dateStr].forEach(e => {
        const statusData = this.getMovieStatus(e.movieId)
        e.status = statusData.status
      })
      return all[dateStr]
    }
    return []
  }

  /**
   * 添加电影到日历
   * @param {string} dateStr - 'YYYY-MM-DD'
   * @param {Object} movieEvent - { movieId }
   * @returns {Object} { success, event?, message? }
   */
  addCalendarEvent(dateStr, movieEvent) {
    const all = this.getAllCalendarEvents()
    if (!all[dateStr]) {
      all[dateStr] = []
    }

    // 检查是否已存在
    const exists = all[dateStr].find(e => e.movieId === movieEvent.movieId)
    if (exists) {
      return { success: false, message: '该电影已在当天安排中' }
    }

    const event = {
      id: `${dateStr}_${movieEvent.movieId}_${Date.now()}`,
      movieId: movieEvent.movieId,  // 只存储 movieId
      status: this._getDateStatus(dateStr), // 'planned' 或 'watched'
      createdAt: Date.now()
    }

    all[dateStr].push(event)
    this._saveCalendarEvents(all)

    // 同步更新电影状态
    this.setMovieStatus(movieEvent.movieId, MOVIE_STATUS.PLANNED, {
      plannedDate: dateStr
    })

    return { success: true, event }
  }

  /**
   * 移除日历事件
   * @param {string} dateStr - 'YYYY-MM-DD'
   * @param {string} eventId
   */
  removeCalendarEvent(dateStr, eventId) {
    const all = this.getAllCalendarEvents()
    if (all[dateStr]) {
      all[dateStr] = all[dateStr].filter(e => e.id !== eventId)
      if (all[dateStr].length === 0) {
        delete all[dateStr]
      }
      this._saveCalendarEvents(all)
    }
  }

  /**
   * 更新日历事件状态（如标记已看）
   * @param {string} dateStr - 'YYYY-MM-DD'
   * @param {string} eventId
   * @param {Object} updates - { status, rating, review }
   */
  updateCalendarEvent(dateStr, eventId, updates) {
    const all = this.getAllCalendarEvents()
    if (all[dateStr]) {
      const event = all[dateStr].find(e => e.id === eventId)
      if (event) {
        Object.assign(event, updates, { updatedAt: Date.now() })
        this._saveCalendarEvents(all)
      }
    }
  }

  /**
   * 获取日期范围的事件
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Array} [{ date, events }]
   */
  getEventsByDateRange(startDate, endDate) {
    const all = this.getAllCalendarEvents()
    const result = []

    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = this._formatDate(d)
      if (all[dateStr]) {
        result.push({
          date: dateStr,
          events: all[dateStr]
        })
      }
    }

    return result
  }

  /**
   * 判断日期状态
   * @param {string} dateStr - 'YYYY-MM-DD'
   * @returns {string} 'planned' | 'watched'
   */
  _getDateStatus(dateStr) {
    const today = this._formatDate(new Date())
    return dateStr < today ? MOVIE_STATUS.WATCHED : MOVIE_STATUS.PLANNED
  }

  /**
   * 格式化日期
   * @param {Date} date
   * @returns {string} 'YYYY-MM-DD'
   */
  _formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  _saveCalendarEvents(data) {
    this.cache.calendarEvents = data
    uni.setStorageSync(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(data))
  }

  // ==================== 导入导出功能 ====================

  /**
   * 导出所有数据
   * @returns {Object}
   */
  exportAllData() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        movieStatus: this.getAllMovieStatus(),
        calendarEvents: this.getAllCalendarEvents()
      }
    }
  }

  /**
   * 导出为 JSON 文件
   */
  exportToFile() {
    const data = this.exportAllData()
    const jsonStr = JSON.stringify(data, null, 2)

    // #ifdef H5
    // H5 平台使用下载
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `moviedate_backup_${this._formatDate(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
    return Promise.resolve({ success: true })
    // #endif

    // #ifndef H5
    // 小程序/App 平台
    return new Promise((resolve, reject) => {
      const fs = uni.getFileSystemManager()
      const filePath = `${wx.env.USER_DATA_PATH}/moviedate_backup_${Date.now()}.json`

      fs.writeFile({
        filePath,
        data: jsonStr,
        encoding: 'utf8',
        success: () => {
          // 尝试分享或提示用户
          uni.showModal({
            title: '导出成功',
            content: `数据已保存到: ${filePath}`,
            showCancel: false
          })
          resolve({ success: true, filePath })
        },
        fail: (err) => {
          console.error('导出失败:', err)
          reject(err)
        }
      })
    })
    // #endif
  }

  /**
   * 从 JSON 导入数据
   * @param {string|Object} inputData
   * @returns {Object} { success, imported?, error? }
   */
  importData(inputData) {
    try {
      const data = typeof inputData === 'string'
        ? JSON.parse(inputData)
        : inputData

      if (!data.version || !data.data) {
        throw new Error('无效的数据格式')
      }

      // 合并数据（以导入数据为准）
      const movieStatus = data.data.movieStatus || {}
      const calendarEvents = data.data.calendarEvents || {}

      const mergedStatus = { ...this.getAllMovieStatus(), ...movieStatus }
      const mergedEvents = { ...this.getAllCalendarEvents(), ...calendarEvents }

      this._saveMovieStatus(mergedStatus)
      this._saveCalendarEvents(mergedEvents)

      return {
        success: true,
        imported: {
          movieCount: Object.keys(movieStatus).length,
          eventDates: Object.keys(calendarEvents).length
        }
      }
    } catch (err) {
      return {
        success: false,
        error: err.message
      }
    }
  }

  /**
   * 从文件导入
   */
  importFromFile() {
    return new Promise((resolve, reject) => {
      // #ifdef H5
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (!file) {
          reject(new Error('未选择文件'))
          return
        }
        const reader = new FileReader()
        reader.onload = (event) => {
          resolve(this.importData(event.target.result))
        }
        reader.onerror = () => reject(new Error('读取文件失败'))
        reader.readAsText(file)
      }
      input.click()
      // #endif

      // #ifdef MP-WEIXON
      uni.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['json'],
        success: (res) => {
          const fs = uni.getFileSystemManager()
          fs.readFile({
            filePath: res.tempFiles[0].path,
            encoding: 'utf8',
            success: (data) => {
              resolve(this.importData(data.data))
            },
            fail: reject
          })
        },
        fail: reject
      })
      // #endif

      // #ifdef APP-PLUS
      // App 端使用文件选择
      plus.io.chooseFile({
        accept: '.json',
        success: (res) => {
          plus.io.resolveLocalFileSystemURL(res.filePath, (entry) => {
            entry.file((file) => {
              const reader = new plus.io.FileReader()
              reader.onload = (e) => {
                resolve(this.importData(e.target.result))
              }
              reader.onerror = reject
              reader.readAsText(file)
            })
          }, reject)
        },
        fail: reject
      })
      // #endif
    })
  }

  // ==================== 云存储接口（预留） ====================

  /**
   * 配置云同步
   * @param {Object} config - { provider, apiUrl, token, userId }
   */
  setCloudConfig(config) {
    uni.setStorageSync(STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(config))
  }

  /**
   * 获取云同步配置
   * @returns {Object|null}
   */
  getCloudConfig() {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.SYNC_CONFIG)
      return data ? JSON.parse(data) : null
    } catch (e) {
      return null
    }
  }

  /**
   * 清除云同步配置
   */
  clearCloudConfig() {
    uni.removeStorageSync(STORAGE_KEYS.SYNC_CONFIG)
  }

  /**
   * 同步到云端（预留接口）
   */
  async syncToCloud() {
    const config = this.getCloudConfig()
    if (!config) {
      throw new Error('请先配置云同步')
    }

    const data = this.exportAllData()

    // TODO: 实现实际的云同步逻辑
    // 示例结构：
    // return uni.request({
    //   url: `${config.apiUrl}/sync/upload`,
    //   method: 'POST',
    //   header: { 'Authorization': `Bearer ${config.token}` },
    //   data
    // })

    console.log('[CloudSync] syncToCloud called with config:', config.provider)
    return { success: true, message: '云同步接口已预留' }
  }

  /**
   * 从云端同步（预留接口）
   */
  async syncFromCloud() {
    const config = this.getCloudConfig()
    if (!config) {
      throw new Error('请先配置云同步')
    }

    // TODO: 实现实际的云同步逻辑
    // 示例结构：
    // const res = await uni.request({
    //   url: `${config.apiUrl}/sync/download`,
    //   header: { 'Authorization': `Bearer ${config.token}` }
    // })
    // return this.importData(res.data)

    console.log('[CloudSync] syncFromCloud called with config:', config.provider)
    return { success: true, message: '云同步接口已预留' }
  }

  // ==================== 统计功能 ====================

  /**
   * 获取统计数据
   * @returns {Object} { wantCount, watchedCount, plannedCount, totalEvents, thisMonthWatched }
   */
  getStatistics() {
    const status = this.getAllMovieStatus()
    const events = this.getAllCalendarEvents()

    let wantCount = 0
    let watchedCount = 0
    let plannedCount = 0

    Object.values(status).forEach(item => {
      if (item.status === MOVIE_STATUS.WANT_TO_WATCH) wantCount++
      else if (item.status === MOVIE_STATUS.WATCHED) watchedCount++
      else if (item.status === MOVIE_STATUS.PLANNED) plannedCount++
    })

    const totalEvents = Object.values(events).flat().length

    return {
      wantCount,
      watchedCount,
      plannedCount,
      totalEvents,
      thisMonthWatched: this._getThisMonthWatched(events)
    }
  }

  /**
   * 获取本月已看数量
   */
  _getThisMonthWatched(events) {
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

  // ==================== 数据清理 ====================

  /**
   * 清除所有数据
   */
  clearAllData() {
    this.cache = { movieStatus: null, calendarEvents: null }
    uni.removeStorageSync(STORAGE_KEYS.MOVIE_STATUS)
    uni.removeStorageSync(STORAGE_KEYS.CALENDAR_EVENTS)
  }

  /**
   * 清除缓存（不影响持久化数据）
   */
  clearCache() {
    this.cache = { movieStatus: null, calendarEvents: null }
  }
}

// 导出单例和常量
export default new StorageManager()
