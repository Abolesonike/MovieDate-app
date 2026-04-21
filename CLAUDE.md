# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供该代码仓库的工作指引。

## 项目概述

MovieDate 是一款基于 **uni-app + Vue 3** 的跨平台电影记录应用。通过 TMDB API 获取电影数据，提供观影日历、海报墙、个人 Top10、30 格喜好海报墙等功能。支持 App（Android/iOS）、微信小程序、H5。

## 高层架构

### 状态管理

**没有使用 Pinia/Vuex。** 所有状态通过 `utils/` 下的两个单例模块管理：

- **`utils/tmdb.js`** — TMDB API 封装。管理 API Key、代理配置、类型映射（中文 ↔ TMDB ID），所有 HTTP 请求通过 `uni.request` 发出。API Key 在应用内 **我的 → TMDB API 设置** 中配置。
- **`utils/storage.js`** — `StorageManager` 单例。所有本地数据均通过此处使用 `uni.getStorageSync`/`uni.setStorageSync` 读写。管理电影状态、日历事件、个人 Top10、喜好海报墙、用户设置，并支持 JSON 导入导出备份与恢复。

页面直接导入这两个模块并调用其方法。没有全局响应式 Store，页面通常在 `onLoad`/`onShow` 中加载数据，各自维护组件级状态。

### 数据流

```
页面 (Vue SFC) → utils/tmdb.js → TMDB API（外部接口）
               → utils/storage.js → uni.setStorageSync（本地存储）
               → utils/posterShare.js → Canvas → JPEG 导出图片
```

### 核心模块

| 模块 | 说明 |
|------|------|
| `utils/tmdb.js` | 所有 TMDB 接口调用。支持代理配置（国内网络）。将中文类型名映射为 TMDB ID。 |
| `utils/storage.js` | 本地存储统一入口。存储键：`movie_status`、`calendar_events`、`user_settings`、`personal_top10`、`favorite_grid`。电影状态枚举 `MOVIE_STATUS`：`unwatched`（未看）、`want`（想看）、`planned`（待看）、`watched`（已看）。 |
| `utils/posterShare.js` | 基于 Canvas 的 JPEG 图片生成器，用于海报墙、时间轴、Top10、喜好海报墙的分享图。 |
| `utils/doubanMapping.js` | 豆瓣 Top250 排名与 TMDB ID 的映射，数据源为 `static/douban-top250.json`。 |
| `utils/cloudSync.js` | 云同步适配器模式（Firebase、Supabase、自定义服务器），目前多为占位/TODO 实现。 |
| `components/movie-card/` | 电影卡片组件。三种变体拆为独立文件：`movie-card-horizontal`（横向卡片）、`movie-card-compact`（紧凑卡片）、`movie-card-vertical`（纵向小卡片）。共享逻辑在 `shared.js` 中。 |

### 页面结构

路由与 tabBar 定义在 `pages.json` 中。四个底部 Tab 页面：

- `pages/calendar/index` — 周视图/月视图日历
- `pages/movie/index` — 电影浏览（热门/找电影/Top250）
- `pages/poster/index` — 海报墙入口，包含各类榜单入口
- `pages/me/index` — 设置、统计、数据导入导出

其他重要页面：

- `pages/movie/detail/index` — 电影详情与状态操作
- `pages/movie/person/index` — 影人详情
- `pages/movie/picker/index` — 电影选择器
- `pages/tops/personal/index` — 自定义 Top10，支持拖拽排序
- `pages/tops/douban/index` — 豆瓣 Top250
- `pages/tops/tmdb/index` — TMDB Top250
- `pages/lists/want/index` — 想看列表
- `pages/lists/watched/index` — 已看列表
- `pages/lists/planned/index` — 待看列表
- `pages/generate/favorite/index` — 30 格可自定义海报墙
- `pages/generate/timeline/index` — 按时间范围筛选的观影历程海报

页面业务层级
+- pages/calendar/index
+- pages/movie/index
+- pages/poster/index
|  +- pages/tops/tmdb/index
|  +- pages/tops/douban/index
|  +- pages/poster/timeline/index
|  +- pages/poster/personal/index
|  +- pages/generate/favorite/index
|  \- pages/generate/timeline/index
+- pages/me/index
|  +- pages/lists/want/index
|  +- pages/lists/watched/index
|  \- pages/lists/planned/index

pages/movie/* 可从各个页面跳转进入。


### 样式

- UI 组件库使用 `uview-ui`（^2.0.38）。
- 页面内使用 scoped CSS，SCSS 变量通过 `uni.scss` 全局可用。
- 未使用 Tailwind、Vant 或其他 CSS 框架。

## pages 目录组织规范

- **按业务域分组**：Tab 页面放在顶层目录；子页面归入对应业务域子目录。当前业务域：`movie`（电影详情/影人/选择器）、`tops`（榜单）、`lists`（影单）、`generate`（海报生成）。
- **统一入口命名**：每个页面目录统一使用 `index.vue`，禁止 `dir-name/dir-name.vue` 式冗余命名。
- **路径语义化**：路径应表达页面所属域与功能，如 `pages/movie/detail/index`（电影域-详情功能）。
- **新增页面流程**：新增页面前先确认所属业务域；若开新域，在 `pages/` 下新建目录并写入本规范说明。
