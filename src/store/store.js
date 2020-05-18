const { createSharedMutations } = require('vuex-electron');
const { ACTION, MUTATION } = require('./actions');
const ElectronStore = require('electron-store');
const eStore = new ElectronStore();
const { StreamStorage } = require('stream-storage');

// references to external apis n stuff
let discordManager, audioEngine;
const duplexStream = new StreamStorage({
  chunkSize: 8 * 1024,
  maxSize: 64 * 1024,
});

module.exports = {
  plugins: [
    createSharedMutations({
      syncStateOnRendererCreation: true,
    }),
  ],
  state: {
    discord: {
      ready: false,
      tag: '',
      id: null,
      createdAt: null,
      token: '',
      voiceChannels: {},
      connectedTo: null,
    },
  },
  getters: {},
  mutations: {
    [MUTATION.DISCORD_SET_READY](state, ready) {
      state.discord.ready = ready;
    },
    [MUTATION.DISCORD_SET_TOKEN](state, token) {
      console.log(`Token updated`);
      state.discord.token = token;
      // persist
      eStore.set('discord.token', token);
    },
    [MUTATION.DISCORD_SET_BOT_INFO](state, info) {
      state.discord.tag = info.tag;
      state.discord.id = info.id;
      state.discord.createdAt = info.createdAt;
    },
    [MUTATION.DISCORD_SET_CHANNELS](state, channels) {
      state.discord.voiceChannels = channels;
    },
    [MUTATION.DISCORD_CONNECTED_TO](state, id) {
      state.discord.connectedTo = id;
    },
  },
  actions: {
    [ACTION.INIT_STATE](_, init) {
      discordManager = init.discord;
      audioEngine = init.audio;
    },
    [ACTION.DISCORD_LOGIN](context) {
      // will probably want to attach handlers here too
      // and error handlers
      discordManager.login(context.state.discord.token, (client) => {
        context.commit(MUTATION.DISCORD_SET_READY, true);
        context.commit(MUTATION.DISCORD_SET_BOT_INFO, {
          tag: client.user.tag,
          id: client.user.id,
          createdAt: client.user.createdAt,
        });
        context.commit(
          MUTATION.DISCORD_SET_CHANNELS,
          discordManager.getChannels()
        );
      });
    },
    [ACTION.DISCORD_LOGOUT](context) {
      discordManager.logout();
      context.commit(MUTATION.DISCORD_SET_READY, false);
      context.commit(MUTATION.DISCORD_SET_BOT_INFO, {
        tag: '',
        id: null,
        createdAt: null,
      });
    },
    [ACTION.DISCORD_SET_TOKEN](context, token) {
      context.commit(MUTATION.DISCORD_SET_TOKEN, token);
    },
    async [ACTION.DISCORD_JOIN_VOICE](context, channelInfo) {
      const connected = await discordManager.joinChannel(channelInfo.id);
      if (connected) {
        context.commit(MUTATION.DISCORD_CONNECTED_TO, channelInfo.id);
        // TODO: ACTUAL HANDLERS
        discordManager.connectDiscordAudioStream(duplexStream, console.log, console.log, console.log);
        audioEngine.setOutputStream(duplexStream);
      }
    },
    async [ACTION.DISCORD_LEAVE_VOICE](context) {
      await discordManager.leaveChannel();
      context.commit(MUTATION.DISCORD_CONNECTED_TO, null);
    },
  },
};
