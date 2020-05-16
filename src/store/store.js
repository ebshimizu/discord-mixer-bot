const Vue = require('Vue/dist/vue.common');
const Vuex = require('Vuex');

Vue.use(Vuex);

module.exports = new Vuex.Store({
  state: {
    count: 0
  }
});