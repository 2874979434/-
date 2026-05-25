Page({
  data: {
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    weeklyStats: [],
    loading: true
  },

  onShow() {
    wx.setTabBarItem({
      index: 1,
      selected: true
    })
  },

  onLoad() {
    this.loadStatistics();
  },

  onPullDownRefresh() {
    this.loadStatistics();
  },

  async loadStatistics() {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 获取请假申请统计
      const { total: totalApplications } = await db.collection('leave_applications').count();
      const { total: pendingApplications } = await db.collection('leave_applications')
        .where({
          status: 'pending'
        })
        .count();
      const { total: approvedApplications } = await db.collection('leave_applications')
        .where({
          status: 'approved'
        })
        .count();
      const { total: rejectedApplications } = await db.collection('leave_applications')
        .where({
          status: 'rejected'
        })
        .count();

      // 获取最近一周的统计数据
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const weeklyData = await db.collection('leave_applications')
        .where({
          createTime: _.gte(oneWeekAgo)
        })
        .orderBy('createTime', 'asc')
        .get();

      // 按日期分组统计
      const weeklyStats = this.groupByDate(weeklyData.data);

      this.setData({
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        weeklyStats,
        loading: false
      });

      wx.stopPullDownRefresh();

    } catch (error) {
      console.error('加载统计数据失败：', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  groupByDate(applications) {
    const stats = {};
    applications.forEach(app => {
      const date = new Date(app.createTime).toLocaleDateString();
      if (!stats[date]) {
        stats[date] = {
          date,
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0
        };
      }
      stats[date].total++;
      stats[date][app.status]++;
    });
    return Object.values(stats);
  }
}); 