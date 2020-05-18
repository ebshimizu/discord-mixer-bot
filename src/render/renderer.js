const Vue = require('vue/dist/vue.common');
const Vuex = require('Vuex');
const fs = require('fs-extra');
const ElementUI = require('element-ui');
const locale = require('element-ui/lib/locale/lang/en');
const { getVersion } = require('electron').remote.app;

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
    }
  },
  methods: {
    handleMainMenu(key, keyPath) {
      console.log(`Option selected: ${key}`);
    }
  },
});
