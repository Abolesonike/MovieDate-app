/**
 * 豆瓣Top250电影映射工具
 * 用于关联豆瓣排名与TMDB电影信息
 */

// 引入豆瓣Top250映射数据
// 注意：在uni-app中，static目录下的文件需要通过相对路径读取
let doubanTop250Data = null;

/**
 * 加载映射数据
 * @returns {Promise<Object>}
 */
async function loadMappingData() {
  if (doubanTop250Data) {
    return doubanTop250Data;
  }

  try {
    // 在uni-app中读取static目录下的JSON文件
    const res = await uni.request({
      url: '/static/douban-top250.json',
      method: 'GET'
    });
    doubanTop250Data = res.data;
    return doubanTop250Data;
  } catch (error) {
    console.error('[DoubanMapping] 加载映射数据失败:', error);
    // 返回空数据结构作为fallback
    return { movies: [], total: 0 };
  }
}

/**
 * 豆瓣Top250映射工具类
 */
class DoubanMapping {
  constructor() {
    this.data = null;
  }

  /**
   * 初始化，加载映射数据
   */
  async init() {
    this.data = await loadMappingData();
    return this;
  }

  /**
   * 根据TMDB ID获取豆瓣排名信息
   * @param {number} tmdbId - TMDB电影ID
   * @returns {Object|null} 豆瓣排名信息
   */
  getDoubanInfoByTmdbId(tmdbId) {
    if (!this.data || !this.data.movies) return null;
    return this.data.movies.find(m => m.tmdbId === tmdbId) || null;
  }

  /**
   * 根据豆瓣排名获取电影信息
   * @param {number} rank - 排名（1-250）
   * @returns {Object|null}
   */
  getMovieByRank(rank) {
    if (!this.data || !this.data.movies) return null;
    return this.data.movies.find(m => m.doubanRank === rank) || null;
  }

  /**
   * 根据豆瓣ID获取电影信息
   * @param {string} doubanId - 豆瓣电影ID
   * @returns {Object|null}
   */
  getMovieByDoubanId(doubanId) {
    if (!this.data || !this.data.movies) return null;
    return this.data.movies.find(m => m.doubanId === doubanId) || null;
  }

  /**
   * 获取所有Top250的TMDB ID列表
   * @returns {number[]}
   */
  getAllTmdbIds() {
    if (!this.data || !this.data.movies) return [];
    return this.data.movies.map(m => m.tmdbId);
  }

  /**
   * 根据排名范围获取电影列表
   * @param {number} start - 起始排名（包含）
   * @param {number} end - 结束排名（包含）
   * @returns {Object[]}
   */
  getMoviesByRankRange(start, end) {
    if (!this.data || !this.data.movies) return [];
    return this.data.movies.filter(
      m => m.doubanRank >= start && m.doubanRank <= end
    );
  }

  /**
   * 获取所有电影列表
   * @returns {Object[]}
   */
  getAllMovies() {
    if (!this.data || !this.data.movies) return [];
    return [...this.data.movies];
  }

  /**
   * 检查电影是否在豆瓣Top250中
   * @param {number} tmdbId - TMDB电影ID
   * @returns {boolean}
   */
  isInTop250(tmdbId) {
    return !!this.getDoubanInfoByTmdbId(tmdbId);
  }

  /**
   * 获取用户已看的Top250电影
   * @param {number[]} watchedMovieIds - 用户已看电影的TMDB ID列表
   * @returns {Object[]} 已看的Top250电影列表（包含豆瓣排名信息）
   */
  getWatchedTop250(watchedMovieIds) {
    if (!this.data || !this.data.movies || !watchedMovieIds) return [];

    const watchedSet = new Set(watchedMovieIds);
    return this.data.movies
      .filter(m => watchedSet.has(m.tmdbId))
      .sort((a, b) => a.doubanRank - b.doubanRank);
  }

  /**
   * 获取用户未看的Top250电影
   * @param {number[]} watchedMovieIds - 用户已看电影的TMDB ID列表
   * @returns {Object[]} 未看的Top250电影列表
   */
  getUnwatchedTop250(watchedMovieIds) {
    if (!this.data || !this.data.movies || !watchedMovieIds) {
      return this.getAllMovies();
    }

    const watchedSet = new Set(watchedMovieIds);
    return this.data.movies
      .filter(m => !watchedSet.has(m.tmdbId))
      .sort((a, b) => a.doubanRank - b.doubanRank);
  }

  /**
   * 计算用户Top250观影统计
   * @param {number[]} watchedMovieIds - 用户已看电影的TMDB ID列表
   * @returns {Object} 统计信息
   */
  getWatchStats(watchedMovieIds) {
    const total = this.data?.total || 250;
    const watched = this.getWatchedTop250(watchedMovieIds);
    const unwatched = this.getUnwatchedTop250(watchedMovieIds);

    return {
      total,
      watchedCount: watched.length,
      unwatchedCount: unwatched.length,
      percentage: total > 0 ? ((watched.length / total) * 100).toFixed(1) : 0,
      watchedMovies: watched,
      unwatchedMovies: unwatched
    };
  }

  /**
   * 获取映射数据版本信息
   * @returns {Object}
   */
  getVersionInfo() {
    return {
      version: this.data?.version || 'unknown',
      updateTime: this.data?.updateTime || 'unknown',
      total: this.data?.total || 0
    };
  }
}

// 导出单例
export default new DoubanMapping();

// 同时导出独立函数供简单使用
export {
  loadMappingData
};
