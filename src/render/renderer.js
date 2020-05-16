const Vue = require('vue/dist/vue.common');
const Vuex = require('Vuex');
const store = require('../store/store');
const fs = require('fs-extra');
const ElementUI = require('element-ui');

Vue.use(Vuex);
Vue.use(ElementUI);

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
  store: store,
  data: {
    message: 'Testing Vue',
  },
  computed: {
    count() {
      return this.$store.state.count;
    },
  },
});
