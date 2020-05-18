const { dialog } = require('electron').remote
const { ACTION } = require('../store/actions');

const template = `
<div id="staging">
  <div class="title">Staging</div>
  <div class="sources">
    <p>No Sources</p>
  </div>
  <div class="stage-buttons">
    <el-button
      type="success"
      icon="el-icon-plus"
      @click="browseSource">
      Add Source
     </el-button>
  </div>
</div>
`

module.exports = {
  id: 'staging',
  component: {
    template,
    methods: {
      browseSource: function () {
        dialog.showOpenDialog({
          title: 'Open Audio File',
          filters: [
            { name: 'Audio', extensions: ['mp3', 'wav', 'ogg' ]},
            { name: 'All Files', extensions: ['*']}
          ]
        }).then(result => {
          if (!result.canceled) {
            // load the file
            this.$store.dispatch(ACTION.AUDIO_STAGE_FILE, result.filePaths[0]);
          }
        }).catch(err => {
          console.log(err);
        })
      }
    }
  }
}