const { dialog } = require('electron').remote;
const { ACTION } = require('../store/actions');

const template = `
<div id="live">
  <div class="title">Live</div>
  <div class="sources">
    <audio-source
      v-for="source in sources"
      v-bind:source="source"
      v-bind:key="source.id">
    </audio-source>
  </div>
  <div class="live-buttons">
    <el-button
      type="primary"
      :disabled="locked"
      @click="showAddCue">
      New Cue
    </el-button>
  </div>

  <el-dialog title="New Cue from Live" :visible.sync="addCueVisible">
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
  id: 'live',
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
      };
    },
    computed: {
      locked() {
        return this.$store.state.locked;
      },
      sources() {
        return this.$store.state.audio.live;
      },
    },
    methods: {
      showAddCue() {
        this.addCueVisible = true;
        // preserve fade and category name
        this.addCueForm.name = '';
      },
      addCue() {
        this.addCueVisible = false;
        // compile sources
        const sources = this.sources.map((src) => {
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
