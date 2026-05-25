Page({
  data: {
    id: '',
    password: '',
    type: 'student',
    isInitializing: false
  },

  // 输入学号/工号
  inputId(e) {
    this.setData({
      id: e.detail.value
    });
  },

  // 输入密码
  inputPassword(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 切换身份
  switchType() {
    this.setData({
      type: this.data.type === 'student' ? 'teacher' : 'student'
    });
  },

  // 登录
  async handleLogin() {
    try {
      const { id, password, type } = this.data;

      if (!id || !password) {
        throw new Error('请输入账号和密码');
      }

      wx.showLoading({
        title: '登录中...'
      });

      const db = wx.cloud.database();
      let userInfo;

      if (type === 'student') {
        const { data } = await db.collection('students')
          .where({
            studentId: id,
            password: password
          })
          .get();

        if (data && data.length > 0) {
          userInfo = data[0];
          wx.setStorageSync('userInfo', userInfo);
          wx.setStorageSync('userType', 'student');
          
          wx.navigateTo({
            url: '/pages/student/leave/leave'
          });
        } else {
          throw new Error('账号或密码错误');
        }
      } else {
        const { data } = await db.collection('teachers')
          .where({
            teacherId: id,
            password: password
          })
          .get();

        if (data && data.length > 0) {
          userInfo = data[0];
          wx.setStorageSync('userInfo', userInfo);
          wx.setStorageSync('userType', 'teacher');
          
          wx.navigateTo({
            url: '/pages/teacher/approval/approval'
          });
        } else {
          throw new Error('账号或密码错误');
        }
      }

      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      });
    }
  }
}); 