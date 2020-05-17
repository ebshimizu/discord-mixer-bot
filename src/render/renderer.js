const Vue = require('vue/dist/vue.common');
const Vuex = require('Vuex');
const fs = require('fs-extra');
const ElementUI = require('element-ui');
const { ACTION } = require('../store/actions');

Vue.use(ElementUI);
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
  data: {
    message: 'Testing Vue',
  },
  computed: {
    discordStatus: function () {
      return this.$store.state.discord.ready;
    },
    count: function () {
      return this.$store.state.count;
    }
  },
  methods: {
    discord() {
      this.$store.dispatch(
        ACTION.DISCORD_LOGIN,
        'NzA5MDY0NDIxMDcwMzQwMTg3.Xrgd8A.V8VUWKouifEK0DGjXLEKzwGsk6o'
      );
    },
    inc() {
      this.$store.dispatch('inc');
      console.log(this.$store.state.count);
    }
  },
});
