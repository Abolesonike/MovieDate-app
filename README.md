# MovieDate

一款基于 uni-app + Vue 3 开发的跨平台电影记录应用。通过 TMDB 接口获取电影数据，支持观影计划管理、观影数据统计、海报墙生成与分享等功能。

## 功能概览

### 日历
- 支持**今日**，**周**与**月**切换
- 在日历上标记计划观看和已观看的电影
- 点击日期查看当日观影安排
- 每日一部电影日历

### 电影
- **热门电影**：浏览 TMDB 热门电影列表
- **找电影**：按类型、年份、评分等多维度筛选搜索
- **Top250**：查看高分电影排行
- 电影详情页展示海报、评分、简介、演员等信息
- 影人详情页展示演员/导演的作品列表

### 海报墙
- **豆瓣 Top250**：查看豆瓣评分最高的 250 部电影，记录观看进度
- **TMDB Top250**：查看全球评分最高的 250 部电影，记录观看进度
- **时间轴海报**：按时间回顾观影历程，支持选择时间范围（半年/1年/2年/3年），可导出为图片分享
- **个人 TOP10**：自定义个人年度最佳电影榜单，支持搜索添加、排序调整，可生成海报分享
- **30 格喜好海报墙**：自定义个人喜好表，填充 30 部代表不同喜好的电影，可生成海报分享

### 片单
- 创建自定义电影片单
- 支持设置名称、封面、描述和标签，添加电影并追踪观看进度，支持按已看/未看筛选
- 支持片单的导入导出、分享

### 我的
- **数据统计**：想看 / 已看 / 待看 / 日历事件数量统计
- **列表管理**：快速进入各状态电影列表

- **TMDB API 设置**：配置 API Key 与代理地址（国内网络建议配置代理）
- **数据导入导出**：支持 JSON 格式的本地备份与恢复
- **云同步**：支持 WebDAV 等云端同步方式

## 技术栈

- [uni-app](https://uniapp.dcloud.net.cn/) - 跨平台应用框架
- [Vue 3](https://vuejs.org/) - 前端框架
- [TMDB API](https://developers.themoviedb.org/3) - 电影数据源
- [uView UI](https://uviewui.com/) - UI 组件库

## 项目结构

```
MovieDate-app/
├── pages/                          # 页面
│   ├── calendar/                   # 日历页（周视图/月视图）
│   ├── movie/                      # 电影相关
│   │   ├── index                   # 电影浏览页（热门/找电影）
│   │   ├── detail                  # 电影详情页
│   │   ├── person                  # 影人详情页
│   │   └── picker                  # 电影选择器
│   ├── tops/                       # 榜单
│   │   ├── douban                  # 豆瓣 Top250
│   │   ├── tmdb                    # TMDB Top250
│   │   └── personal                # 个人 Top10
│   ├── poster/                     # 海报墙入口
│   ├── generate/                   # 海报生成
│   │   ├── favorite                # 30 格喜好海报墙
│   │   └── timeline                # 时间轴海报
│   ├── lists/                      # 影单列表
│   │   ├── want                    # 想看列表
│   │   ├── watched                 # 已看列表
│   │   └── planned                 # 待看列表
│   ├── playlist/                   # 自定义片单
│   │   ├── index                   # 片单列表
│   │   ├── detail                  # 片单详情
│   │   └── edit                    # 片单编辑
│   └── me/                         # 我的/设置页
├── utils/                          # 工具类
│   ├── tmdb.js                     # TMDB API 封装
│   ├── storage.js                  # 本地存储管理
│   ├── posterShare.js              # 海报 Canvas 生成
│   ├── doubanMapping.js            # 豆瓣 Top250 数据映射
│   ├── cloudSync.js                # 云同步逻辑
│   ├── dailyRecommend.js           # 每日推荐
│   ├── theme.js                    # 主题管理
│   └── permissions.js              # 权限管理
├── components/                     # 公共组件
│   └── movie-card/                 # 电影卡片组件
│       ├── movie-card-horizontal   # 横向卡片
│       ├── movie-card-compact      # 紧凑卡片
│       ├── movie-card-vertical     # 纵向小卡片
│       └── shared.js               # 共享逻辑
├── static/                         # 静态资源
├── App.vue                         # 应用入口
├── main.js                         # 主脚本
├── manifest.json                   # 应用配置
└── pages.json                      # 页面路由配置
```

## 快速开始

### 环境要求
- [HBuilderX](https://www.dcloud.io/hbuilderx.html)（推荐）或 VS Code + uni-app 插件
- Node.js（如使用 CLI 方式）

### 运行项目

**方式一：HBuilderX（推荐）**
1. 使用 HBuilderX 打开本项目
2. 点击菜单栏 **运行** → 选择目标平台（浏览器、微信小程序模拟器、手机基座等）

**方式二：CLI**
```bash
# 安装依赖
npm install

# 运行到 H5
npm run dev:h5

# 运行到微信小程序
npm run dev:mp-weixin
```

### 配置 TMDB API Key

首次使用需要在 **我的 → TMDB API 设置** 中配置 API Key：

1. 前往 [TMDB 官网](https://www.themoviedb.org/settings/api) 注册并获取 API Key
2. 将 API Key 填入应用设置中
3. （可选）国内用户建议配置 API 代理地址以提高访问稳定性

## 数据存储

应用采用纯本地存储方案，所有数据保存在设备本地：

| 存储项 | 说明 |
|--------|------|
| 电影状态 | 每部电影的观看状态（想看/已看/待看）及时间线 |
| 日历事件 | 与观影计划关联的日历数据 |
| 个人 Top10 | 用户自定义的 Top10 电影榜单及排序 |
| 喜好海报墙 | 30 格个人喜好表的电影填充数据 |
| 片单 | 自定义片单的名称、描述、标签及电影列表 |
| 用户设置 | API Key、代理地址等配置 |
| 云同步配置 | WebDAV 等同步服务的连接信息 |

支持通过 **我的** 页面进行数据的导出（JSON 备份）和导入恢复。

## 平台支持

- App（Android / iOS）
- 微信小程序
- H5

## 截图

> TODO: 添加应用截图

## License

MIT
