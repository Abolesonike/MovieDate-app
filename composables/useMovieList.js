import { ref } from 'vue'
import tmdbApi from '@/utils/tmdb.js'

const PAGE_SIZE = 10

/**
 * 电影列表分页加载 Composable
 * @param {Object} options
 * @param {() => Array} options.fetchList - 获取原始列表数据的函数
 * @param {(item: any) => Object} [options.mapItem] - 将原始数据映射为电影详情补充字段
 */
export function useMovieList(options) {
  const { fetchList, mapItem = () => ({}) } = options

  const isLoading = ref(true)
  const loadingMore = ref(false)
  const hasMore = ref(true)
  const currentPage = ref(1)
  const movieList = ref([])
  const rawData = ref([])

  async function loadData() {
    isLoading.value = true
    currentPage.value = 1
    hasMore.value = true

    try {
      rawData.value = fetchList()

      if (rawData.value.length === 0) {
        movieList.value = []
        hasMore.value = false
        return
      }

      await loadMoviesByPage()
    } catch (error) {
      console.error('加载列表失败:', error)
      uni.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      isLoading.value = false
    }
  }

  async function loadMoviesByPage() {
    const start = (currentPage.value - 1) * PAGE_SIZE
    const end = start + PAGE_SIZE
    const pageData = rawData.value.slice(start, end)

    if (pageData.length === 0) {
      hasMore.value = false
      return
    }

    const moviePromises = pageData.map(async (item) => {
      try {
        const movieDetails = await tmdbApi.getMovieDetails(item.movieId)
        return {
          ...movieDetails,
          ...mapItem(item)
        }
      } catch (error) {
        console.error(`获取电影 ${item.movieId} 详情失败:`, error)
        return null
      }
    })

    const movies = await Promise.all(moviePromises)
    const validMovies = movies.filter((m) => m !== null)

    if (currentPage.value === 1) {
      movieList.value = validMovies
    } else {
      movieList.value.push(...validMovies)
    }

    hasMore.value = end < rawData.value.length
  }

  async function loadMore() {
    if (loadingMore.value || !hasMore.value) return

    loadingMore.value = true
    currentPage.value++

    try {
      await loadMoviesByPage()
    } catch (error) {
      console.error('加载更多失败:', error)
      currentPage.value--
    } finally {
      loadingMore.value = false
    }
  }

  function goToDetail(movie) {
    uni.navigateTo({
      url: `/pages/movie/detail/index?movieId=${movie.id}`
    })
  }

  function goToMoviePage() {
    uni.switchTab({
      url: '/pages/movie/index'
    })
  }

  return {
    isLoading,
    loadingMore,
    hasMore,
    movieList,
    loadData,
    loadMore,
    goToDetail,
    goToMoviePage
  }
}
