/**
 * 权限管理工具类
 */

export default {
  /**
   * 检查并请求存储权限
   * @returns {Promise<boolean>} 是否有权限
   */
  async requestStoragePermissions() {
    return new Promise((resolve) => {
      // 直接尝试写入测试权限
      const testKey = 'permission_test_' + Date.now()
      try {
        uni.setStorageSync('__permission_test__', testKey)
        uni.removeStorageSync('__permission_test__')
        console.log('存储权限检查成功')
        resolve(true)
      } catch (error) {
        console.error('存储权限检查失败:', error)
        // 显示引导用户手动开启权限
        this.showPermissionGuide()
        resolve(false)
      }
    })
  },

  /**
   * 显示权限引导
   */
  showPermissionGuide() {
    uni.showModal({
      title: '需要存储权限',
      content: '应用需要存储权限来保存您的设置，请在设置中手动开启权限',
      confirmText: '去设置',
      confirmColor: '#1989fa',
      success: (res) => {
        if (res.confirm) {
          // 跳转到应用设置页面
          uni.openSetting()
        }
      }
    })
  },

  /**
   * 检查当前权限状态
   * @returns {Promise<{write: boolean, read: boolean}>}
   */
  async checkPermissions() {
    return new Promise((resolve) => {
      try {
        // 测试权限
        const testKey = 'permission_test_' + Date.now()
        uni.setStorageSync('__permission_test__', testKey)
        uni.removeStorageSync('__permission_test__')
        resolve({
          write: true,
          read: true
        })
      } catch (error) {
        resolve({
          write: false,
          read: false
        })
      }
    })
  },

  /**
   * 兼容性权限检查（用于旧版本）
   * @returns {boolean}
   */
  checkPermissionsSync() {
    try {
      // 尝试一个简单的写入操作
      uni.setStorageSync('__sync_test__', 'test')
      uni.removeStorageSync('__sync_test__')
      return true
    } catch (error) {
      return false
    }
  }
}