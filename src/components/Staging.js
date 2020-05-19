const { dialog } = require('electron').remote;
const { ACTION } = require('../store/actions');

const template = `
<div id="staging">
  <div class="title">Staging</div>
  <div class="sources">
    <audio-source
      v-for="source in sources"
      v-bind:source="source"
      v-bind:key="source.id">
    </audio-source>
  </div>
  <div class="stage-buttons">
    <el-button
      type="success"
      icon="el-icon-plus"
      @click="browseSource">
      Add Source
    </el-button>
    <el-button
      type="primary"
      @click="showAddCue">
      New Cue
    </el-button>
  </div>

  <el-dialog title="New Cue from Staging" :visible.sync="addCueVisible">
    <el-form :model="addCueForm">
      <el-form-item label="Category" :label-width="labelWidth">
        <el-input v-model="addCueForm.category"></el-input>
      </el-form-item>
      <el-form-item label="Name" :label-width="labelWidth">
        <el-input v-model="addCueForm.name"></el-input>
      </el-form-item>
      <el-form-item label="Fade Time" :label-width="labelWidth">
        <el-input v-model="addCueForm.fade"></el-input>
      </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button @click="addCueVisible = false">Cancel</el-button>
      <el-button type="primary" @click="addCue">Add</el-button>
    </span>
  </el-dialog>
</div>
`;

module.exports = {
  id: 'staging',
  component: {
    template,
    data() {
      return {
        addCueVisible: false,
        addCueForm: {
          category: '',
          name: '',
          fade: '5',
        },
        labelWidth: '100px',
      };
    },
    computed: {
      sources() {
        return this.$store.state.audio.staged;
      },
    },
    methods: {
      browseSource: function () {
        dialog
          .showOpenDialog({
            title: 'Open Audio File',
            filters: [
              { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac'] },
              { name: 'All Files', extensions: ['*'] },
            ],
          })
          .then((result) => {
            if (!result.canceled) {
              // load the file
              this.$store.dispatch(
                ACTION.AUDIO_STAGE_FILE,
                result.filePaths[0]
              );
            }
          })
          .catch((err) => {
            console.log(err);
          });
      },
      showAddCue() {
        this.addCueVisible = true;
        // preserve fade and category name
        this.addCueForm.name = '';
      },
      addCue() {
        this.addCueVisible = false;
        // compile sources
        const sources = this.$store.state.audio.staged.map((src) => {
          return {
            type: src.type,
            locator: src.locator,
            loop: src.loop,
            volume: src.volume,
            name: src.name,
          };
        });

        this.$store.dispatch(ACTION.ADD_CUE, {
          name: this.addCueForm.name,
          category: this.addCueForm.category,
          sources,
          fadeTime:
            this.addCueForm.fade === '' ? 5 : parseFloat(this.addCueForm.fade),
        });
      },
    },
  },
};
