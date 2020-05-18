const { createSharedMutations } = require('vuex-electron');
const { ACTION, MUTATION } = require('./actions');
const ElectronStore = require('electron-store');
const eStore = new ElectronStore();
const { StreamStorage } = require('stream-storage');
const { ResourceStatus, SourceType } = require('../modules/audioEngine');

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
    audio: {
      staged: [],
      live: [],
      locked: false,
      stagedVolume: 1,
      liveVolume: 1,
      masterVolume: 1,
    },
  },
  getters: {
    allSources: (state) => {
      return state.audio.staged.concat(state.audio.live);
    },
    getSource: (state) => (id) => {
      return state.audio.staged
        .concat(state.audio.live)
        .find((source) => source.id === id);
    },
  },
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
    [MUTATION.INIT_AUDIO](state) {
      // at this point we need to sync the loaded state (which I at some point will)
      // actually save with the vuex store
    },
    [MUTATION.AUDIO_UPDATE_STAGED](state, sources) {
      state.audio.staged = sources;
    },
    [MUTATION.AUDIO_UPDATE_LIVE](state, sources) {
      state.audio.live = sources;
    },
    [MUTATION.AUDIO_SRC_STATUS_CHANGE](state, srcData) {
      // find source in live or staged?
      // yes just because it's good practice
      const found = this.getters.getSource(srcData.id);
      if (found) {
        found.status = srcData.status;
      }
    },
    [MUTATION.AUDIO_SRC_SET_VOLUME](state, srcData) {
      const found = this.getters.getSource(srcData.id);
      if (found) {
        found.volume = srcData.volume;
      }
    },
    [MUTATION.AUDIO_SRC_SET_LOOP](state, srcData) {
      const found = this.getters.getSource(srcData.id);
      if (found) {
        found.loop = srcData.loop;
      }
    },
    [MUTATION.AUDIO_SET_MASTER_VOLUME](state, vol) {
      state.audio.masterVolume = vol;
    }
  },
  actions: {
    [ACTION.INIT_STATE](context, init) {
      discordManager = init.discord;
      audioEngine = init.audio;

      // add audio engine handlers
      // on progress seems to not give any output for audio, so let it log until i see something
      audioEngine._onSrcStatusChange = (id, status) => {
        context.commit(MUTATION.AUDIO_SRC_STATUS_CHANGE, { id, status });
      };
      // errors may have some handling in-app, but for now let the source component display

      context.commit(MUTATION.INIT_AUDIO);
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
        discordManager.connectDiscordAudioStream(
          duplexStream,
          console.log,
          console.log,
          console.log
        );
        audioEngine.setOutputStream(duplexStream);
      }
    },
    async [ACTION.DISCORD_LEAVE_VOICE](context) {
      await discordManager.leaveChannel();
      context.commit(MUTATION.DISCORD_CONNECTED_TO, null);
    },
    [ACTION.AUDIO_STAGE_FILE](context, file) {
      audioEngine.stageResource(file, SourceType.FILE);
      context.commit(MUTATION.AUDIO_UPDATE_STAGED, audioEngine.stagedSources);
    },
    [ACTION.AUDIO_MOVE_TO_LIVE](context, opts) {
      // probably need a lock on the interface here to prevent weird adds/deletes
      // UI should disable buttons if not all sources are ready
      audioEngine.fadeStagedToLive(opts.time, () => {
        // swap the sources
        context.commit(MUTATION.AUDIO_UPDATE_STAGED, audioEngine.stagedSources);
        context.commit(MUTATION.AUDIO_UPDATE_LIVE, audioEngine.liveSources);
      });
    },
    [ACTION.AUDIO_SRC_SET_VOLUME](context, srcData) {
      // relay
      const src = audioEngine.getSource(srcData.id);
      if (src) {
        src.volume = srcData.volume;
        context.commit(MUTATION.AUDIO_SRC_SET_VOLUME, srcData);
      }
    },
    [ACTION.AUDIO_SRC_SET_LOOP](context, srcData) {
      const src = audioEngine.getSource(srcData.id);
      if (src) {
        src.loop(srcData.loop);
        context.commit(MUTATION.AUDIO_SRC_SET_LOOP, srcData);
      }
    },
    [ACTION.AUDIO_SRC_REMOVE](context, id) {
      audioEngine.removeSource(id);
      context.commit(MUTATION.AUDIO_UPDATE_STAGED, audioEngine.stagedSources);
      context.commit(MUTATION.AUDIO_UPDATE_LIVE, audioEngine.liveSources);
    },
    [ACTION.AUDIO_SET_MASTER_VOLUME](context, vol) {
      audioEngine.masterVolume = vol;
      context.commit(MUTATION.AUDIO_SET_MASTER_VOLUME, vol);
    },
  },
};
