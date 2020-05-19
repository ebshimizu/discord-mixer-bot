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
    <el-button type="primary" @click="customFade">
      Fade {{ fadeTime }}s <i class="el-icon-arrow-right"></i>
    </el-button>
    <el-input-number v-model="fadeTime" :min="0" :step="0.1" size="mini"></el-input-number>
  </div>
  <div class="pb-live">
    <live></live>
  </div>
  <div class="master">
    <div class="title">Master</div>
    <div class="fader">
      <el-slider
        v-model="masterVolume"
        :min="0"
        :max="100"
        vertical>
      </el-slider>
    </div>
  </div>
</div>
`;

module.exports = {
  id: 'playback',
  component: {
    template,
    computed: {
      masterVolume: {
        get: function () {
          return this.$store.state.audio.masterVolume * 100;
        },
        set: function (newVal) {
          this.$store.dispatch(ACTION.AUDIO_SET_MASTER_VOLUME, newVal / 100);
        },
      },
      fadeTime: {
        get: function () {
          return this.$store.state.customFadeTime;
        },
        set: function (newVal) {
          this.$store.dispatch(ACTION.SET_CUSTOM_FADE_TIME, newVal);
        }
      }
    },
    methods: {
      fade(time) {
        this.$store.dispatch(ACTION.AUDIO_MOVE_TO_LIVE, { time });
      },
      customFade() {
        this.fade(this.fadeTime);
      }
    },
  },
};
