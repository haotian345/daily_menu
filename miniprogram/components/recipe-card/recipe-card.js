Component({
  properties: {
    recipe: {
      type: Object,
      value: {}
    },
    matchRate: {
      type: Number,
      value: 0
    }
  },

  methods: {
    onTap() {
      const { id } = this.properties.recipe
      if (id) {
        this.triggerEvent('tap', { id })
      }
    }
  }
})
