// components/half-rate-star/half-rate-star.js
Component({
  properties: {
    // 评分值，如 4.5
    value: {
      type: Number,
      value: 0,
      observer: function(newVal) {
        // 当value变化时，重新计算星星显示
        this.calculateStars(newVal)
      }
    },
    // 星星大小（单位：rpx）
    size: {
      type: Number,
      value: 32
    },
    // 星星颜色
    color: {
      type: String,
      value: '#ffd700'
    },
    // 是否显示评分数值
    showScore: {
      type: Boolean,
      value: false
    },
    // 是否只读
    readonly: {
      type: Boolean,
      value: true
    }
  },

  data: {
    starsArray: []  // 星星数据数组
  },

  lifetimes: {
    attached() {
      // 组件挂载时计算星星
      this.calculateStars(this.properties.value)
    }
  },

  methods: {
    // 计算星星显示数据
    calculateStars(value) {
      const starsArray = []
      
      for (let i = 0; i < 5; i++) {
        const starValue = value - i
        let fillWidth = 0
        let isHalf = false
        
        if (starValue >= 1) {
          fillWidth = 100  // 全星
        } else if (starValue > 0) {
          fillWidth = starValue * 100  // 部分星
          isHalf = starValue < 1 && starValue > 0  // 标记为半星
        } else {
          fillWidth = 0  // 无星
        }
        
        starsArray.push({
          index: i,
          fillWidth: fillWidth,
          isHalf: isHalf
        })
      }
      
      this.setData({ starsArray })
    },
    
    // 点击星星评分（如果非只读）
    onStarTap(e) {
      if (this.properties.readonly) return
      
      const index = e.currentTarget.dataset.index + 1  // 1-5
      this.triggerEvent('change', { value: index })
    }
  }
})