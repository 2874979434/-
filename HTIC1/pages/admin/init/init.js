Page({
  data: {
    isInitializing: false,
    logs: []
  },

  addLog(message) {
    this.setData({
      logs: [...this.data.logs, message]
    });
  },

  async initDatabase() {
    if (this.data.isInitializing) {
      return;
    }

    this.setData({
      isInitializing: true,
      logs: []
    });

    const db = wx.cloud.database();
    
    try {
      this.addLog('开始初始化数据库...');

      // 1. 创建系部数据
      this.addLog('正在创建系部数据...');
      const departmentResult = await db.collection('departments').add({
        data: {
          departmentId: 'CS001',
          name: '计算机系',
          createTime: new Date()
        }
      });
      this.addLog('系部数据创建成功');

      // 2. 创建教师数据
      this.addLog('正在创建教师数据...');
      const teachersData = [
        {
          teacherId: '1019830619017',
          name: '张老师',
          password: '123456',
          role: '班主任',
          title: '班主任',
          createTime: new Date()
        },
        {
          teacherId: '1019830619018',
          name: '李老师',
          password: '123456',
          role: '系书记',
          title: '系书记',
          createTime: new Date()
        },
        {
          teacherId: '1019830619019',
          name: '王老师',
          password: '123456',
          role: '系主任',
          title: '系主任',
          createTime: new Date()
        }
      ];

      const teacherResults = await Promise.all(
        teachersData.map(teacher => db.collection('teachers').add({ data: teacher }))
      );
      this.addLog('教师数据创建成功');

      // 3. 创建班级数据
      this.addLog('正在创建班级数据...');
      const classesData = [
        {
          classId: 'CS2021-1',
          name: '2021计算机1班',
          headTeacherId: teacherResults[0]._id,
          departmentId: departmentResult._id,
          createTime: new Date()
        },
        {
          classId: 'CS2021-2',
          name: '2021计算机2班',
          headTeacherId: teacherResults[0]._id,
          departmentId: departmentResult._id,
          createTime: new Date()
        }
      ];

      const classResults = await Promise.all(
        classesData.map(classItem => db.collection('classes').add({ data: classItem }))
      );
      this.addLog('班级数据创建成功');

      // 4. 更新系部数据
      this.addLog('正在更新系部数据...');
      await db.collection('departments').doc(departmentResult._id).update({
        data: {
          secretaryId: teacherResults[1]._id,
          headId: teacherResults[2]._id
        }
      });
      this.addLog('系部数据更新成功');

      // 5. 更新班主任数据
      this.addLog('正在更新班主任数据...');
      await db.collection('teachers').doc(teacherResults[0]._id).update({
        data: {
          classIds: classResults.map(result => result._id)
        }
      });
      this.addLog('班主任数据更新成功');

      // 6. 创建学生数据
      this.addLog('正在创建学生数据...');
      const studentsData = [
        {
          studentId: '202101001',
          name: '张三',
          password: '123456',
          classId: classResults[0]._id,
          createTime: new Date()
        },
        {
          studentId: '202101002',
          name: '李四',
          password: '123456',
          classId: classResults[0]._id,
          createTime: new Date()
        },
        {
          studentId: '202101003',
          name: '王五',
          password: '123456',
          classId: classResults[1]._id,
          createTime: new Date()
        }
      ];

      await Promise.all(
        studentsData.map(student => db.collection('students').add({ data: student }))
      );
      this.addLog('学生数据创建成功');

      this.addLog('数据库初始化完成！');
      
      wx.showToast({
        title: '初始化成功',
        icon: 'success'
      });

    } catch (error) {
      console.error('初始化数据库失败：', error);
      this.addLog(`初始化失败：${error.message}`);
      
      wx.showToast({
        title: '初始化失败',
        icon: 'error'
      });
    } finally {
      this.setData({
        isInitializing: false
      });
    }
  }
}); 