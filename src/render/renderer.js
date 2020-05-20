const Vue = require('vue/dist/vue.common');
const Vuex = require('Vuex');
const fs = require('fs-extra');
const ElementUI = require('element-ui');
const locale = require('element-ui/lib/locale/lang/en');
const { getVersion } = require('electron').remote.app;
const dialog = require('electron').remote.dialog;

const { ACTION } = require('../store/actions');

Vue.use(ElementUI, { locale });
Vue.use(Vuex);

const store = new Vuex.Store(require('../store/store'));

// load modules
const moduleFiles = fs
  .readdirSync('./src/components')
  .filter((file) => file.endsWith('.js'));

for (const file of moduleFiles) {
  // todo: file paths for compiled version will be weird,
  // unless we just... don't do ASAR because idgaf
  const module = require(`../components/${file}`);
  Vue.component(module.id, module.component);
}

const app = new Vue({
  el: '#app',
  store,
  data: {},
  computed: {
    version() {
      return getVersion();
    },
    messages() {
      return this.$store.state.messageQueue;
    },
  },
  watch: {
    messages(queue) {
      for (const msg of queue) {
        this.$notify(msg);
        console.log(msg);
      }
      this.$store.dispatch(ACTION.DRAIN_MESSAGE_QUEUE);
    },
  },
  methods: {
    handleMainMenu(key, keyPath) {
      console.log(`Option selected: ${key}`);
      if (key === 'export-cues') this.exportCues();
      else if (key === 'import-cues') this.importCues(false);
      else if (key === 'append-cues') this.importCues(true);
    },
    exportCues() {
      dialog
        .showSaveDialog({
          title: 'Save Cues',
          filters: [{ name: 'cues (json)', extensions: ['cues'] }],
        })
        .then((result) => {
          if (!result.canceled) {
            fs.writeFile(
              result.filePath,
              JSON.stringify(this.$store.state.cues, null, 2)
            );
          }
        });
    },
    importCues(append) {
      dialog
        .showOpenDialog({
          title: 'Import Cues',
          filters: [{ name: 'cues (json)', extensions: ['cues'] }],
        })
        .then((result) => {
          if (!result.canceled) {
            this.$store.dispatch(ACTION.AUDIO_IMPORT_CUES, {
              file: result.filePaths[0],
              append,
            });
          }
        });
    },
  },
});
