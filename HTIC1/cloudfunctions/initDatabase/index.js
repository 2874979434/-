// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 1. 创建系部
    const departmentResult = await db.collection('departments').add({
      data: {
        departmentId: 'CS001',
        name: '计算机系',
        createTime: new Date()
      }
    })

    // 2. 创建教师
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
    ]

    const teacherResults = await Promise.all(
      teachersData.map(teacher => db.collection('teachers').add({ data: teacher }))
    )

    // 3. 创建班级
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
    ]

    const classResults = await Promise.all(
      classesData.map(classItem => db.collection('classes').add({ data: classItem }))
    )

    // 4. 更新系部数据
    await db.collection('departments').doc(departmentResult._id).update({
      data: {
        secretaryId: teacherResults[1]._id,
        headId: teacherResults[2]._id
      }
    })

    // 5. 更新班主任数据
    await db.collection('teachers').doc(teacherResults[0]._id).update({
      data: {
        classIds: classResults.map(result => result._id)
      }
    })

    // 6. 创建学生
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
    ]

    await Promise.all(
      studentsData.map(student => db.collection('students').add({ data: student }))
    )

    return {
      success: true,
      message: '初始化成功'
    }

  } catch (error) {
    console.error(error)
    return {
      success: false,
      error: error
    }
  }
} 