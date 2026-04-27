/**
 * 本地存储工具类
 * 统一管理所有本地数据的存取、导入导出、云同步接口
 */

// 存储键名常量
const STORAGE_KEYS = {
  MOVIE_STATUS: 'movie_status',      // 电影状态数据
  CALENDAR_EVENTS: 'calendar_events', // 日历事件数据
  USER_SETTINGS: 'user_settings',    // 用户设置
  SYNC_CONFIG: 'sync_config',        // 云同步配置
  PERSONAL_TOP10: 'personal_top10',  // 个人Top10
  FAVORITE_GRID: 'favorite_grid',    // 个人喜好海报墙
  PLAYLISTS: 'movie_playlists',      // 片单数据
  THEME: 'app_theme',                // 主题色
  DARK_MODE: 'app_dark_mode'         // 深色模式
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

  _validateMovieId(movieId) {
    if (!movieId || Number.isNaN(Number(movieId))) {
      throw new Error(`无效的电影ID: ${movieId}`)
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
   * @param {Object} extra - 额外信息 { rating, review, date, calendarEventId }
   */
  setMovieStatus(movieId, status, extra = {}) {
    this._validateMovieId(movieId)
    const all = this.getAllMovieStatus()
    const now = Date.now()
    const existing = all[movieId] || {}

    // 构建时间线数据
    const timeline = existing.timeline || {}
    const dateStr = extra.date || this._formatDate(new Date())

    // 记录当前状态的时间点（保留历史）
    timeline[status] = {
      date: dateStr,
      timestamp: now,
      ...extra
    }

    all[movieId] = {
      status,
      timeline,
      updatedAt: now
    }

    this._saveMovieStatus(all)
    return all[movieId]
  }

  /**
   * 移除电影状态（重置为未看）
   * 同时清理关联的日历事件
   * @param {number} movieId
   */
  removeMovieStatus(movieId) {
    this._validateMovieId(movieId)
    const all = this.getAllMovieStatus()
    const movieData = all[movieId]

    // 清理关联的日历事件
    if (movieData?.timeline) {
      // 清理 planned 时间线关联的日历事件
      if (movieData.timeline.planned?.calendarEventId) {
        const plannedDate = movieData.timeline.planned.date
        const eventId = movieData.timeline.planned.calendarEventId
        this.removeCalendarEvent(plannedDate, eventId)
      }
      // 清理 watched 时间线关联的日历事件
      if (movieData.timeline.watched?.calendarEventId) {
        const watchedDate = movieData.timeline.watched.date
        const eventId = movieData.timeline.watched.calendarEventId
        this.removeCalendarEvent(watchedDate, eventId)
      }
    }

    delete all[movieId]
    this._saveMovieStatus(all)
  }

  /**
   * 标记为想看
   * @param {number} movieId
   */
  markAsWant(movieId) {
    this._validateMovieId(movieId)
    return this.setMovieStatus(movieId, MOVIE_STATUS.WANT_TO_WATCH)
  }

  /**
   * 标记为已看
   * @param {number} movieId
   * @param {Object} data - { rating, review, date }
   * @returns {Object} { success, movie?, event?, message? }
   */
  markAsWatched(movieId, data = {}) {
    this._validateMovieId(movieId)
    const dateStr = data.date || this._formatDate(new Date())

    // 先添加到日历（如果该日期已有此电影，addCalendarEvent 会返回失败，但不影响标记已看）
    let calendarEvent = null
    const existingEvents = this.getEventsByDate(dateStr)
    const exists = existingEvents.find(e => e.movieId === movieId)

    if (!exists) {
      const result = this.addCalendarEvent(dateStr, { movieId })
      if (result.success) {
        calendarEvent = result.event
      }
    } else {
      calendarEvent = exists
    }

    // 更新日历事件状态为 watched
    if (calendarEvent) {
      this.updateCalendarEvent(dateStr, calendarEvent.id, { status: MOVIE_STATUS.WATCHED })
    }

    // 构建时间线数据
    const extra = { date: dateStr }
    if (data.rating !== undefined) extra.rating = data.rating
    if (data.review !== undefined) extra.review = data.review
    if (calendarEvent) extra.calendarEventId = calendarEvent.id

    const movie = this.setMovieStatus(movieId, MOVIE_STATUS.WATCHED, extra)

    return {
      success: true,
      movie,
      event: calendarEvent,
      message: `已标记为已看并添加到 ${dateStr}`
    }
  }

  /**
   * 获取想看列表
   * @returns {Array} [{ movieId, status, timeline, ... }]
   */
  getWantList() {
    const all = this.getAllMovieStatus()
    return Object.entries(all)
      .filter(([_, data]) => data.status === MOVIE_STATUS.WANT_TO_WATCH)
      .map(([id, data]) => ({ movieId: parseInt(id), ...data }))
      .sort((a, b) => (b.timeline?.want?.timestamp || 0) - (a.timeline?.want?.timestamp || 0))
  }

  /**
   * 获取已看列表
   * @returns {Array} [{ movieId, status, timeline, ... }]
   */
  getWatchedList() {
    const all = this.getAllMovieStatus()
    return Object.entries(all)
      .filter(([_, data]) => data.status === MOVIE_STATUS.WATCHED)
      .map(([id, data]) => ({ movieId: parseInt(id), ...data }))
      .sort((a, b) => (b.timeline?.watched?.timestamp || 0) - (a.timeline?.watched?.timestamp || 0))
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
      .sort((a, b) => (b.timeline?.planned?.timestamp || 0) - (a.timeline?.planned?.timestamp || 0))
  }

  /**
   * 获取电影完整时间线
   * @param {number} movieId
   * @returns {Object} { want, planned, watched } 按时间顺序排列
   */
  getMovieTimeline(movieId) {
    const statusData = this.getMovieStatus(movieId)
    return statusData.timeline || {}
  }

  /**
   * 更新已看电影的评分和评价
   * @param {number} movieId
   * @param {Object} data - { rating, review }
   */
  updateWatchedReview(movieId, data) {
    this._validateMovieId(movieId)
    const all = this.getAllMovieStatus()
    const movie = all[movieId]

    if (!movie || movie.status !== MOVIE_STATUS.WATCHED) {
      return null
    }

    // 更新 watched 时间线中的评分和评价
    if (!movie.timeline) movie.timeline = {}
    if (!movie.timeline.watched) movie.timeline.watched = {}

    if (data.rating !== undefined) {
      movie.timeline.watched.rating = data.rating
    }
    if (data.review !== undefined) {
      movie.timeline.watched.review = data.review
    }

    movie.updatedAt = Date.now()
    this._saveMovieStatus(all)
    return movie
  }

  /**
   * 获取电影时间线历史（格式化）
   * @param {number} movieId
   * @returns {Array} [{ status, date, timestamp, ... }]
   */
  getMovieTimelineHistory(movieId) {
    const timeline = this.getMovieTimeline(movieId)
    const history = []

    const statusOrder = ['want', 'planned', 'watched']
    const statusNames = {
      want: '想看',
      planned: '计划观看',
      watched: '已观看'
    }

    statusOrder.forEach(status => {
      if (timeline[status]) {
        history.push({
          status,
          statusName: statusNames[status],
          ...timeline[status]
        })
      }
    })

    return history.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
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

    // 同步更新电影状态和planned时间线
    this.setMovieStatus(movieEvent.movieId, MOVIE_STATUS.PLANNED, {
      date: dateStr,
      calendarEventId: event.id
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
        calendarEvents: this.getAllCalendarEvents(),
        personalTop10: this.getPersonalTop10()
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
      const personalTop10 = data.data.personalTop10 || []

      const mergedStatus = { ...this.getAllMovieStatus(), ...movieStatus }
      const mergedEvents = { ...this.getAllCalendarEvents(), ...calendarEvents }

      this._saveMovieStatus(mergedStatus)
      this._saveCalendarEvents(mergedEvents)
      this._savePersonalTop10(personalTop10)

      return {
        success: true,
        imported: {
          movieCount: Object.keys(movieStatus).length,
          eventDates: Object.keys(calendarEvents).length,
          top10Count: personalTop10.length
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

  // ==================== 个人Top10管理 ====================

  /**
   * 获取个人Top10列表
   * @returns {Array} [{ movieId, order, addedAt }]
   */
  getPersonalTop10() {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.PERSONAL_TOP10)
      const list = data ? JSON.parse(data) : []
      return list.sort((a, b) => a.order - b.order)
    } catch (e) {
      console.error('读取个人Top10失败:', e)
      return []
    }
  }

  /**
   * 添加电影到个人Top10
   * @param {number} movieId
   * @returns {Object} { success, message }
   */
  addToPersonalTop10(movieId) {
    const list = this.getPersonalTop10()
    if (list.find(item => item.movieId === movieId)) {
      return { success: false, message: '该电影已在Top10中' }
    }
    if (list.length >= 10) {
      return { success: false, message: '个人Top10最多10部电影' }
    }
    list.push({
      movieId,
      order: list.length,
      addedAt: Date.now()
    })
    this._savePersonalTop10(list)
    return { success: true, message: '添加成功' }
  }

  /**
   * 从个人Top10中移除
   * @param {number} movieId
   * @returns {Object} { success, message }
   */
  removeFromPersonalTop10(movieId) {
    let list = this.getPersonalTop10()
    const originalLength = list.length
    list = list.filter(item => item.movieId !== movieId)
    if (list.length === originalLength) {
      return { success: false, message: '该电影不在Top10中' }
    }
    // 重新排序
    list.forEach((item, index) => {
      item.order = index
    })
    this._savePersonalTop10(list)
    return { success: true, message: '移除成功' }
  }

  /**
   * 更新个人Top10顺序
   * @param {Array} orderedMovieIds - [movieId, movieId, ...]
   * @returns {Object} { success, message }
   */
  updatePersonalTop10Order(orderedMovieIds) {
    const list = orderedMovieIds.map((movieId, index) => ({
      movieId,
      order: index,
      addedAt: Date.now()
    }))
    this._savePersonalTop10(list)
    return { success: true, message: '排序已更新' }
  }

  /**
   * 判断电影是否在个人Top10中
   * @param {number} movieId
   * @returns {boolean}
   */
  isInPersonalTop10(movieId) {
    const list = this.getPersonalTop10()
    return list.some(item => item.movieId === movieId)
  }

  _savePersonalTop10(data) {
    uni.setStorageSync(STORAGE_KEYS.PERSONAL_TOP10, JSON.stringify(data))
  }

  // ==================== 个人喜好海报墙管理 ====================

  /**
   * 获取个人喜好海报墙数据
   * @returns {Object} { version, title, items }
   */
  getFavoriteGrid() {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.FAVORITE_GRID)
      if (data) {
        const parsed = JSON.parse(data)
        return {
          version: parsed.version || 1,
          title: parsed.title || this._getDefaultFavoriteGridTitle(),
          items: Array.isArray(parsed.items) ? parsed.items : []
        }
      }
    } catch (e) {
      console.error('读取个人喜好海报墙失败:', e)
    }
    return {
      version: 1,
      title: this._getDefaultFavoriteGridTitle(),
      items: []
    }
  }

  _getDefaultFavoriteGridTitle() {
    return `${new Date().getFullYear()}年电影个人喜好表`
  }

  /**
   * 保存个人喜好海报墙数据
   * @param {Object} data
   */
  saveFavoriteGrid(data) {
    uni.setStorageSync(STORAGE_KEYS.FAVORITE_GRID, JSON.stringify(data))
  }

  /**
   * 添加或更新海报墙项
   * @param {number} index - 网格位置 0-29
   * @param {string} type - 'movie' | 'person'
   * @param {number} id - movieId 或 personId
   * @param {string} label - 标签文字
   * @param {Object} meta - 元数据 { title, poster, year, department }
   * @returns {Object} { success, message }
   */
  addFavoriteGridItem(index, type, id, label, meta = {}) {
    const grid = this.getFavoriteGrid()
    const existingIndex = grid.items.findIndex(item => item.index === index)

    const item = {
      index,
      type,
      id,
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

    this.saveFavoriteGrid(grid)
    return { success: true, message: '添加成功' }
  }

  /**
   * 移除海报墙项
   * @param {number} index - 网格位置
   * @returns {Object} { success, message }
   */
  removeFavoriteGridItem(index) {
    const grid = this.getFavoriteGrid()
    const originalLength = grid.items.length
    grid.items = grid.items.filter(item => item.index !== index)
    if (grid.items.length === originalLength) {
      return { success: false, message: '该项不存在' }
    }
    this.saveFavoriteGrid(grid)
    return { success: true, message: '移除成功' }
  }

  /**
   * 更新海报墙标题
   * @param {string} title
   */
  updateFavoriteGridTitle(title) {
    const grid = this.getFavoriteGrid()
    grid.title = title || this._getDefaultFavoriteGridTitle()
    this.saveFavoriteGrid(grid)
  }

  /**
   * 更新海报墙项标签
   * @param {number} index
   * @param {string} label
   */
  updateFavoriteGridLabel(index, label) {
    const grid = this.getFavoriteGrid()
    const item = grid.items.find(i => i.index === index)
    if (item) {
      item.label = label
      this.saveFavoriteGrid(grid)
    }
  }

  /**
   * 导出喜好海报墙模板
   * @returns {Object}
   */
  exportFavoriteGridTemplate() {
    const grid = this.getFavoriteGrid()
    return {
      version: 1,
      type: 'favorite-grid-template',
      exportedAt: new Date().toISOString(),
      title: grid.title,
      items: grid.items.map(item => ({
        index: item.index,
        type: item.type,
        id: item.id,
        label: item.label,
        title: item.title,
        poster: item.poster,
        year: item.year,
        department: item.department
      }))
    }
  }

  /**
   * 导入喜好海报墙模板
   * @param {string|Object} input
   * @returns {Object} { success, imported?, error? }
   */
  importFavoriteGridTemplate(input) {
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
        title: data.title || this._getDefaultFavoriteGridTitle(),
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

      this.saveFavoriteGrid(grid)
      return { success: true, imported: { count: grid.items.length } }
    } catch (err) {
      return { success: false, error: err.message }
    }
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

  // ==================== 主题设置 ====================

  /**
   * 获取主题色
   * @returns {string}
   */
  getTheme() {
    try {
      return uni.getStorageSync(STORAGE_KEYS.THEME)
    } catch (e) {
      return null
    }
  }

  /**
   * 设置主题色
   * @param {string} themeKey
   */
  setTheme(themeKey) {
    uni.setStorageSync(STORAGE_KEYS.THEME, themeKey)
  }

  /**
   * 获取深色模式
   * @returns {boolean}
   */
  getDarkMode() {
    try {
      const value = uni.getStorageSync(STORAGE_KEYS.DARK_MODE)
      return value === true || value === 'true'
    } catch (e) {
      return false
    }
  }

  /**
   * 设置深色模式
   * @param {boolean} isDark
   */
  setDarkMode(isDark) {
    uni.setStorageSync(STORAGE_KEYS.DARK_MODE, isDark)
  }

  /**
   * 清除所有数据
   */
  clearAllData() {
    this.cache = { movieStatus: null, calendarEvents: null }
    uni.removeStorageSync(STORAGE_KEYS.MOVIE_STATUS)
    uni.removeStorageSync(STORAGE_KEYS.CALENDAR_EVENTS)
    uni.removeStorageSync(STORAGE_KEYS.FAVORITE_GRID)
    uni.removeStorageSync(STORAGE_KEYS.PERSONAL_TOP10)
    uni.removeStorageSync(STORAGE_KEYS.USER_SETTINGS)
    uni.removeStorageSync(STORAGE_KEYS.THEME)
    uni.removeStorageSync(STORAGE_KEYS.DARK_MODE)
  }

  /**
   * 清除缓存（不影响持久化数据）
   */
  clearCache() {
    this.cache = { movieStatus: null, calendarEvents: null }
  }

  // ==================== 片单管理 ====================

  /**
   * 生成 UUID
   */
  _generateId() {
    return 'playlist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 获取所有片单
   * @returns {Array} 片单数组
   */
  getAllPlaylists() {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.PLAYLISTS)
      const list = data ? JSON.parse(data) : []
      return list.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0))
    } catch (e) {
      console.error('读取片单失败:', e)
      return []
    }
  }

  /**
   * 获取单个片单
   * @param {string} playlistId
   * @returns {Object|null}
   */
  getPlaylist(playlistId) {
    const list = this.getAllPlaylists()
    return list.find(p => p.id === playlistId) || null
  }

  /**
   * 创建片单
   * @param {Object} data - { name, description, tags }
   * @returns {Object} { success, playlist?, message? }
   */
  createPlaylist(data = {}) {
    if (!data.name || !data.name.trim()) {
      return { success: false, message: '片单名称不能为空' }
    }

    const list = this.getAllPlaylists()
    const now = Date.now()

    const playlist = {
      id: this._generateId(),
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
    this._savePlaylists(list)

    return { success: true, playlist }
  }

  /**
   * 更新片单
   * @param {string} playlistId
   * @param {Object} updates - { name, description, tags, coverImage }
   * @returns {Object}
   */
  updatePlaylist(playlistId, updates = {}) {
    const list = this.getAllPlaylists()
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
    this._savePlaylists(list)

    return { success: true, playlist }
  }

  /**
   * 删除片单
   * @param {string} playlistId
   * @returns {Object}
   */
  deletePlaylist(playlistId) {
    const list = this.getAllPlaylists()
    const index = list.findIndex(p => p.id === playlistId)

    if (index < 0) {
      return { success: false, message: '片单不存在' }
    }

    list.splice(index, 1)
    this._savePlaylists(list)

    return { success: true, message: '删除成功' }
  }

  /**
   * 向片单添加电影
   * @param {string} playlistId
   * @param {Array<number>} movieIds
   * @returns {Object}
   */
  addMoviesToPlaylist(playlistId, movieIds) {
    if (!Array.isArray(movieIds) || movieIds.length === 0) {
      return { success: false, message: '请选择要添加的电影' }
    }

    const list = this.getAllPlaylists()
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
    this._savePlaylists(list)

    return { success: true, addedCount, message: `已添加 ${addedCount} 部电影` }
  }

  /**
   * 从片单移除电影
   * @param {string} playlistId
   * @param {number} movieId
   * @returns {Object}
   */
  removeMovieFromPlaylist(playlistId, movieId) {
    const list = this.getAllPlaylists()
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
    this._savePlaylists(list)

    return { success: true, message: '已移除电影' }
  }

  /**
   * 获取片单的完成进度
   * @param {string} playlistId
   * @returns {Object} { total, watched, progress, want, planned }
   */
  getPlaylistProgress(playlistId) {
    const playlist = this.getPlaylist(playlistId)

    if (!playlist) {
      return { total: 0, watched: 0, progress: 0, want: 0, planned: 0 }
    }

    const total = playlist.movieIds.length
    let watched = 0
    let want = 0
    let planned = 0

    playlist.movieIds.forEach(movieId => {
      const statusData = this.getMovieStatus(movieId)
      if (statusData.status === MOVIE_STATUS.WATCHED) watched++
      else if (statusData.status === MOVIE_STATUS.WANT_TO_WATCH) want++
      else if (statusData.status === MOVIE_STATUS.PLANNED) planned++
    })

    return {
      total,
      watched,
      want,
      planned,
      progress: total > 0 ? Math.round(watched / total * 100) : 0
    }
  }

  /**
   * 复制片单
   * @param {string} playlistId
   * @returns {Object}
   */
  duplicatePlaylist(playlistId) {
    const playlist = this.getPlaylist(playlistId)
    if (!playlist) {
      return { success: false, message: '片单不存在' }
    }

    const newPlaylist = {
      id: this._generateId(),
      name: playlist.name + ' (副本)',
      description: playlist.description,
      tags: [...playlist.tags],
      coverImage: playlist.coverImage,
      movieIds: [...playlist.movieIds],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sortOrder: Date.now()
    }

    const list = this.getAllPlaylists()
    list.push(newPlaylist)
    this._savePlaylists(list)

    return { success: true, playlist: newPlaylist }
  }

  _savePlaylists(data) {
    uni.setStorageSync(STORAGE_KEYS.PLAYLISTS, JSON.stringify(data))
  }
}

// 导出单例和常量
export default new StorageManager()
