const {
  createPersistedState,
  createSharedMutations,
} = require('vuex-electron');
const { ACTION, MUTATION } = require('./actions');

// references to external apis n stuff
let discordManager, audioEngine;

module.exports = {
  plugins: [createSharedMutations()],
  state: {
    count: 0,
    discord: {
      ready: false,
    },
  },
  getters: {
    count: (state) => state.count
  },
  mutations: {
    [MUTATION.DISCORD_SET_READY](state, ready) {
      state.discord.ready = ready;
    },
    inc(state) {
      state.count += 1;
    }
  },
  actions: {
    [ACTION.INIT_STATE](_, init) {
      discordManager = init.discord;
      audioEngine = init.audio;
    },
    [ACTION.DISCORD_LOGIN](context, key) {
      // will probably want to attach handlers here too
      discordManager.login(key, () => {
        context.commit(MUTATION.DISCORD_SET_READY, true);
      });
    },
    inc(context) {
      context.commit('inc');
    }
  },
}
