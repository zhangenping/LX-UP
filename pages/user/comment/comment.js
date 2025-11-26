// pages/user/comment/comment.js
Page({
  data: {
    course: {},
    rating: 5,
    comment: '',
    isAnonymous: false,
    tags: [
      { name: '耐心细致', selected: false },
      { name: '讲解清晰', selected: false },
      { name: '经验丰富', selected: false },
      { name: '课程实用', selected: false },
      { name: '互动性好', selected: false },
      { name: '收获很大', selected: false }
    ],
    selectedTags: []
  },

  onLoad(options) {
    const subscription = JSON.parse(decodeURIComponent(options.subscription));
    this.setData({ 
      course: subscription 
    });
    this.checkCommentStatus();
  },

  // 返回上一页
  onNavigateBack() {
    wx.navigateBack();
  },

  // 检查是否已评论
  async checkCommentStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const db = wx.cloud.database();
      
      const res = await db.collection('comments')
        .where({
          courseId: this.data.course.courseId,
          studentId: userInfo._openid
        })
        .get();
      
      if (res.data.length > 0) {
        const existingComment = res.data[0];
        this.setData({
          rating: existingComment.rating,
          comment: existingComment.content,
          isAnonymous: existingComment.isAnonymous,
          selectedTags: existingComment.tags || []
        });
        console.log('加载已有评论:', existingComment);
      }
    } catch (error) {
      console.error('检查评论状态失败:', error);
    }
  },

  // 设置评分
  setRating(e) {
    const rating = parseInt(e.currentTarget.dataset.rating);
    this.setData({ rating });
    console.log('设置评分:', rating);
  },

  // 切换标签
  toggleTag(e) {
    const tagName = e.currentTarget.dataset.tag;
    console.log('点击标签:', tagName);
    
    const tags = this.data.tags.map(tag => {
      if (tag.name === tagName) {
        return { ...tag, selected: !tag.selected };
      }
      return tag;
    });
    
    // 更新选中标签数组
    const selectedTags = tags.filter(tag => tag.selected).map(tag => tag.name);
    
    // 检查是否超过3个
    if (selectedTags.length > 3) {
      wx.showToast({
        title: '最多选择3个标签',
        icon: 'none'
      });
      return;
    }
    
    console.log('更新后的标签:', tags);
    console.log('选中标签:', selectedTags);
    
    this.setData({ 
      tags: tags,
      selectedTags: selectedTags
    });
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({ comment: e.detail.value });
  },

  // 匿名切换
  onAnonymousChange(e) {
    this.setData({ isAnonymous: e.detail.value });
  },

  // 提交评论
  async submitComment() {
    const { rating, comment, selectedTags, isAnonymous, course } = this.data;
    
    console.log('提交评论数据:', {
      rating,
      comment,
      selectedTags,
      isAnonymous,
      course
    });
    
    if (!comment.trim()) {
      wx.showToast({
        title: '请填写评价内容',
        icon: 'none'
      });
      return;
    }

    if (comment.trim().length < 10) {
      wx.showToast({
        title: '评价内容至少10个字',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    try {
      const userInfo = wx.getStorageSync('userInfo');
      const db = wx.cloud.database();
      
      // 检查是否已评论
      const existingRes = await db.collection('comments')
        .where({
          courseId: course.courseId,
          studentId: userInfo._openid
        })
        .get();

      const commentData = {
        courseId: course.courseId,
        courseName: course.courseName,
        teacherId: course.teacherId,
        teacherName: course.teacherName,
        studentId: userInfo._openid,
        studentName: isAnonymous ? '匿名用户' : (userInfo.nickName || '微信用户'),
        studentAvatar: isAnonymous ? '' : (userInfo.avatarUrl || ''),
        rating: rating,
        content: comment.trim(),
        tags: selectedTags,
        isAnonymous: isAnonymous,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (existingRes.data.length > 0) {
        // 更新现有评论
        await db.collection('comments').doc(existingRes.data[0]._id).update({
          data: commentData
        });
      } else {
        // 新增评论
        await db.collection('comments').add({
          data: commentData
        });
      }

      // 更新课程平均评分
      await this.updateCourseRating(course.courseId);

      wx.hideLoading();
      wx.showToast({
        title: existingRes.data.length > 0 ? '评价已更新' : '评价成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      console.error('提交评论失败:', error);
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
    }
  },

  // 更新课程平均评分
  async updateCourseRating(courseId) {
    try {
      const db = wx.cloud.database();
      const _ = db.command;
      
      const commentsRes = await db.collection('comments')
        .where({ courseId: courseId })
        .get();
      
      if (commentsRes.data.length > 0) {
        const totalRating = commentsRes.data.reduce((sum, comment) => sum + comment.rating, 0);
        const averageRating = (totalRating / commentsRes.data.length).toFixed(1);
        
        await db.collection('courses').doc(courseId).update({
          data: {
            rating: parseFloat(averageRating),
            commentCount: _.inc(1)
          }
        });
      }
    } catch (error) {
      console.error('更新课程评分失败:', error);
    }
  }
});