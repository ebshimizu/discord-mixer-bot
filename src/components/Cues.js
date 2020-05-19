const { ACTION } = require('../store/actions');

const template = `
<div id="cues">
  <div class="title">Cues</div>
  <div class="cues">
    <el-tree
      :data="cueTree"
      node-key="id"
      :default-expanded-keys="expandedKeys"
      :render-content="renderCue"
      v-on:node-expand="nodeExpand"
      v-on:node-collapse="nodeCollapse"
      :props="defaultProps">
    </el-tree>
  </div>

  <el-dialog title="Edit Cue" :visible.sync="editCueVisible">
    <el-form :model="cueForm">
      <el-form-item label="Category" :label-width="labelWidth">
        <el-input v-model="cueForm.category"></el-input>
      </el-form-item>
      <el-form-item label="Name" :label-width="labelWidth">
        <el-input v-model="cueForm.name"></el-input>
      </el-form-item>
      <el-form-item label="Fade Time" :label-width="labelWidth">
        <el-input v-model="cueForm.fade"></el-input>
      </el-form-item>
    </el-form>
    <span slot="footer" class="dialog-footer">
      <el-button @click="editCueVisible = false">Cancel</el-button>
      <el-button type="primary" @click="editCue">Save</el-button>
    </span>
  </el-dialog>
</div>
`;

module.exports = {
  id: 'cues',
  component: {
    template,
    data() {
      return {
        cueForm: {
          category: '',
          name: '',
          fade: '',
        },
        editCueVisible: false,
        editCueId: '',
        labelWidth: '100px',
        defaultProps: {
          children: 'children',
          label: 'label',
        },
        expandedKeys: [],
      };
    },
    computed: {
      cueTree() {
        // collect by category
        const cues = this.$store.state.cues;
        const categories = {};
        for (const id in cues) {
          const cue = cues[id];
          if (!(cue.category in categories)) {
            categories[cue.category] = [];
          }

          categories[cue.category].push({ cue, id });
        }

        // format into element array
        return Object.keys(categories).map((name) => {
          return {
            label: name,
            id: name,
            children: categories[name].map((cue) => {
              return { label: cue.cue.name, id: cue.id };
            }),
          };
        });
      },
    },
    methods: {
      nodeExpand(node) {
        if (this.expandedKeys.indexOf(node.id) === -1)
          this.expandedKeys.push(node.id);
      },
      nodeCollapse(node, data, tree) {
        if (this.expandedKeys.indexOf(node.id) > -1)
          this.expandedKeys.splice(this.expandedKeys.indexOf(node.id), 1);
      },
      cueInfo(id) {
        console.log(id);
        if (id in this.$store.state.cues) {
          const cue = this.$store.state.cues[id];
          console.log(cue);
          this.$alert(
            `<p>
              <strong>Category</strong>: ${cue.category}<br/>
              <strong>Fade Time</strong>: ${cue.fadeTime}s<br />
              <strong>Sources</strong>: ${cue.sources
                .map(
                  (src) =>
                    `Volume: ${(src.volume * 100).toFixed(1)} [${src.type}] ${
                      src.locator
                    }`
                )
                .join(',')}
            </p>`,
            cue.name,
            { confirmButtonText: 'OK', dangerouslyUseHTMLString: true }
          );
        }
      },
      showEditCue(id) {
        const cue = this.$store.state.cues[id];
        this.editCueId = id;

        this.cueForm.name = cue.name;
        this.cueForm.category = cue.category;
        this.cueForm.fade = cue.fadeTime;

        this.editCueVisible = true;
      },
      editCue() {
        // ok received from dialog
        // get the cue from the store the shove it back after updating the object
        const cue = this.$store.state.cues[this.editCueId];
        cue.name = this.cueForm.name;
        cue.category = this.cueForm.category;
        cue.fadeTime =
          this.cueForm.fade === '' ? null : parseFloat(this.cueForm.fadeTime);

        this.$store.dispatch(ACTION.REPLACE_CUE, { id: this.editCueId, cue });
        this.editCueVisible = false;
      },
      stageCue(id) {
        this.$store.dispatch(ACTION.STAGE_CUE, this.$store.state.cues[id]);
      },
      deleteCue(id) {
        const cue = this.$store.state.cues[id];
        this.$alert(
          `Are you sure you want to delete ${cue.name}?`,
          'Confirm Delete',
          {
            confirmButtonText: 'Delete',
            callback: (action) => {
              if (action === 'confirm') {
                this.$store.dispatch(ACTION.DELETE_CUE, id);
              }
            },
          }
        );
      },
      updateFromStaging(id) {
        const cue = this.$store.state.cues[id];
        this.$alert(
          `Replace the sources in ${cue.name} with the ones currently in Staging.`,
          'Confirm Update from Staging',
          {
            confirmButtonText: 'Update',
            callback: (action) => {
              if (action === 'confirm') {
                cue.sources = this.$store.state.audio.staged.map((src) => {
                  return {
                    type: src.type,
                    locator: src.locator,
                    loop: src.loop,
                    volume: src.volume,
                    name: src.name,
                  };
                });
                this.$store.dispatch(ACTION.REPLACE_CUE, { id, cue });
              }
            },
          }
        );
      },
      updateFromLive(id) {
        const cue = this.$store.state.cues[id];
        this.$alert(
          `Replace the sources in ${cue.name} with the ones currently in Live.`,
          'Confirm Update from Live',
          {
            confirmButtonText: 'Update',
            callback: (action) => {
              if (action === 'confirm') {
                cue.sources = this.$store.state.audio.live.map((src) => {
                  return {
                    type: src.type,
                    locator: src.locator,
                    loop: src.loop,
                    volume: src.volume,
                    name: src.name,
                  };
                });
                this.$store.dispatch(ACTION.REPLACE_CUE, { id, cue });
              }
            },
          }
        );
      },
      renderCue(h, { node, data, store }) {
        // since i'm not using JSX, this will be somewhat painful
        const self = this;
        const label = [h('div', {}, [node.label])];
        const leafButtons = [
          h(
            'el-dropdown',
            {
              props: {
                trigger: 'click',
                size: 'mini',
                placement: 'bottom-start',
              },
            },
            [
              h('div', { class: 'cue-dropdown' }, [node.label]),
              h('el-dropdown-menu', { props: { slot: 'dropdown' } }, [
                h(
                  'el-dropdown-item',
                  { nativeOn: { click: () => self.showEditCue(data.id) } },
                  ['Edit']
                ),
                h(
                  'el-dropdown-item',
                  {
                    nativeOn: { click: () => self.updateFromStaging(data.id) },
                  },
                  ['Update from Staging']
                ),
                h(
                  'el-dropdown-item',
                  { nativeOn: { click: () => self.updateFromLive(data.id) } },
                  ['Update from Live']
                ),
                h('el-dropdown-item', {}, ['Preload']),
                h('el-dropdown-item', {}, ['Unload']),
                h(
                  'el-dropdown-item',
                  { nativeOn: { click: () => self.cueInfo(data.id) } },
                  ['Info']
                ),
                h(
                  'el-dropdown-item',
                  {
                    class: 'danger',
                    nativeOn: { click: () => self.deleteCue(data.id) },
                  },
                  ['Delete']
                ),
              ]),
            ]
          ),
          h(
            'el-button',
            {
              props: {
                size: 'mini',
                icon: 'el-icon-d-arrow-right',
                type: 'primary',
              },
              nativeOn: { click: () => this.stageCue(data.id) },
            },
            []
          ),
        ];

        return h(
          'div',
          {
            class: {
              'cue-item': true,
              header: data.children,
              leaf: !data.children,
            },
          },
          data.children ? label : leafButtons
        );
      },
    },
  },
};