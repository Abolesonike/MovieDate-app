/**
 * 豆瓣Top250映射数据更新脚本
 * 用于批量查询和补充TMDB ID映射
 *
 * 使用方法:
 * 1. 安装依赖: npm install axios
 * 2. 设置TMDB API Key: export TMDB_API_KEY=your_key_here
 * 3. 运行: node scripts/update-douban-mapping.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 配置
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const MAPPING_FILE = path.join(__dirname, '../static/douban-top250.json');

// 待补充的电影列表（豆瓣Top 51-250）
// 格式: { doubanRank, doubanId, title, year, doubanRating }
const PENDING_MOVIES = [
  // 你可以从豆瓣Top250页面获取这些数据
  // 示例:
  // { doubanRank: 51, doubanId: "1292278", title: "电影名", year: "2000", doubanRating: "8.5" },
];

/**
 * 从TMDB搜索电影
 */
async function searchMovie(title, year) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        query: title,
        year: year,
        language: 'zh-CN'
      }
    });

    const results = response.data.results;
    if (results && results.length > 0) {
      // 返回第一个匹配结果
      return results[0];
    }
    return null;
  } catch (error) {
    console.error(`搜索失败: ${title}`, error.message);
    return null;
  }
}

/**
 * 获取电影详情（包括IMDb ID）
 */
async function getMovieDetails(tmdbId) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'zh-CN'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`获取详情失败: ${tmdbId}`, error.message);
    return null;
  }
}

/**
 * 加载现有映射数据
 */
function loadExistingData() {
  try {
    const content = fs.readFileSync(MAPPING_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('读取映射文件失败:', error.message);
    return { version: '1.0.0', updateTime: new Date().toISOString().split('T')[0], movies: [] };
  }
}

/**
 * 保存映射数据
 */
function saveData(data) {
  try {
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log('✅ 数据已保存到:', MAPPING_FILE);
  } catch (error) {
    console.error('保存失败:', error.message);
  }
}

/**
 * 批量处理待补充的电影
 */
async function batchProcess() {
  if (!TMDB_API_KEY) {
    console.error('❌ 请设置 TMDB_API_KEY 环境变量');
    console.log('示例: export TMDB_API_KEY=your_api_key_here');
    process.exit(1);
  }

  console.log('🎬 开始更新豆瓣Top250映射数据...\n');

  const data = loadExistingData();
  const existingIds = new Set(data.movies.map(m => m.doubanId));

  for (const movie of PENDING_MOVIES) {
    // 跳过已存在的
    if (existingIds.has(movie.doubanId)) {
      console.log(`⏭️  已存在: ${movie.title}`);
      continue;
    }

    console.log(`🔍 搜索: ${movie.title} (${movie.year})`);

    // 搜索电影
    const searchResult = await searchMovie(movie.originalTitle || movie.title, movie.year);

    if (searchResult) {
      // 获取详细信息
      const details = await getMovieDetails(searchResult.id);

      if (details) {
        const mappedMovie = {
          doubanRank: movie.doubanRank,
          doubanId: movie.doubanId,
          tmdbId: details.id,
          imdbId: details.imdb_id || '',
          title: movie.title,
          originalTitle: details.original_title || movie.title,
          year: movie.year,
          doubanRating: movie.doubanRating
        };

        data.movies.push(mappedMovie);
        console.log(`✅ 找到: ${movie.title} -> TMDB ID: ${details.id}\n`);

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 350));
      }
    } else {
      console.log(`❌ 未找到: ${movie.title}\n`);
    }
  }

  // 按排名排序
  data.movies.sort((a, b) => a.doubanRank - b.doubanRank);
  data.total = data.movies.length;
  data.updateTime = new Date().toISOString().split('T')[0];

  saveData(data);

  console.log(`\n📊 完成！当前共有 ${data.movies.length}/250 部电影`);
}

/**
 * 单个查询工具
 */
async function querySingle(title, year) {
  if (!TMDB_API_KEY) {
    console.error('❌ 请设置 TMDB_API_KEY 环境变量');
    return;
  }

  console.log(`🔍 搜索: ${title} (${year})\n`);

  const result = await searchMovie(title, year);

  if (result) {
    const details = await getMovieDetails(result.id);
    console.log('✅ 找到电影:');
    console.log('  TMDB ID:', result.id);
    console.log('  标题:', result.title);
    console.log('  原标题:', result.original_title);
    console.log('  年份:', result.release_date?.split('-')[0]);
    console.log('  IMDb ID:', details?.imdb_id || 'N/A');
    console.log('  评分:', result.vote_average);
  } else {
    console.log('❌ 未找到电影');
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args[0] === 'query') {
    // 单个查询模式: node update-douban-mapping.js query "电影名" 2000
    const title = args[1];
    const year = args[2];
    if (!title) {
      console.log('用法: node update-douban-mapping.js query "电影名" [年份]');
      return;
    }
    await querySingle(title, year);
  } else {
    // 批量处理模式
    await batchProcess();
  }
}

main().catch(console.error);
