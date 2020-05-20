const { dialog } = require('electron').remote;
const { ACTION } = require('../store/actions');
const ytdl = require('ytdl-core');

// borrowed right out of
// https://github.com/amishshah/ytdl-core-discord/blob/master/index.js
function filter(format) {
  return (
    format.codecs === 'opus' &&
    format.container === 'webm' &&
    format.audioSampleRate == 48000
  );
}

function nextBestFormat(formats) {
  formats = formats
    .filter((format) => format.audioBitrate)
    .sort((a, b) => b.audioBitrate - a.audioBitrate);
  return formats.find((format) => !format.bitrate) || formats[0];
}

const template = `
<div
  id="staging"
  :class="{ dragging }"
  v-on:drop="handleDrop"
  v-on:dragover.stop.prevent="dragging = true"
  v-on:dragleave.stop.prevent="dragging = false"
>
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
      :disabled="locked"
      icon="el-icon-document"
      @click="browseSource">
      File
    </el-button>
    <el-button
      type="success"
      :disabled="locked"
      icon="el-icon-download"
      @click="getLink">
      YouTube
    </el-button>
    <el-button
      type="primary"
      :disabled="locked"
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
          fade: '',
        },
        labelWidth: '100px',
        dragging: false
      };
    },
    computed: {
      locked() {
        return this.$store.state.locked;
      },
      sources() {
        return this.$store.state.audio.staged;
      },
    },
    methods: {
      handleDrop(evt) {
        this.dragging = false;

        for (const file of evt.dataTransfer.files) {
          this.$store.dispatch(ACTION.AUDIO_STAGE_FILE, file.path);
        }
      },
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
      getLink() {
        // borrowing a lot from ytdl-core-discord
        this.$prompt('Enter a link to a YouTube Video.', 'YouTube Source', {
          confirmButtonText: 'OK',
          cancelButtonText: 'Cancel',
        })
          .then((value) => {
            if (value.action === 'confirm') {
              ytdl.getInfo(value.value, (err, info) => {
                if (err) {
                  // show an error
                  console.log(err);
                }

                const url = nextBestFormat(info.formats).url;
                this.$store.dispatch(ACTION.AUDIO_STAGE_YOUTUBE, {
                  url,
                  title: `[YouTube] ${info.title}`,
                });
              });
            }
          })
          .catch(() => {
            // error stuff
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
            this.addCueForm.fade === ''
              ? null
              : parseFloat(this.addCueForm.fade),
        });
      },
    },
  },
};
