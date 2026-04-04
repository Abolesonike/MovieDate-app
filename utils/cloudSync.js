/**
 * 云同步适配器 - 预留接口
 * 未来可扩展不同云服务商的实现
 */

/**
 * 云同步适配器基类
 */
class CloudSyncAdapter {
  constructor(config) {
    this.config = config
  }

  /**
   * 上传数据到云端
   * @param {Object} data
   * @returns {Promise}
   */
  async upload(data) {
    throw new Error('Method not implemented: upload')
  }

  /**
   * 从云端下载数据
   * @returns {Promise<Object>}
   */
  async download() {
    throw new Error('Method not implemented: download')
  }

  /**
   * 检查连接状态
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    throw new Error('Method not implemented: checkConnection')
  }
}

/**
 * Firebase 适配器（示例实现）
 */
class FirebaseAdapter extends CloudSyncAdapter {
  async upload(data) {
    // TODO: 实现 Firebase 上传逻辑
    // 示例:
    // const db = getFirestore()
    // await setDoc(doc(db, 'users', this.config.userId), data)
    console.log('[FirebaseAdapter] upload called')
    return { success: true }
  }

  async download() {
    // TODO: 实现 Firebase 下载逻辑
    // 示例:
    // const db = getFirestore()
    // const docSnap = await getDoc(doc(db, 'users', this.config.userId))
    // return docSnap.data()
    console.log('[FirebaseAdapter] download called')
    return { success: true, data: null }
  }

  async checkConnection() {
    // TODO: 实现 Firebase 连接检查
    return true
  }
}

/**
 * Supabase 适配器（示例实现）
 */
class SupabaseAdapter extends CloudSyncAdapter {
  async upload(data) {
    // TODO: 实现 Supabase 上传逻辑
    console.log('[SupabaseAdapter] upload called')
    return { success: true }
  }

  async download() {
    // TODO: 实现 Supabase 下载逻辑
    console.log('[SupabaseAdapter] download called')
    return { success: true, data: null }
  }

  async checkConnection() {
    return true
  }
}

/**
 * 自定义服务器适配器
 */
class CustomServerAdapter extends CloudSyncAdapter {
  async upload(data) {
    try {
      const res = await uni.request({
        url: `${this.config.apiUrl}/sync/upload`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        data
      })
      return res.data
    } catch (err) {
      console.error('[CustomServerAdapter] upload error:', err)
      throw err
    }
  }

  async download() {
    try {
      const res = await uni.request({
        url: `${this.config.apiUrl}/sync/download`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${this.config.token}`
        }
      })
      return res.data
    } catch (err) {
      console.error('[CustomServerAdapter] download error:', err)
      throw err
    }
  }

  async checkConnection() {
    try {
      await uni.request({
        url: `${this.config.apiUrl}/health`,
        method: 'GET'
      })
      return true
    } catch (err) {
      return false
    }
  }
}

/**
 * 云服务商类型枚举
 */
export const CLOUD_PROVIDERS = {
  FIREBASE: 'firebase',
  SUPABASE: 'supabase',
  CUSTOM: 'custom'
}

/**
 * 创建云同步适配器
 * @param {Object} config - { provider, apiUrl, token, userId }
 * @returns {CloudSyncAdapter}
 */
export function createCloudAdapter(config) {
  switch (config.provider) {
    case CLOUD_PROVIDERS.FIREBASE:
      return new FirebaseAdapter(config)
    case CLOUD_PROVIDERS.SUPABASE:
      return new SupabaseAdapter(config)
    case CLOUD_PROVIDERS.CUSTOM:
    default:
      return new CustomServerAdapter(config)
  }
}

/**
 * 云同步管理器
 */
class CloudSyncManager {
  constructor() {
    this.adapter = null
  }

  /**
   * 初始化云同步
   * @param {Object} config
   */
  init(config) {
    this.adapter = createCloudAdapter(config)
    return this.adapter.checkConnection()
  }

  /**
   * 同步数据到云端
   * @param {Object} data
   */
  async syncToCloud(data) {
    if (!this.adapter) {
      throw new Error('云同步未初始化，请先调用 init 方法')
    }
    return this.adapter.upload(data)
  }

  /**
   * 从云端同步数据
   */
  async syncFromCloud() {
    if (!this.adapter) {
      throw new Error('云同步未初始化，请先调用 init 方法')
    }
    return this.adapter.download()
  }

  /**
   * 检查连接状态
   */
  async checkConnection() {
    if (!this.adapter) {
      return false
    }
    return this.adapter.checkConnection()
  }
}

// 导出单例
export default new CloudSyncManager()
