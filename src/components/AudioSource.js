const { ACTION } = require('../store/actions');

const template = `
<div class="audio-source" :class="[statusClass]">
  <div class="controls">
    <div class="status">{{ source.status }}</div>
    <div class="name">{{ source.name }}</div>
    <div class="blue tiny-button" :class="{ active: source.loop }" @click="toggleLoop"><i class="el-icon-refresh"></i></div>
    <div class="red tiny-button" @click="remove"><i class="el-icon-close"></i></div>
  </div>
  <div class="volume-control">
    <el-slider
      v-model="volume"
      :min="0"
      :max="100"
      :step="0.1"
      :show-tooltip="true"
      show-input>
    </el-slider>
  </div>
</div>
`
module.exports = {
  id: 'audio-source',
  component: {
    template,
    props: ['source'],
    computed: {
      volume: {
        get: function() {
          return this.source.volume * 100;
        },
        set: function(newVal) {
          this.$store.dispatch(ACTION.AUDIO_SRC_SET_VOLUME, { 
            id: this.source.id,
            volume: newVal / 100
          });
        }
      },
      statusClass() {
        return this.source.status
      }
    },
    methods: {
      toggleLoop() {
        this.$store.dispatch(ACTION.AUDIO_SRC_SET_LOOP, {
          id: this.source.id,
          loop: !this.source.loop
        });
      },
      remove() {
        this.$store.dispatch(ACTION.AUDIO_SRC_REMOVE, this.source.id);
      }
    }
  }
}