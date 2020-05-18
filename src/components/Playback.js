const { ACTION } = require('../store/actions');

const template = `
<div class="playback">
  <div class="pb-staging">
    <staging></staging>
  </div>
  <div class="center-controls">
    <el-button type="primary" @click="fade(5)">
      Fade 5s <i class="el-icon-arrow-right"></i>
    </el-button>
  </div>
  <div class="pb-live">
    <live></live>
  </div>
  <div class="master">

  </div>
</div>
`

module.exports = {
  id: 'playback',
  component: {
    template,
    methods: {
      fade(time) {
        this.$store.dispatch(ACTION.AUDIO_MOVE_TO_LIVE, { time });
      }
    }
  }
}