Page({
  data: {
    userInfo: null,
    leaveRecords: []
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.redirectTo({
        url: '/pages/login/login'
      })
      return
    }
    this.setData({ userInfo })
    this.loadLeaveRecords()
  },

  onShow() {
    this.loadLeaveRecords()
    wx.setTabBarItem({
      index: 1,
      selected: true
    })
  },

  // 加载请假记录
  async loadLeaveRecords() {
    try {
      const userInfo = this.data.userInfo
      const db = wx.cloud.database()

      // 获取该学生的所有请假申请
      const { data: records } = await db.collection('leave_applications')
        .where({
          studentId: userInfo.studentId
        })
        .orderBy('createTime', 'desc')
        .get()

      // 格式化时间显示
      records.forEach(record => {
        record.createTime = new Date(record.createTime).toLocaleString()
        record.startTime = new Date(record.startTime).toLocaleString()
        record.endTime = new Date(record.endTime).toLocaleString()
      })

      this.setData({ leaveRecords: records })

    } catch (error) {
      console.error('加载请假记录失败：', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 查看详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset
    const record = this.data.leaveRecords.find(r => r._id === id)
    
    if (!record) {
      wx.showToast({
        title: '记录不存在',
        icon: 'error'
      })
      return
    }

    wx.showModal({
      title: '请假详情',
      content: `请假类型：${record.type}
请假天数：${record.days}天
开始时间：${record.startTime}
结束时间：${record.endTime}
请假理由：${record.reason}
申请时间：${record.createTime}
审批教师：${record.teacherName}
审批状态：${record.status === 'pending' ? '待审批' : record.status === 'approved' ? '已通过' : '已拒绝'}`,
      showCancel: false
    })
  }
}) 