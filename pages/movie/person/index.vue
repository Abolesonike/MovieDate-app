<template>
  <view class="person-page">
    <!-- 头部信息 -->
    <view class="person-header">
      <image
        class="person-avatar"
        :src="person.profile || '/static/default-avatar.png'"
        mode="aspectFill"
      />
      <view class="person-info">
        <text class="person-name">{{ person.name }}</text>
        <text v-if="personMeta" class="person-meta">{{ personMeta }}</text>
      </view>
    </view>

    <!-- 个人简介 -->
    <view class="bio-section">
      <text class="section-title">个人简介</text>
      <text class="bio-text">{{ person.biography }}</text>
    </view>

    <!-- 作品 Tab -->
    <view class="works-section">
      <view class="works-tabs">
        <view
          :class="['tab-item', activeTab === 'cast' && 'active']"
          @click="activeTab = 'cast'"
        >
          <text class="tab-text">参演</text>
          <text class="tab-count">{{ castMovies.length }}</text>
        </view>
        <view
          :class="['tab-item', activeTab === 'crew' && 'active']"
          @click="activeTab = 'crew'"
        >
          <text class="tab-text">幕后</text>
          <text class="tab-count">{{ crewMovies.length }}</text>
        </view>
      </view>

      <!-- 电影列表 -->
      <view v-if="activeMovies.length" class="works-list">
        <movie-card-horizontal
          v-for="movie in activeMovies"
          :key="movie.id"
          :movie="movie"
          :show-status="false"
          :show-summary="true"
          @click="goToMovie(movie.id)"
        />
      </view>

      <view v-else class="empty-works">
        <text class="empty-text">暂无相关作品</text>
      </view>
    </view>
  </view>
</template>

<script>
import tmdbApi from '@/utils/tmdb.js'
import MovieCardHorizontal from '@/components/movie-card/movie-card-horizontal.vue'

export default {
  components: {
    MovieCardHorizontal
  },

  data() {
    return {
      person: {
        id: '',
        name: '',
        biography: '',
        birthday: '',
        placeOfBirth: '',
        department: '',
        profile: ''
      },
      castMovies: [],
      crewMovies: [],
      activeTab: 'cast'
    }
  },

  computed: {
    personMeta() {
      const parts = []
      if (this.person.department) {
        parts.push(this.person.department)
      }
      if (this.person.birthday) {
        parts.push(this.person.birthday)
      }
      if (this.person.placeOfBirth) {
        parts.push(this.person.placeOfBirth)
      }
      return parts.join(' · ')
    },

    activeMovies() {
      return this.activeTab === 'cast' ? this.castMovies : this.crewMovies
    }
  },

  onLoad(options) {
    const personId = options.personId
    if (personId) {
      this.loadPersonDetail(personId)
      this.loadPersonMovies(personId)
    }
  },

  methods: {
    async loadPersonDetail(personId) {
      try {
        const result = await tmdbApi.getPersonDetails(personId)
        this.person = result
      } catch (err) {
        uni.showToast({ title: '加载影人详情失败', icon: 'none' })
        console.error(err)
      }
    },

    async loadPersonMovies(personId) {
      try {
        const result = await tmdbApi.getPersonMovieCredits(personId)
        this.castMovies = result.cast
        this.crewMovies = result.crew
      } catch (err) {
        uni.showToast({ title: '加载作品失败', icon: 'none' })
        console.error(err)
      }
    },

    goToMovie(movieId) {
      uni.navigateTo({
        url: `/pages/movie/detail/index?movieId=${movieId}`
      })
    }
  }
}
</script>

<style scoped>
.person-page {
  min-height: 100vh;
  background-color: var(--bg-page);
  padding: 16px;
}

/* 头部 */
.person-header {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-card);
}

.person-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--bg-hover);
  flex-shrink: 0;
  margin-right: 16px;
}

.person-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.person-name {
  font-size: 20px;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.person-meta {
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

/* 简介 */
.bio-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-card);
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 10px;
  display: block;
}

.bio-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
}

/* 作品区域 */
.works-section {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.works-tabs {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 12px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 4px;
}

.tab-item.active {
  position: relative;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -13px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary);
}

.tab-text {
  font-size: 15px;
  color: var(--text-secondary);
}

.tab-item.active .tab-text {
  color: var(--text-primary);
  font-weight: 500;
}

.tab-count {
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-page);
  padding: 2px 8px;
  border-radius: 10px;
}

.tab-item.active .tab-count {
  background: #f0ebff;
  color: var(--primary);
}

.works-list {
  padding-top: 4px;
}

.empty-works {
  text-align: center;
  padding: 40px 0;
}

.empty-text {
  font-size: 14px;
  color: var(--text-tertiary);
}
</style>
