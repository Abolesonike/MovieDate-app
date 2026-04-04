/**
 * TMDB API 工具类
 * 文档: https://developers.themoviedb.org/3
 */

// 类型 ID 到中文名称的映射
const GENRE_MAP = {
  28: '动作',
  12: '冒险',
  16: '动画',
  35: '喜剧',
  80: '犯罪',
  99: '纪录',
  18: '剧情',
  10751: '家庭',
  14: '奇幻',
  36: '历史',
  27: '恐怖',
  10402: '音乐',
  9648: '悬疑',
  10749: '爱情',
  878: '科幻',
  10770: '电视电影',
  53: '惊悚',
  10752: '战争',
  37: '西部'
}

// 中文名称到类型 ID 的映射（用于搜索）
const GENRE_ID_MAP = {
  '动作': 28,
  '冒险': 12,
  '动画': 16,
  '喜剧': 35,
  '犯罪': 80,
  '纪录': 99,
  '剧情': 18,
  '家庭': 10751,
  '奇幻': 14,
  '历史': 36,
  '恐怖': 27,
  '音乐': 10402,
  '悬疑': 9648,
  '爱情': 10749,
  '科幻': 878,
  '电视电影': 10770,
  '惊悚': 53,
  '战争': 10752,
  '西部': 37
}

class TMDBApi {
  constructor() {
    this.API_KEY_STORAGE = 'tmdb_api_key'
    this.BASE_URL = 'https://api.themoviedb.org/3'
    this.IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'
    this.LANGUAGE = 'zh-CN'
  }

  // ========== API Key 管理 ==========

  /**
   * 设置 API Key
   * @param {string} key
   * @returns {boolean} 是否成功保存
   */
  setApiKey(key) {
    try {
      if (!key || typeof key !== 'string') {
        console.error('Invalid API Key:', key)
        return false
      }
      uni.setStorageSync(this.API_KEY_STORAGE, key)
      return true
    } catch (error) {
      console.error('保存 API Key 失败:', error)
      return false
    }
  }

  /**
   * 获取 API Key
   * @returns {string|null}
   */
  getApiKey() {
    try {
      const key = uni.getStorageSync(this.API_KEY_STORAGE)
      return key || null
    } catch (error) {
      console.error('获取 API Key 失败:', error)
      return null
    }
  }

  /**
   * 检查是否已配置 API Key
   * @returns {boolean}
   */
  hasApiKey() {
    return !!this.getApiKey()
  }

  /**
   * 清除 API Key
   * @returns {boolean} 是否成功清除
   */
  clearApiKey() {
    try {
      uni.removeStorageSync(this.API_KEY_STORAGE)
      return true
    } catch (error) {
      console.error('清除 API Key 失败:', error)
      return false
    }
  }

  // ========== 核心请求方法 ==========

  /**
   * 发送 API 请求
   * @param {string} endpoint - API 端点
   * @param {object} params - 请求参数
   * @returns {Promise<object>}
   */
  async request(endpoint, params = {}) {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      throw new Error('请先配置 TMDB API Key')
    }

    const url = `${this.BASE_URL}${endpoint}`
    const queryParams = new URLSearchParams({
      api_key: apiKey,
      language: this.LANGUAGE,
      ...params
    })

    return new Promise((resolve, reject) => {
      uni.request({
        url: `${url}?${queryParams.toString()}`,
        method: 'GET',
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else if (res.statusCode === 401) {
            reject(new Error('API Key 无效'))
          } else if (res.statusCode === 404) {
            reject(new Error('资源不存在'))
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(new Error('网络请求失败'))
        }
      })
    })
  }

  // ========== API 端点 ==========

  /**
   * 获取热门电影
   * @param {number} page - 页码
   * @returns {Promise<object>}
   */
  async getPopularMovies(page = 1) {
    const data = await this.request('/movie/popular', { page })
    return {
      movies: this.transformMovies(data.results),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    }
  }

  /**
   * 获取高分电影（Top Rated）
   * @param {number} page - 页码
   * @returns {Promise<object>}
   */
  async getTopRatedMovies(page = 1) {
    const data = await this.request('/movie/top_rated', { page })
    return {
      movies: this.transformMovies(data.results),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    }
  }

  /**
   * 搜索电影
   * @param {string} query - 搜索关键词
   * @param {number} page - 页码
   * @returns {Promise<object>}
   */
  async searchMovies(query, page = 1) {
    if (!query || !query.trim()) {
      return { movies: [], page: 1, totalPages: 0, totalResults: 0 }
    }
    const data = await this.request('/search/movie', { query: query.trim(), page })
    return {
      movies: this.transformMovies(data.results),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    }
  }

  /**
   * 按类型发现电影
   * @param {number} genreId - 类型 ID
   * @param {number} page - 页码
   * @returns {Promise<object>}
   */
  async discoverByGenre(genreId, page = 1) {
    const data = await this.request('/discover/movie', {
      with_genres: genreId,
      page,
      sort_by: 'popularity.desc'
    })
    return {
      movies: this.transformMovies(data.results),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    }
  }

  /**
   * 获取电影详情
   * @param {number} movieId - 电影 ID
   * @returns {Promise<object>}
   */
  async getMovieDetails(movieId) {
    const data = await this.request(`/movie/${movieId}`)
    return this.transformMovie(data)
  }

  /**
   * 验证 API Key 是否有效
   * @param {string} key - 要验证的 API Key
   * @returns {Promise<boolean>}
   */
  async validateApiKey(key) {
    return new Promise((resolve) => {
      uni.request({
        url: `${this.BASE_URL}/configuration?api_key=${key}`,
        method: 'GET',
        success: (res) => {
          resolve(res.statusCode === 200)
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  }

  // ========== 数据转换 ==========

  /**
   * 转换单个电影数据
   * @param {object} tmdbMovie - TMDB 电影对象
   * @returns {object}
   */
  transformMovie(tmdbMovie) {
    return {
      id: tmdbMovie.id,
      title: tmdbMovie.title,
      poster: tmdbMovie.poster_path
        ? `${this.IMAGE_BASE_URL}${tmdbMovie.poster_path}`
        : '',
      rating: tmdbMovie.vote_average
        ? tmdbMovie.vote_average.toFixed(1)
        : '0.0',
      year: tmdbMovie.release_date
        ? tmdbMovie.release_date.split('-')[0]
        : '',
      genre: this.getGenreNames(tmdbMovie.genre_ids),
      summary: tmdbMovie.overview || ''
    }
  }

  /**
   * 转换电影列表
   * @param {array} tmdbMovies - TMDB 电影数组
   * @returns {array}
   */
  transformMovies(tmdbMovies) {
    if (!Array.isArray(tmdbMovies)) return []
    return tmdbMovies.map(movie => this.transformMovie(movie))
  }

  /**
   * 获取类型名称列表
   * @param {array} genreIds - 类型 ID 数组
   * @returns {string}
   */
  getGenreNames(genreIds) {
    if (!Array.isArray(genreIds) || genreIds.length === 0) return ''
    const names = genreIds
      .slice(0, 2) // 最多显示2个类型
      .map(id => GENRE_MAP[id])
      .filter(Boolean)
    return names.join(' / ')
  }

  /**
   * 获取类型 ID
   * @param {string} genreName - 类型中文名
   * @returns {number|null}
   */
  getGenreId(genreName) {
    return GENRE_ID_MAP[genreName] || null
  }

  /**
   * 获取所有类型映射
   * @returns {object}
   */
  getAllGenres() {
    return { ...GENRE_MAP }
  }
}

// 导出单例
export default new TMDBApi()
