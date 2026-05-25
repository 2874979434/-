Page({
  data: {
    userInfo: null,
    teacherInfo: null,
    leaveTypes: ['事假', '病假', '其他'],
    selectedType: '事假',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    reason: '',
    days: 0
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
    this.loadTeacherInfo()
  },

  onShow() {
    wx.setTabBarItem({
      index: 0,
      selected: true
    })
  },

  // 加载班主任信息
  async loadTeacherInfo() {
    try {
      const db = wx.cloud.database()
      const userInfo = this.data.userInfo

      // 获取班级信息
      const { data: classInfo } = await db.collection('classes')
        .where({
          _id: userInfo.classId
        })
        .get()

      if (!classInfo || classInfo.length === 0) {
        throw new Error('未找到班级信息')
      }

      // 获取班主任信息
      const { data: teacherInfo } = await db.collection('teachers')
        .where({
          _id: classInfo[0].headTeacherId
        })
        .get()

      if (!teacherInfo || teacherInfo.length === 0) {
        throw new Error('未找到班主任信息')
      }

      this.setData({
        teacherInfo: teacherInfo[0]
      })

    } catch (error) {
      console.error('加载班主任信息失败：', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 选择请假类型
  bindTypeChange(e) {
    this.setData({
      selectedType: this.data.leaveTypes[e.detail.value]
    })
  },

  // 选择开始日期
  bindStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    })
    this.calculateDays()
  },

  // 选择开始时间
  bindStartTimeChange(e) {
    this.setData({
      startTime: e.detail.value
    })
  },

  // 选择结束日期
  bindEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    })
    this.calculateDays()
  },

  // 选择结束时间
  bindEndTimeChange(e) {
    this.setData({
      endTime: e.detail.value
    })
  },

  // 计算请假天数
  calculateDays() {
    const { startDate, endDate } = this.data
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
      
      if (days < 1) {
        wx.showToast({
          title: '结束日期不能早于开始日期',
          icon: 'none'
        })
        this.setData({ endDate: startDate })
        return
      }
      
      this.setData({ days })
    }
  },

  // 输入请假理由
  inputReason(e) {
    this.setData({
      reason: e.detail.value
    })
  },

  // 提交请假申请
  async submitLeave() {
    try {
      const { userInfo, teacherInfo, selectedType, startDate, startTime, endDate, endTime, reason, days } = this.data

      // 表单验证
      if (!startDate || !startTime || !endDate || !endTime) {
        throw new Error('请选择请假时间')
      }
      if (!reason.trim()) {
        throw new Error('请输入请假理由')
      }

      wx.showLoading({
        title: '提交中...'
      })

      const db = wx.cloud.database()

      // 创建请假申请
      const startDateTime = new Date(startDate + ' ' + startTime)
      const endDateTime = new Date(endDate + ' ' + endTime)

      await db.collection('leave_applications').add({
        data: {
          studentId: userInfo.studentId,
          studentName: userInfo.name,
          classId: userInfo.classId,
          className: userInfo.className,
          type: selectedType,
          startTime: startDateTime,
          endTime: endDateTime,
          days,
          reason,
          status: 'pending',
          createTime: new Date(),
          teacherId: teacherInfo._id,
          teacherName: teacherInfo.name
        }
      })

      wx.hideLoading()
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      })

      // 重置表单
      this.setData({
        selectedType: '事假',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        reason: '',
        days: 0
      })

    } catch (error) {
      console.error('提交失败：', error)
      wx.hideLoading()
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      })
    }
  },

  // 导航到请假记录页面
  goToRecords() {
    wx.navigateTo({
      url: '/pages/student/records/records'
    })
  }
}) 