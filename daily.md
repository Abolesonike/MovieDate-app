# 每日推荐功能设计方案 (Daily.md)

## 一、背景与目标

**功能定位**：类似豆瓣电影的"每日推荐"功能，整合到日历页面，提供每天一部精选电影推荐，包含海报、评分、经典台词、影视史事件等信息。

**核心需求**：
- 在日历页面添加"今日"页签（与周视图、月视图并列）
- 每日推荐电影展示：海报、TMDB评分、经典台词、相关影视史事件
- 融合现有日历功能：用户可管理今日电影（添加到想看/已看/待看）

---

## 二、数据源问题分析与解决方案

### 2.1 问题分析

豆瓣的每日推荐是**人工+算法维护**的编辑精选，项目无法直接获取其数据。每日推荐数据需要：
1. 定期更新（人工 curation 精选电影）
2. 推送机制（将新数据推送到用户端）
3. 离线可用（无网络时也能使用）

### 2.2 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **A. CDN托管 + App检查更新** | 免费、轻量、更新灵活 | 首次需要网络 | **推荐** |
| B. 自建后端服务 | 灵活、可人工编辑 | 运维成本高、需要服务器 | 不推荐 |
| C. 纯本地静态JSON | 离线可用、实现简单 | 无法更新数据 | 仅作为fallback |

### 2.3 推荐方案：CDN托管 + 版本检查 + 本地缓存

**核心思路**：
- **内置基础数据**：应用包内置一份基础精选数据，保证首次安装可用
- **CDN托管更新数据**：将 `daily-recommendations.json` 托管到免费 CDN（如 jsDelivr、Cloudflare Pages 等）
- **版本检查更新**：应用启动时检查远程版本号，有新版本则下载更新

**数据托管方案**：

1. **免费CDN选项**：
   - **jsDelivr + GitHub**：将 JSON 提交到 GitHub 仓库，通过 jsDelivr CDN 访问
   - **Cloudflare Pages**：免费托管静态文件
   - **Vercel**：免费部署静态文件

2. **版本检查机制**：
   ```javascript
   // 远程数据结构
   {
     "version": "20260423",           // 版本号（日期格式）
     "lastUpdate": "2026-04-23",      // 最后更新时间
     "dataUrl": "完整数据文件的CDN链接",
     "totalCount": 365,               // 电影总数
     "checksum": "md5/..."            // 数据校验
   }

   // 本地存储
   {
     "localVersion": "20260420",      // 本地缓存版本
     "cachedData": { ... }            // 缓存的完整数据
   }
   ```

3. **更新流程**：
   ```
   App启动 → 检查远程版本号 →
     ├─ 版本相同 → 使用本地缓存
     └─ 版本更新 → 下载新数据 → 更新本地缓存 → 使用新数据
   ```

4. **兜底策略**：
   - 网络失败时使用本地缓存
   - 本地无缓存时使用内置基础数据

**数据结构设计**：

```json
// static/daily-recommendations.json（内置基础数据）
{
  "version": "20260401",
  "lastUpdate": "2026-04-01",
  "recommendations": [
    {
      "date": "01-01",
      "tmdbId": 278,
      "type": "film_release",
      "eventTitle": "《肖申克的救赎》上映30周年",
      "eventDesc": "1994年9月23日上映，豆瓣评分9.7",
      "quote": "Hope is a good thing, maybe the best of things."
    }
  ]
}
```

**日期匹配逻辑**：

采用"三层推荐引擎"设计，优先级从高到低：

1. **第一层：影视史事件优先**
   - 精确匹配 `MM-DD` 到电影上映纪念日、影人生日等
   - 例如：4月23日 → 《泰坦尼克号》1998年4月23日在中国上映

2. **第二层：TMDB trending/ontoday 数据**
   - 调用 TMDB `/trending/movie/day` 获取今日热门
   - 调用 TMDB `/movie/{id}/release_dates` 获取电影在各国的上映日期
   - 如果某电影恰在"今天"有上映纪念日，提升其排名

3. **第三层：静态精选库 fallback**
   - 日期索引映射，确保每天都有推荐
   - 结合"已推荐过"记录，避免今年重复推荐去年的电影

**推荐算法设计**：

```javascript
/**
 * 智能推荐算法
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Promise<DailyRecommendation>}
 */
async getSmartRecommendation(dateStr) {
  const [year, month, day] = dateStr.split('-')
  const mdKey = `${month}-${day}`

  // 1. 查找影视史事件（精确匹配）
  const eventMatch = await this.findEventMatch(mdKey, dateStr)
  if (eventMatch) {
    return this.enrichRecommendation(eventMatch)
  }

  // 2. 获取TMDB今日热门，查找有"今日"属性的电影
  const tmdbMatch = await this.findTmdbOnThisDay(dateStr)
  if (tmdbMatch) {
    return this.enrichRecommendation(tmdbMatch)
  }

  // 3. 从精选库中排除已推荐过的，选择新的
  const fallback = await this.getUnseenRecommendation(dateStr)
  return this.enrichRecommendation(fallback)
}

/**
 * 查找影视史事件匹配
 * 支持：电影上映周年、导演/演员生日、获奖纪念日
 */
async findEventMatch(mdKey, dateStr) {
  // 1. 静态事件库精确匹配
  const staticEvent = this.findStaticEvent(mdKey)
  if (staticEvent) return staticEvent

  // 2. TMDB API：获取今日有发行日期纪念的电影
  const tmdbMovies = await tmdbApi.discoverMovies({
    primary_release_date.gte: `${month}-${day}`,
    primary_release_date.lte: `${month}-${day}`,
    sort_by: 'vote_average.desc',
    'vote_count.gte': 100
  })
  if (tmdbMovies.length > 0) {
    return { tmdbId: tmdbMovies[0].id, type: 'release_date', source: 'tmdb' }
  }

  return null
}

/**
 * 查找TMDB "On This Day" 电影
 */
async findTmdbOnThisDay(dateStr) {
  try {
    // TMDB 有 trending 接口，取今日数据
    const trending = await tmdbApi.getTrendingMovies('day')

    // 检查是否有电影在"今天"有特殊意义
    for (const movie of trending.results.slice(0, 5)) {
      const details = await tmdbApi.getMovieDetails(movie.id)
      // 检查是否是周年纪念（上映 N 周年）
      const releaseDate = details.release_date
      if (releaseDate) {
        const releaseMonthDay = releaseDate.substring(5) // MM-DD
        if (releaseMonthDay === mdKey) {
          const yearsSince = new Date().getFullYear() - parseInt(releaseDate.substring(0, 4))
          if (yearsSince >= 1 && yearsSince % 5 === 0) { // 每5年整数倍
            return {
              tmdbId: movie.id,
              type: 'anniversary',
              anniversary: yearsSince,
              source: 'tmdb'
            }
          }
        }
      }
    }
  } catch (e) {}

  return null
}

/**
 * 获取未看过的推荐（避免重复）
 */
async getUnseenRecommendation(dateStr) {
  const dayOfYear = this.getDayOfYear(dateStr)
  const year = dateStr.split('-')[0]

  // 获取用户已推荐的日期记录
  const shownRecords = storage.getShownDailyRecommendations() || []
  const shownThisYear = shownRecords.filter(r => r.year === year)
  const shownIds = shownThisYear.map(r => r.tmdbId)

  const builtinData = this.getBuiltinData()

  // 按日期索引选择，确保每天的基准电影固定
  let candidate = builtinData.recommendations[dayOfYear % builtinData.recommendations.length]

  // 如果本年度已推荐过，向后跳过
  while (shownIds.includes(candidate.tmdbId) && builtinData.recommendations.length > 1) {
    const nextIndex = (dayOfYear + 1) % builtinData.recommendations.length
    candidate = builtinData.recommendations[nextIndex]
  }

  // 记录本次推荐
  storage.addShownDailyRecommendation({
    date: dateStr,
    tmdbId: candidate.tmdbId,
    year
  })

  return candidate
}
```

**推荐类型丰富化**：

```javascript
// 推荐类型枚举
const RECOMMEND_TYPES = {
  FILM_ANNIVERSARY: 'film_anniversary',       // 电影上映周年
  PERSON_BIRTHDAY: 'person_birthday',         // 影人生日
  AWARD_ANNIVERSARY: 'award_anniversary',     // 获奖纪念日
  HOLIDAY_THEME: 'holiday_theme',             // 节日主题
  TRENDING: 'trending',                       // 热门推荐
  GENRE_THEME: 'genre_theme',                 // 类型主题日
  CRITICS_CHOICE: 'critics_choice',           // 评论家精选
  HIDDEN_GEM: 'hidden_gem'                    // 冷门佳片
}
```

**节日主题映射**：

```javascript
const HOLIDAY_THEMES = {
  '01-01': { theme: '新年', genre: '励志', message: '新的一年，从一部励志电影开始' },
  '02-14': { theme: '情人节', genre: '爱情', message: '浪漫爱情电影推荐' },
  '10-31': { theme: '万圣节', genre: '恐怖', message: '惊悚恐怖电影推荐' },
  '12-25': { theme: '圣诞节', genre: '温馨', message: '温馨节日电影推荐' },
  // ... 更多节日
}
```

**影视史事件数据结构**：

```json
{
  "date": "04-23",
  "events": [
    {
      "type": "film_release",
      "tmdbId": 24428,
      "title": "泰坦尼克号",
      "description": "《泰坦尼克号》1998年4月23日在中国上映",
      "anniversary": 28
    },
    {
      "type": "person_birthday",
      "tmdbId": 1158,
      "personName": "莱昂纳多·迪卡普里奥",
      "description": "莱昂纳多·迪卡普里奥出生于1974年11月11日"
    }
  ]
}
```

---

## 三、数据结构设计

### 3.1 每日推荐完整数据结构

```javascript
/**
 * @typedef {Object} DailyRecommendation
 * @property {string} date - 日期 YYYY-MM-DD
 * @property {number} tmdbId - TMDB 电影 ID
 * @property {string} title - 电影标题
 * @property {string} originalTitle - 原标题
 * @property {string} poster - 海报 URL
 * @property {string} rating - TMDB 评分
 * @property {string} year - 发行年份
 * @property {string} genre - 类型
 * @property {string} summary - 简介
 * @property {string} quote - 经典台词
 * @property {string} quoteFrom - 台词出处角色
 * @property {Object[]} events - 今日影视史事件
 */
```

### 3.2 存储设计

扩展 `utils/storage.js`：

```javascript
const STORAGE_KEYS = {
  DAILY_RECOMMENDATION_CACHE: 'daily_recommendation_cache',
  USER_DAILY_LIKED: 'user_daily_liked'
}
```

---

## 四、UI/UX 设计方案

### 4.1 页面布局

```
┌─────────────────────────────────────┐
│  [周视图]  [月视图]  [今日]         │  ← 三 tab 切换
├─────────────────────────────────────┤
│                                     │
│         每日推荐内容区               │
│                                     │
└─────────────────────────────────────┘
```

### 4.2 今日推荐页面布局

```
┌─────────────────────────────────────┐
│ ⭐ 8.9  |  剧情 / 犯罪  |  1994     │
│         [电影海报 大图]              │
│         (占页面约40%高度)            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│             （浮于海报上）           │
│  《肖申克的救赎》                    │
│  The Shawshank Redemption           │
├─────────────────────────────────────┤
│   （浮于海报上）                     |
|  📅 今日事件                        │
│  "《肖申克》上映30周年"              │
├─────────────────────────────────────┤
│ （浮于海报上）                        |
| 💬 经典台词                         │
│  "Hope is a good thing..."          │
│                    —— Andy Dufresn  │
├─────────────────────────────────────┤
│      [想看]  [已看]  [添加到日历]     │
└─────────────────────────────────────┘
```

### 4.3 设计风格

- **整体风格**：延续现有日历页面的卡片式设计，使用渐变色头部
- **海报展示**：占页面约 40% 高度，圆角卡片，突出视觉
- **信息层级**：评分 > 类型 > 年份 > 标题 > 事件 > 台词 > 操作
- **交互**：
  - 下拉刷新获取新的今日推荐
  - 点击海报/查看详情跳转电影详情页
  - 操作按钮与现有电影状态管理集成（想看/已看）

---

## 五、API 设计（utils/dailyRecommend.js）

```javascript
class DailyRecommendService {
  constructor() {
    this.VERSION_CHECK_URL = 'https://cdn.example.com/daily-recommendations/version.json'
    this.DATA_URL = 'https://cdn.example.com/daily-recommendations/full.json'
    this.LOCAL_VERSION_KEY = 'daily_rec_version'
    this.LOCAL_DATA_KEY = 'daily_rec_data'
  }

  /**
   * 获取今日推荐电影
   * @returns {Promise<DailyRecommendation>}
   */
  async getTodayRecommendation() {
    const today = this.formatDate(new Date())

    // 1. 检查并更新数据
    await this.checkAndUpdateData()

    // 2. 从本地缓存获取
    const localData = this.getLocalData()
    const recommendation = this.findRecommendationByDate(today, localData)

    // 3. 补充 TMDB 详细信息
    return await this.enrichRecommendation(recommendation)
  }

  /**
   * 检查并更新数据
   */
  async checkAndUpdateData() {
    const localVersion = uni.getStorageSync(this.LOCAL_VERSION_KEY) || '0'

    try {
      // 1. 检查远程版本
      const versionInfo = await this.fetchVersionInfo()

      // 2. 如果版本更新，下载新数据
      if (this.isNewerVersion(versionInfo.version, localVersion)) {
        const newData = await this.fetchFullData()
        uni.setStorageSync(this.LOCAL_DATA_KEY, JSON.stringify(newData))
        uni.setStorageSync(this.LOCAL_VERSION_KEY, versionInfo.version)
      }
    } catch (e) {
      // 网络失败时使用本地缓存/内置数据，不影响使用
    }
  }

  /**
   * 获取远程版本信息
   */
  async fetchVersionInfo() {
    const res = await uni.request({ url: this.VERSION_CHECK_URL })
    return res.data
  }

  /**
   * 获取完整数据
   */
  async fetchFullData() {
    const res = await uni.request({ url: this.DATA_URL })
    return res.data
  }

  /**
   * 比较版本号
   */
  isNewerVersion(remote, local) {
    return remote > local
  }

  /**
   * 从内置数据获取
   */
  getBuiltinData() {
    // 返回 static/daily-recommendations.json 的内置数据
  }
}
```

**更新流程图**：

```
应用启动
    ↓
检查远程版本号 (VERSION_CHECK_URL)
    ↓
┌─────────────────────────────┐
│ 远程版本 > 本地版本？         │
├─────────────────────────────┤
│ 是 → 下载完整数据 → 更新本地缓存 │
│ 否 → 使用本地缓存             │
└─────────────────────────────┘
    ↓
获取今日推荐 → 补充TMDB详情 → 展示
```

---

## 六、文件结构

```
pages/calendar/index.vue              ← 修改：新增"今日"tab

static/daily-recommendations.json    ← 新增：365天精选电影数据

utils/dailyRecommend.js              ← 新增：每日推荐服务

components/daily-recommend/
  DailyRecommendCard.vue             ← 新增：今日推荐主卡片组件
```

---

## 七、实现步骤

### Phase 1: 数据基础

1. 创建 `static/daily-recommendations.json` - 365部精选电影数据
2. 创建 `utils/dailyRecommend.js` 服务类

### Phase 2: 组件开发

3. 创建 `components/daily-recommend/DailyRecommendCard.vue`
4. 修改 `pages/calendar/index.vue` - 新增"今日"tab

### Phase 3: 功能融合

5. 实现与现有日历功能的整合（想看/已看/查看详情）
6. 添加下拉刷新功能

### Phase 4: 优化

7. 影视史事件功能（电影上映 anniversary）
8. 加载/错误/空数据处理

---

## 八、关键参考文件

- `pages/calendar/index.vue` - 日历页面主文件，需改造
- `utils/tmdb.js` - TMDB API 封装
- `utils/storage.js` - 本地存储
- `static/douban-top250.json` - 可参考其数据结构

---

## 九、数据维护建议

- `daily-recommendations.json` 建议每月更新一次
- 使用版本号管理，支持增量更新
- 离线时隐藏影视史事件区块