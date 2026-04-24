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
    this.API_PROXY_STORAGE = 'tmdb_api_proxy'
    // 默认使用官方地址,可配置为代理地址
    this.DEFAULT_BASE_URL = 'https://api.themoviedb.org/3'
    this.IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'
    this.LANGUAGE = 'zh-CN'
    
    // 常见的国内可用代理地址
    this.COMMON_PROXIES = [
      'https://api.tmdb.org/3',
      'https://tmdb-api.com/3',
      'https://api.themoviedb.org/3'
    ]
  }

  /**
   * 获取基础 URL (优先使用配置的代理)
   * @returns {string}
   */
  getBaseUrl() {
    try {
      const proxy = uni.getStorageSync(this.API_PROXY_STORAGE)
      if (proxy && typeof proxy === 'string' && proxy.trim()) {
        return proxy.trim()
      }
    } catch (error) {
      console.error('获取代理地址失败:', error)
    }
    return this.DEFAULT_BASE_URL
  }

  /**
   * 设置 API 代理地址
   * @param {string} proxy - 代理地址
   * @returns {boolean} 是否成功保存
   */
  setApiProxy(proxy) {
    try {
      if (!proxy || typeof proxy !== 'string') {
        console.error('Invalid Proxy URL:', proxy)
        return false
      }
      // 确保地址以 /3 结尾或没有版本号
      let normalizedProxy = proxy.trim()
      if (!normalizedProxy.endsWith('/3')) {
        normalizedProxy = normalizedProxy.replace(/\/?$/, '/3')
      }
      uni.setStorageSync(this.API_PROXY_STORAGE, normalizedProxy)
      console.log('[TMDB] 代理地址已设置:', normalizedProxy)
      return true
    } catch (error) {
      console.error('保存代理地址失败:', error)
      return false
    }
  }

  /**
   * 清除代理地址,恢复默认
   * @returns {boolean}
   */
  clearApiProxy() {
    try {
      uni.removeStorageSync(this.API_PROXY_STORAGE)
      console.log('[TMDB] 代理地址已清除,使用默认地址')
      return true
    } catch (error) {
      console.error('清除代理地址失败:', error)
      return false
    }
  }

  /**
   * 获取当前使用的代理地址
   * @returns {string}
   */
  getApiProxy() {
    try {
      return uni.getStorageSync(this.API_PROXY_STORAGE) || null
    } catch (error) {
      console.error('获取代理地址失败:', error)
      return null
    }
  }

  /**
   * 检查是否配置了自定义代理
   * @returns {boolean}
   */
  hasCustomProxy() {
    return !!this.getApiProxy()
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
      console.error('[TMDB] API Key 未配置')
      throw new Error('请先配置 TMDB API Key')
    }

    const baseUrl = this.getBaseUrl()
    const url = `${baseUrl}${endpoint}`

    // 手动构建查询参数，避免 URLSearchParams 兼容性问题
    const paramsArray = []
    paramsArray.push(`api_key=${encodeURIComponent(apiKey)}`)
    paramsArray.push(`language=${encodeURIComponent(this.LANGUAGE)}`)

    // 添加其他参数
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        paramsArray.push(`${key}=${encodeURIComponent(value)}`)
      }
    }

    const queryString = paramsArray.join('&')
    const fullUrl = `${url}?${queryString}`
    
    const currentProxy = this.getApiProxy()
    console.log('[TMDB] 发起请求:', {
      endpoint,
      baseUrl,
      usingProxy: !!currentProxy,
      proxy: currentProxy || '默认',
      fullUrl,
      params,
      queryString,
      apiKeyLength: apiKey.length,
      timestamp: new Date().toISOString()
    })

    return new Promise((resolve, reject) => {
      // 设置超时时间
      const timeout = 30000 // 30秒超时
      let timer

      const startTime = Date.now()

      uni.request({
        url: fullUrl,
        method: 'GET',
        timeout,
        success: (res) => {
          const duration = Date.now() - startTime
          console.log('[TMDB] 请求成功:', {
            endpoint,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            dataLength: res.data ? JSON.stringify(res.data).length : 0
          })

          if (res.statusCode === 200) {
            resolve(res.data)
          } else if (res.statusCode === 401) {
            console.error('[TMDB] API Key 无效:', res)
            reject(new Error('API Key 无效'))
          } else if (res.statusCode === 404) {
            console.error('[TMDB] 资源不存在:', res)
            reject(new Error('资源不存在'))
          } else {
            console.error('[TMDB] 请求失败:', res)
            reject(new Error(`请求失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          const duration = Date.now() - startTime
          console.error('[TMDB] 请求失败:', {
            endpoint,
            error: err,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            stack: err.stack || '无堆栈信息'
          })
          
          // 提供更友好的错误提示
          let errorMsg = `网络请求失败: ${err.errMsg || '未知错误'}`
          if (err.errMsg && err.errMsg.includes('timeout')) {
            errorMsg = '请求超时,请检查网络连接或尝试更换代理地址'
          } else if (err.errMsg && (err.errMsg.includes('fail') || err.errMsg.includes('error'))) {
            errorMsg = '网络连接失败,请检查:\n1. 网络连接是否正常\n2. 代理地址是否可用\n3. 是否被防火墙拦截'
          }
          
          reject(new Error(errorMsg))
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
    console.log('[TMDB] 获取热门电影:', { page, timestamp: new Date().toISOString() })

    try {
      const data = await this.request('/movie/popular', { page })
      const result = {
        movies: this.transformMovies(data.results),
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results
      }

      console.log('[TMDB] 获取热门电影成功:', {
        page: result.page,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        movieCount: result.movies.length,
        timestamp: new Date().toISOString()
      })

      return result
    } catch (error) {
      console.error('[TMDB] 获取热门电影失败:', error)
      throw error
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
    const trimmedQuery = query && query.trim()
    console.log('[TMDB] 搜索电影:', {
      query: trimmedQuery,
      originalQuery: query,
      page,
      hasQuery: !!trimmedQuery,
      timestamp: new Date().toISOString()
    })

    if (!trimmedQuery) {
      console.log('[TMDB] 搜索关键词为空，返回空结果')
      return { movies: [], page: 1, totalPages: 0, totalResults: 0 }
    }

    try {
      const data = await this.request('/search/movie', { query: trimmedQuery, page })
      const result = {
        movies: this.transformMovies(data.results),
        page: data.page,
        totalPages: data.total_pages,
        totalResults: data.total_results
      }

      console.log('[TMDB] 搜索电影成功:', {
        query: trimmedQuery,
        page: result.page,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
        movieCount: result.movies.length,
        timestamp: new Date().toISOString()
      })

      return result
    } catch (error) {
      console.error('[TMDB] 搜索电影失败:', error)
      throw error
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
    console.log('[TMDB] 获取电影详情:', {
      movieId,
      timestamp: new Date().toISOString()
    })

    try {
      const data = await this.request(`/movie/${movieId}`, { append_to_response: 'credits' })
      const result = this.transformMovie(data)

      console.log('[TMDB] 获取电影详情成功:', {
        movieId: result.id,
        title: result.title,
        hasPoster: !!result.poster,
        rating: result.rating,
        year: result.year,
        genres: result.genre,
        summaryLength: result.summary.length,
        timestamp: new Date().toISOString()
      })

      return result
    } catch (error) {
      console.error('[TMDB] 获取电影详情失败:', error)
      throw error
    }
  }

  /**
   * 验证 API Key 是否有效
   * @param {string} key - 要验证的 API Key
   * @returns {Promise<boolean>}
   */
  async validateApiKey(key) {
    console.log('[TMDB] 验证 API Key:', {
      keyLength: key.length,
      usingProxy: this.hasCustomProxy(),
      proxy: this.getApiProxy() || '默认',
      timestamp: new Date().toISOString()
    })

    const baseUrl = this.getBaseUrl()

    return new Promise((resolve) => {
      uni.request({
        url: `${baseUrl}/configuration?api_key=${key}`,
        method: 'GET',
        timeout: 15000, // 验证请求设置较短超时
        success: (res) => {
          console.log('[TMDB] API Key 验证结果:', {
            statusCode: res.statusCode,
            usingProxy: this.hasCustomProxy(),
            timestamp: new Date().toISOString()
          })
          resolve(res.statusCode === 200)
        },
        fail: (err) => {
          console.error('[TMDB] API Key 验证失败:', err)
          resolve(false)
        }
      })
    })
  }

  /**
   * 获取电影演职人员
   * @param {number} movieId - 电影 ID
   * @returns {Promise<object>}
   */
  async getMovieCredits(movieId) {
    const data = await this.request(`/movie/${movieId}/credits`)
    return {
      cast: (data.cast || []).slice(0, 12).map(p => ({
        id: p.id,
        name: p.name,
        role: p.character,
        profile: p.profile_path ? `${this.IMAGE_BASE_URL}${p.profile_path}` : ''
      })),
      directors: (data.crew || []).filter(p => p.job === 'Director').map(p => ({
        id: p.id,
        name: p.name,
        role: '导演',
        profile: p.profile_path ? `${this.IMAGE_BASE_URL}${p.profile_path}` : ''
      })),
      writers: (data.crew || []).filter(p => ['Writer', 'Screenplay', 'Story'].includes(p.job)).map(p => ({
        id: p.id,
        name: p.name,
        role: p.job === 'Screenplay' ? '编剧' : (p.job === 'Story' ? '故事' : '编剧'),
        profile: p.profile_path ? `${this.IMAGE_BASE_URL}${p.profile_path}` : ''
      }))
    }
  }

  /**
   * 获取电影人详情
   * @param {number} personId - 电影人 ID
   * @returns {Promise<object>}
   */
  async getPersonDetails(personId) {
    const data = await this.request(`/person/${personId}`)
    return {
      id: data.id,
      name: data.name,
      biography: data.biography || '暂无简介',
      birthday: data.birthday || '',
      placeOfBirth: data.place_of_birth || '',
      department: data.known_for_department || '',
      profile: data.profile_path ? `${this.IMAGE_BASE_URL}${data.profile_path}` : ''
    }
  }

  /**
   * 搜索影人
   * @param {string} query - 搜索关键词
   * @param {number} page - 页码
   * @returns {Promise<object>}
   */
  async searchPerson(query, page = 1) {
    const trimmedQuery = query && query.trim()
    if (!trimmedQuery) {
      return { persons: [], page: 1, totalPages: 0, totalResults: 0 }
    }

    const data = await this.request('/search/person', { query: trimmedQuery, page })
    return {
      persons: data.results.map(p => ({
        id: p.id,
        name: p.name,
        profile: p.profile_path ? `${this.IMAGE_BASE_URL}${p.profile_path}` : '',
        knownFor: p.known_for_department || '',
        knownForMovies: (p.known_for || [])
          .filter(k => k.media_type === 'movie')
          .map(k => k.title || k.name)
          .filter(Boolean)
          .slice(0, 3)
      })),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    }
  }

  /**
   * 获取电影人作品
   * @param {number} personId - 电影人 ID
   * @returns {Promise<object>}
   */
  async getPersonMovieCredits(personId) {
    const data = await this.request(`/person/${personId}/movie_credits`)
    const transformAndSort = (list) => {
      const map = new Map()
      list.forEach(m => {
        if (!map.has(m.id)) map.set(m.id, m)
      })
      return Array.from(map.values())
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .map(m => this.transformMovie(m))
    }
    return {
      cast: transformAndSort(data.cast || []),
      crew: transformAndSort(data.crew || [])
    }
  }

  // ========== 数据转换 ==========

  /**
   * 转换单个电影数据
   * @param {object} tmdbMovie - TMDB 电影对象
   * @returns {object}
   */
  transformMovie(tmdbMovie) {
    if (!tmdbMovie) {
      console.error('[TMDB] transformMovie: 输入为空')
      return null
    }

    // 从 credits 中提取导演（当通过 append_to_response=credits 获取时）
    let director = ''
    if (tmdbMovie.credits && tmdbMovie.credits.crew) {
      const directors = tmdbMovie.credits.crew.filter(p => p.job === 'Director')
      if (directors.length > 0) {
        director = directors.map(d => d.name).join(' / ')
      }
    }

    const result = {
      id: tmdbMovie.id,
      title: tmdbMovie.title,
      originalTitle: tmdbMovie.original_title || tmdbMovie.title,
      poster: tmdbMovie.poster_path
        ? `${this.IMAGE_BASE_URL}${tmdbMovie.poster_path}`
        : '',
      rating: tmdbMovie.vote_average
        ? tmdbMovie.vote_average.toFixed(1)
        : '0.0',
      year: tmdbMovie.release_date
        ? tmdbMovie.release_date.split('-')[0]
        : '',
      genre: this.getGenreNames(tmdbMovie.genre_ids || (tmdbMovie.genres ? tmdbMovie.genres.map(g => g.id) : [])),
      summary: tmdbMovie.overview || '',
      director
    }

    return result
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

  /**
   * 调试信息 - 用于排查问题
   * @returns {object}
   */
  getDebugInfo() {
    const systemInfo = uni.getSystemInfoSync()
    const apiKey = this.getApiKey()
    const apiProxy = this.getApiProxy()

    console.log('[TMDB] 调试信息:', {
      BASE_URL: this.DEFAULT_BASE_URL,
      CURRENT_BASE_URL: this.getBaseUrl(),
      IMAGE_BASE_URL: this.IMAGE_BASE_URL,
      LANGUAGE: this.LANGUAGE,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      hasCustomProxy: !!apiProxy,
      currentProxy: apiProxy || '默认',
      platform: systemInfo.platform,
      system: systemInfo.system,
      version: systemInfo.version,
      uniRuntimeVersion: systemInfo.uniRuntimeVersion,
      appVersion: systemInfo.appVersion,
      timestamp: new Date().toISOString()
    })

    return {
      BASE_URL: this.DEFAULT_BASE_URL,
      CURRENT_BASE_URL: this.getBaseUrl(),
      IMAGE_BASE_URL: this.IMAGE_BASE_URL,
      LANGUAGE: this.LANGUAGE,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      hasCustomProxy: !!apiProxy,
      currentProxy: apiProxy || '默认',
      platform: systemInfo.platform,
      system: systemInfo.system,
      version: systemInfo.version,
      uniRuntimeVersion: systemInfo.uniRuntimeVersion,
      appVersion: systemInfo.appVersion
    }
  }
}

// 导出单例
export default new TMDBApi()
