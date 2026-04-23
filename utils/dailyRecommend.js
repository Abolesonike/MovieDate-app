/**
 * 每日推荐服务
 * 提供每日电影推荐功能，支持 CDN 版本检查和本地缓存
 */

import tmdbApi from './tmdb.js'
import storage from './storage.js'

// 推荐类型枚举
export const RECOMMEND_TYPES = {
  FILM_ANNIVERSARY: 'film_anniversary',     // 电影上映周年
  PERSON_BIRTHDAY: 'person_birthday',       // 影人生日
  AWARD_ANNIVERSARY: 'award_anniversary',   // 获奖纪念日
  HOLIDAY_THEME: 'holiday_theme',           // 节日主题
  TRENDING: 'trending',                     // 热门推荐
  GENRE_THEME: 'genre_theme',               // 类型主题日
  CRITICS_CHOICE: 'critics_choice',         // 评论家精选
  HIDDEN_GEM: 'hidden_gem'                   // 冷门佳片
}

// 节日主题映射
const HOLIDAY_THEMES = {
  '01-01': { theme: '新年', genre: '励志', message: '新的一年，从一部励志电影开始' },
  '01-06': { theme: '新年', genre: '剧情', message: '新的一年，从一部好电影开始' },
  '02-14': { theme: '情人节', genre: '爱情', message: '浪漫爱情电影推荐' },
  '03-14': { theme: '白色情人节', genre: '爱情', message: '继续浪漫' },
  '04-01': { theme: '愚人节', genre: '喜剧', message: '欢乐的一天' },
  '06-01': { theme: '儿童节', genre: '动画', message: '童心未泯' },
  '07-04': { theme: '美国独立日', genre: '战争', message: '自由主题电影' },
  '10-31': { theme: '万圣节', genre: '恐怖', message: '惊悚恐怖电影推荐' },
  '11-11': { theme: '光棍节', genre: '爱情', message: '单身观影指南' },
  '12-24': { theme: '平安夜', genre: '温馨', message: '温暖人心的故事' },
  '12-25': { theme: '圣诞节', genre: '温馨', message: '温馨节日电影推荐' },
  '12-31': { theme: '跨年夜', genre: '喜剧', message: '辞旧迎新' }
}

// CDN 配置 - 可替换为实际托管地址
const CDN_CONFIG = {
  VERSION_CHECK_URL: '',  // 例如: 'https://cdn.example.com/daily/version.json'
  DATA_URL: '',            // 例如: 'https://cdn.example.com/daily/full.json'
  USE_CDN: false          // 暂不使用 CDN，后续可启用
}

// 本地存储键
const STORAGE_KEYS = {
  LOCAL_VERSION: 'daily_rec_local_version',
  LOCAL_DATA: 'daily_rec_local_data',
  SHOWN_RECORDS: 'daily_rec_shown_records',
  USER_LIKED: 'daily_rec_user_liked'
}

class DailyRecommendService {
  constructor() {
    this.builtinData = null
    this.localData = null
    this.localVersion = null
  }

  /**
   * 获取今日推荐电影
   * @returns {Promise<Object>}
   */
  async getTodayRecommendation() {
    const today = this.formatDate(new Date())
    return await this.getRecommendationByDate(today)
  }

  /**
   * 根据日期获取推荐
   * @param {string} dateStr - YYYY-MM-DD 格式
   * @returns {Promise<Object>}
   */
  async getRecommendationByDate(dateStr) {
    try {
      // 1. 检查并更新数据
      if (CDN_CONFIG.USE_CDN) {
        await this.checkAndUpdateData()
      }

      // 2. 加载内置数据
      const builtinData = await this.getBuiltinData()

      // 3. 三层推荐引擎
      const [year, month, day] = dateStr.split('-')
      const mdKey = `${month}-${day}`

      // 第一层：影视史事件优先
      const eventMatch = this.findEventMatch(mdKey, builtinData)
      if (eventMatch) {
        const enriched = await this.enrichRecommendation(eventMatch)
        enriched.recommendType = RECOMMEND_TYPES.FILM_ANNIVERSARY
        return enriched
      }

      // 第二层：节日主题
      const holidayMatch = this.findHolidayMatch(mdKey, builtinData)
      if (holidayMatch) {
        const enriched = await this.enrichRecommendation(holidayMatch)
        enriched.recommendType = RECOMMEND_TYPES.HOLIDAY_THEME
        return enriched
      }

      // 第三层：日期索引 fallback（确保每天都有推荐）
      const fallback = this.getDateBasedRecommendation(dateStr, builtinData)
      const enriched = await this.enrichRecommendation(fallback)
      enriched.recommendType = RECOMMEND_TYPES.CRITICS_CHOICE
      return enriched

    } catch (error) {
      console.error('[DailyRecommend] 获取推荐失败:', error)
      // 返回默认推荐
      return await this.getDefaultRecommendation()
    }
  }

  /**
   * 查找影视史事件匹配
   */
  findEventMatch(mdKey, builtinData) {
    if (!builtinData || !builtinData.recommendations) return null

    const match = builtinData.recommendations.find(r => {
      if (r.type === 'film_anniversary' || r.type === 'film_release' || r.type === 'person_birthday') {
        return r.date === mdKey
      }
      return false
    })

    return match || null
  }

  /**
   * 查找节日主题匹配
   */
  findHolidayMatch(mdKey, builtinData) {
    if (!HOLIDAY_THEMES[mdKey]) return null
    if (!builtinData || !builtinData.recommendations) return null

    const holiday = HOLIDAY_THEMES[mdKey]
    // 查找该节日对应的电影
    const match = builtinData.recommendations.find(r => {
      return r.date === mdKey && r.type === 'holiday_theme'
    })

    if (match) return match

    // 如果没有精确匹配，返回任意一个有该类型事件的电影
    const genreMatch = builtinData.recommendations.find(r => {
      return r.genre && r.genre.includes(holiday.genre)
    })

    return genreMatch || builtinData.recommendations[0]
  }

  /**
   * 基于日期的推荐（fallback）
   * 确保每天都有稳定的推荐，同时避免重复
   */
  getDateBasedRecommendation(dateStr, builtinData) {
    if (!builtinData || !builtinData.recommendations || builtinData.recommendations.length === 0) {
      // 返回默认电影
      return {
        tmdbId: 278,
        date: this.formatMD(new Date()),
        type: 'default',
        eventTitle: '每日经典推荐',
        quote: 'Hope is a good thing, maybe the best of things.'
      }
    }

    const dayOfYear = this.getDayOfYear(dateStr)
    const year = dateStr.split('-')[0]

    // 获取已推荐的记录
    const shownRecords = this.getShownRecords()
    const shownThisYear = shownRecords.filter(r => r.year === year)
    const shownIds = shownThisYear.map(r => r.tmdbId)

    // 按日期索引选择，确保每天的基准电影固定
    let index = dayOfYear % builtinData.recommendations.length
    let candidate = builtinData.recommendations[index]

    // 如果本年度已推荐过，向后跳过
    let attempts = 0
    while (shownIds.includes(candidate.tmdbId) && attempts < builtinData.recommendations.length) {
      index = (index + 1) % builtinData.recommendations.length
      candidate = builtinData.recommendations[index]
      attempts++
    }

    // 记录本次推荐
    this.addShownRecord(dateStr, candidate.tmdbId, year)

    return candidate
  }

  /**
   * 补充 TMDB 详细信息
   */
  async enrichRecommendation(recommendation) {
    if (!recommendation || !recommendation.tmdbId) {
      return await this.getDefaultRecommendation()
    }

    try {
      const movieDetail = await tmdbApi.getMovieDetails(recommendation.tmdbId)

      return {
        ...recommendation,
        id: movieDetail.id,
        movieId: movieDetail.id,
        tmdbId: movieDetail.id,
        title: movieDetail.title,
        originalTitle: movieDetail.originalTitle || movieDetail.title,
        poster: movieDetail.poster,
        rating: movieDetail.rating,
        year: movieDetail.year,
        genre: movieDetail.genre,
        summary: movieDetail.summary,
        // 保留自定义字段
        quote: recommendation.quote || '',
        quoteFrom: recommendation.quoteFrom || '',
        eventTitle: recommendation.eventTitle || '',
        recommendType: recommendation.recommendType || RECOMMEND_TYPES.TRENDING
      }
    } catch (error) {
      console.error('[DailyRecommend] 补充电影详情失败:', error)
      return {
        ...recommendation,
        title: '电影详情加载失败',
        poster: '',
        rating: '0'
      }
    }
  }

  /**
   * 获取 TMDB Trending 电影作为补充
   */
  async getTrendingRecommendation() {
    try {
      // 这里可以调用 tmdbApi 获取 trending，但需要避免频繁请求
      // 暂时返回 null，让调用方使用 fallback
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * 获取默认推荐（当所有方法都失败时）
   */
  async getDefaultRecommendation() {
    return {
      tmdbId: 278,
      title: '肖申克的救赎',
      originalTitle: 'The Shawshank Redemption',
      poster: '',
      rating: '9.7',
      year: '1994',
      genre: '剧情',
      summary: '一场囚犯与狱警之间的故事，关于希望与救赎。',
      quote: 'Hope is a good thing, maybe the best of things, and no good thing ever dies.',
      quoteFrom: 'Andy Dufresne',
      eventTitle: '每日经典推荐',
      recommendType: RECOMMEND_TYPES.CRITICS_CHOICE
    }
  }

  /**
   * 检查并更新数据（CDN 版本）
   */
  async checkAndUpdateData() {
    if (!CDN_CONFIG.VERSION_CHECK_URL) return

    const localVersion = uni.getStorageSync(STORAGE_KEYS.LOCAL_VERSION) || '0'

    try {
      const versionInfo = await this.fetchVersionInfo()
      if (this.isNewerVersion(versionInfo.version, localVersion)) {
        const newData = await this.fetchFullData()
        uni.setStorageSync(STORAGE_KEYS.LOCAL_DATA, JSON.stringify(newData))
        uni.setStorageSync(STORAGE_KEYS.LOCAL_VERSION, versionInfo.version)
        this.localData = newData
      }
    } catch (e) {
      console.log('[DailyRecommend] CDN 更新失败，使用本地数据')
    }
  }

  /**
   * 获取远程版本信息
   */
  async fetchVersionInfo() {
    return new Promise((resolve, reject) => {
      uni.request({
        url: CDN_CONFIG.VERSION_CHECK_URL,
        success: (res) => resolve(res.data),
        fail: reject
      })
    })
  }

  /**
   * 获取完整数据
   */
  async fetchFullData() {
    return new Promise((resolve, reject) => {
      uni.request({
        url: CDN_CONFIG.DATA_URL,
        success: (res) => resolve(res.data),
        fail: reject
      })
    })
  }

  /**
   * 比较版本号
   */
  isNewerVersion(remote, local) {
    return remote > local
  }

  /**
   * 获取内置数据
   */
  async getBuiltinData() {
    if (this.localData) return this.localData

    try {
      const res = await uni.request({
        url: '/static/daily-recommendations.json'
      })
      this.localData = res.data
      return res.data
    } catch (e) {
      console.error('[DailyRecommend] 加载内置数据失败:', e)
      return { recommendations: [] }
    }
  }

  /**
   * 获取本地缓存数据
   */
  getLocalData() {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.LOCAL_DATA)
      return data ? JSON.parse(data) : null
    } catch (e) {
      return null
    }
  }

  /**
   * 获取已推荐记录
   */
  getShownRecords() {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.SHOWN_RECORDS)
      return data ? JSON.parse(data) : []
    } catch (e) {
      return []
    }
  }

  /**
   * 添加已推荐记录
   */
  addShownRecord(dateStr, tmdbId, year) {
    try {
      const records = this.getShownRecords()
      // 避免重复添加同一天的记录
      const exists = records.find(r => r.date === dateStr)
      if (!exists) {
        records.push({ date: dateStr, tmdbId, year })
        // 保留最近 2 年的记录
        const currentYear = new Date().getFullYear()
        const filtered = records.filter(r => parseInt(r.year) >= currentYear - 1)
        uni.setStorageSync(STORAGE_KEYS.SHOWN_RECORDS, JSON.stringify(filtered))
      }
    } catch (e) {
      console.error('[DailyRecommend] 记录推荐失败:', e)
    }
  }

  /**
   * 标记喜欢的电影
   */
  markAsLiked(tmdbId) {
    try {
      const liked = this.getLikedMovies()
      if (!liked.includes(tmdbId)) {
        liked.push(tmdbId)
        uni.setStorageSync(STORAGE_KEYS.USER_LIKED, JSON.stringify(liked))
      }
    } catch (e) {
      console.error('[DailyRecommend] 标记喜欢失败:', e)
    }
  }

  /**
   * 获取喜欢的电影列表
   */
  getLikedMovies() {
    try {
      const data = uni.getStorageSync(STORAGE_KEYS.USER_LIKED)
      return data ? JSON.parse(data) : []
    } catch (e) {
      return []
    }
  }

  /**
   * 获取日期是一年中的第几天
   */
  getDayOfYear(dateStr) {
    const date = new Date(dateStr)
    const start = new Date(date.getFullYear(), 0, 0)
    const diff = date - start
    const oneDay = 1000 * 60 * 60 * 24
    return Math.floor(diff / oneDay)
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  /**
   * 格式化日期为 MM-DD
   */
  formatMD(date) {
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${m}-${d}`
  }
}

// 导出单例
export default new DailyRecommendService()
