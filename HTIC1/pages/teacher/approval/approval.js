Page({
  data: {
    userInfo: null,
    activeTab: 0,
    pendingApplications: [],
    approvedApplications: []
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
    this.loadLeaveApplications()
  },

  onShow() {
    this.loadLeaveApplications()
    wx.setTabBarItem({
      index: 0,
      selected: true
    })
  },

  // 加载请假申请列表
  async loadLeaveApplications() {
    try {
      console.log('开始加载请假申请')
      const userInfo = this.data.userInfo
      console.log('当前教师信息：', userInfo)

      const db = wx.cloud.database()
      const _ = db.command

      // 从云数据库获取请假申请
      const { data: allApplications } = await db.collection('leave_applications')
        .where({
          'approvalFlow': _.elemMatch({
            teacherId: userInfo._id
          })
        })
        .orderBy('createTime', 'desc')
        .get()

      console.log('所有请假申请：', allApplications)

      if (!Array.isArray(allApplications)) {
        console.error('请假申请数据格式错误')
        return
      }

      // 筛选待审批和已审批的申请
      const pendingApplications = []
      const approvedApplications = []

      allApplications.forEach(application => {
        // 检查申请数据的完整性
        if (!this.validateApplication(application)) {
          console.error('无效的申请数据：', application)
          return
        }

        // 查找当前教师在审批流程中的位置
        const teacherIndex = application.approvalFlow.findIndex(
          approver => approver.teacherId === userInfo.teacherId
        )

        if (teacherIndex === -1) {
          return // 不是该教师需要审批的申请
        }

        // 检查是否轮到当前教师审批
        const isPending = application.currentApprovalIndex === teacherIndex &&
                         application.status === 'pending' &&
                         application.approvalFlow[teacherIndex].status === 'pending'

        // 检查该教师是否已审批过
        const hasProcessed = application.approvalFlow[teacherIndex].status === 'approved' ||
                           application.approvalFlow[teacherIndex].status === 'rejected'

        if (isPending) {
          pendingApplications.push(application)
        } else if (hasProcessed) {
          approvedApplications.push(application)
        }
      })

      console.log('待审批申请：', pendingApplications)
      console.log('已审批申请：', approvedApplications)

      this.setData({
        pendingApplications,
        approvedApplications
      })
    } catch (error) {
      console.error('加载请假申请时出错：', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 验证申请数据的完整性
  validateApplication(application) {
    if (!application) return false

    const requiredFields = [
      'studentId',
      'studentName',
      'className',
      'type',
      'startTime',
      'endTime',
      'days',
      'reason',
      'status',
      'createTime',
      'approvalFlow',
      'currentApprovalIndex'
    ]

    // 检查必需字段
    for (const field of requiredFields) {
      if (application[field] === undefined) {
        console.error(`申请数据缺少必需字段: ${field}`)
        return false
      }
    }

    // 检查审批流程
    if (!Array.isArray(application.approvalFlow) || application.approvalFlow.length === 0) {
      console.error('申请数据缺少有效的审批流程')
      return false
    }

    // 检查每个审批人的数据完整性
    for (const approver of application.approvalFlow) {
      if (!approver.teacherId || !approver.teacherName || !approver.title || !approver.status) {
        console.error('审批人数据不完整:', approver)
        return false
      }
    }

    return true
  },

  // 切换标签页
  switchTab(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({
      activeTab: index
    })
  },

  // 处理请假申请
  async handleApplication(e) {
    try {
      const { applicationId, action } = e.currentTarget.dataset
      const userInfo = this.data.userInfo

      const db = wx.cloud.database()
      
      // 从云数据库获取请假申请
      const { data: [application] } = await db.collection('leave_applications')
        .where({
          _id: applicationId
        })
        .get()
      
      if (!application) {
        throw new Error('找不到对应的请假申请')
      }
      
      // 验证申请数据
      if (!this.validateApplication(application)) {
        throw new Error('请假申请数据无效')
      }

      // 更新审批状态
      const approverIndex = application.approvalFlow.findIndex(
        approver => approver.teacherId === userInfo.teacherId
      )

      if (approverIndex === -1) {
        throw new Error('当前教师不在审批流程中')
      }

      // 检查是否可以审批
      if (approverIndex !== application.currentApprovalIndex) {
        throw new Error('当前不是您的审批轮次')
      }

      if (application.approvalFlow[approverIndex].status !== 'pending') {
        throw new Error('该申请已经被处理过')
      }

      // 如果是拒绝操作，需要填写拒绝理由
      let rejectReason = ''
      if (action === 'rejected') {
        try {
          const result = await new Promise((resolve, reject) => {
            wx.showModal({
              title: '请填写拒绝理由',
              editable: true,
              placeholderText: '请输入拒绝原因（必填）',
              success: (res) => {
                if (res.confirm) {
                  if (!res.content || res.content.trim() === '') {
                    reject(new Error('请填写拒绝理由'))
                  } else {
                    resolve(res.content.trim())
                  }
                } else {
                  reject(new Error('已取消'))
                }
              },
              fail: () => reject(new Error('操作失败'))
            })
          })
          rejectReason = result
        } catch (error) {
          throw error
        }
      }

      // 更新当前审批人的状态
      application.approvalFlow[approverIndex].status = action
      application.approvalFlow[approverIndex].approvalTime = new Date().toLocaleString()
      
      if (action === 'rejected') {
        // 如果拒绝，整个申请状态变为rejected
        application.status = 'rejected'
        application.approvalFlow[approverIndex].rejectReason = rejectReason
      } else if (action === 'approved') {
        if (approverIndex === application.approvalFlow.length - 1) {
          // 如果是最后一个审批人，整个申请状态变为approved
          application.status = 'approved'
        } else {
          // 否则移至下一个审批人
          application.currentApprovalIndex = approverIndex + 1
          application.approvalFlow[approverIndex + 1].status = 'pending'
        }
      }

      // 更新云数据库中的申请
      await db.collection('leave_applications').doc(applicationId).update({
        data: {
          status: application.status,
          approvalFlow: application.approvalFlow,
          currentApprovalIndex: application.currentApprovalIndex
        }
      })

      // 重新加载申请列表
      this.loadLeaveApplications()

      wx.showToast({
        title: action === 'approved' ? '已通过' : '已拒绝',
        icon: 'success'
      })
    } catch (error) {
      console.error('处理请假申请时出错：', error)
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'error'
      })
    }
  },

  // 查看详情
  viewDetail(e) {
    try {
      const { id } = e.currentTarget.dataset
      const application = [...this.data.pendingApplications, ...this.data.approvedApplications]
        .find(app => app._id === id)
      
      if (!application) {
        throw new Error('找不到请假申请详情')
      }

      // 生成审批流程信息
      const approvalInfo = application.approvalFlow
        .map((flow, index) => {
          const status = flow.status === 'pending' ? '待审批' :
                        flow.status === 'waiting' ? '等待中' :
                        flow.status === 'approved' ? '已批准' : '已拒绝'
          const currentMark = index === application.currentApprovalIndex ? '(当前)' : ''
          const rejectReason = flow.status === 'rejected' && flow.rejectReason ? 
                              `\n拒绝理由：${flow.rejectReason}` : ''
          return `${flow.title}${currentMark}：${status}${flow.approvalTime ? ` (${flow.approvalTime})` : ''}${rejectReason}`
        })
        .join('\n')

      const startTime = new Date(application.startTime)
      const endTime = new Date(application.endTime)
      const createTime = new Date(application.createTime)

      wx.showModal({
        title: '请假详情',
        content: `学号：${application.studentId}
姓名：${application.studentName}
班级：${application.className}
类型：${application.type}
天数：${application.days}天
开始时间：${startTime.toLocaleString()}
结束时间：${endTime.toLocaleString()}
请假原因：${application.reason}
申请时间：${createTime.toLocaleString()}
当前状态：${application.status === 'pending' ? '审批中' : 
           application.status === 'approved' ? '已通过' : '已拒绝'}

审批流程：
${approvalInfo}`,
        showCancel: false
      })
    } catch (error) {
      console.error('查看详情时出错：', error)
      wx.showToast({
        title: error.message || '获取详情失败',
        icon: 'error'
      })
    }
  }
}) 