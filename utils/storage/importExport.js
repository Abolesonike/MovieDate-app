import { formatDate } from './utils.js'
import { getAllMovieStatus } from './movieStatus.js'
import { getAllCalendarEvents } from './calendar.js'
import { getPersonalTop10 } from './personalTop10.js'
import { _saveMovieStatus } from './movieStatus.js'
import { _saveCalendarEvents as _saveCalendarEventsRaw } from './calendar.js'
import { _savePersonalTop10 } from './personalTop10.js'

export function exportAllData() {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      movieStatus: getAllMovieStatus(),
      calendarEvents: getAllCalendarEvents(),
      personalTop10: getPersonalTop10()
    }
  }
}

export function exportToFile() {
  const data = exportAllData()
  const jsonStr = JSON.stringify(data, null, 2)

  // #ifdef H5
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `moviedate_backup_${formatDate(new Date())}.json`
  a.click()
  URL.revokeObjectURL(url)
  return Promise.resolve({ success: true })
  // #endif

  // #ifndef H5
  return new Promise((resolve, reject) => {
    const fs = uni.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/moviedate_backup_${Date.now()}.json`

    fs.writeFile({
      filePath,
      data: jsonStr,
      encoding: 'utf8',
      success: () => {
        uni.showModal({
          title: '导出成功',
          content: `数据已保存到: ${filePath}`,
          showCancel: false
        })
        resolve({ success: true, filePath })
      },
      fail: (err) => {
        console.error('导出失败:', err)
        reject(err)
      }
    })
  })
  // #endif
}

export function importData(inputData) {
  try {
    const data = typeof inputData === 'string'
      ? JSON.parse(inputData)
      : inputData

    if (!data.version || !data.data) {
      throw new Error('无效的数据格式')
    }

    const movieStatus = data.data.movieStatus || {}
    const calendarEvents = data.data.calendarEvents || {}
    const personalTop10 = data.data.personalTop10 || []

    const mergedStatus = { ...getAllMovieStatus(), ...movieStatus }
    const mergedEvents = { ...getAllCalendarEvents(), ...calendarEvents }

    _saveMovieStatus(mergedStatus)
    _saveCalendarEventsRaw(mergedEvents)
    _savePersonalTop10(personalTop10)

    return {
      success: true,
      imported: {
        movieCount: Object.keys(movieStatus).length,
        eventDates: Object.keys(calendarEvents).length,
        top10Count: personalTop10.length
      }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export function importFromFile() {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) {
        reject(new Error('未选择文件'))
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        resolve(importData(event.target.result))
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsText(file)
    }
    input.click()
    // #endif

    // #ifdef MP-WEIXIN
    uni.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (res) => {
        const fs = uni.getFileSystemManager()
        fs.readFile({
          filePath: res.tempFiles[0].path,
          encoding: 'utf8',
          success: (data) => {
            resolve(importData(data.data))
          },
          fail: reject
        })
      },
      fail: reject
    })
    // #endif

    // #ifdef APP-PLUS
    plus.io.chooseFile({
      accept: '.json',
      success: (res) => {
        plus.io.resolveLocalFileSystemURL(res.filePath, (entry) => {
          entry.file((file) => {
            const reader = new plus.io.FileReader()
            reader.onload = (e) => {
              resolve(importData(e.target.result))
            }
            reader.onerror = reject
            reader.readAsText(file)
          })
        }, reject)
      },
      fail: reject
    })
    // #endif
  })
}
