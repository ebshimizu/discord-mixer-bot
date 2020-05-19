const Vue = require('vue/dist/vue.common');
const { createSharedMutations } = require('vuex-electron');
const { ACTION, MUTATION } = require('./actions');
const ElectronStore = require('electron-store');
const eStore = new ElectronStore();
const { StreamStorage } = require('stream-storage');
const { ResourceStatus, SourceType } = require('../modules/audioEngine');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');

// references to external apis n stuff
let discordManager, audioEngine;
let duplexStream = null;

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
      cache: {},
      locked: false,
      stagedVolume: 1,
      liveVolume: 1,
      masterVolume: 1,
    },
    locked: false,
    customFadeTime: 5,
    cues: {},
  },
  getters: {
    allSources: (state) => {
      return state.audio.staged.concat(state.audio.live);
    },
    getSource: (state) => (id) => {
      if (id in state.audio.cache) return state.audio.cache[id];

      return state.audio.staged
        .concat(state.audio.live)
        .find((source) => source.id === id);
    },
    cues: (state) => {
      return state.cues;
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
    [MUTATION.LOAD_CUES](state) {
      const cues = eStore.get('cues');
      // delete preload status
      for (const id in cues) {
        cues[id].preloaded = [];
      }

      if (cues) state.cues = cues;
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
    },
    [MUTATION.SET_CUSTOM_FADE_TIME](state, val) {
      state.customFadeTime = val;
    },
    [MUTATION.ADD_CUE](state, cueData) {
      let id = uuidv4();
      while (id in state.cues) {
        // supposed to be unique, so ideally this never happens
        id = uuidv4();
      }

      Vue.set(state.cues, id, cueData);
      eStore.set('cues', state.cues);
    },
    [MUTATION.REPLACE_CUE](state, data) {
      Vue.set(state.cues, data.id, data.cue);
      eStore.set('cues', state.cues);
    },
    [MUTATION.DELETE_CUE](state, id) {
      Vue.delete(state.cues, id);
      eStore.set('cues', state.cues);
    },
    [MUTATION.DELETE_ALL_CUES](state) {
      state.cues = {};
      // look out it's permanent
      eStore.set('cues', state.cues);
    },
    [MUTATION.AUDIO_UPDATE_CACHE](state, cache) {
      state.audio.cache = cache;
    },
    [MUTATION.LOCK](state) {
      state.locked = true;
    },
    [MUTATION.UNLOCK](state) {
      state.locked = false;
    },
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
      audioEngine._onLock = () => {
        context.commit(MUTATION.LOCK);
      };
      audioEngine._onUnlock = () => {
        context.commit(MUTATION.UNLOCK);
      };
      // errors may have some handling in-app, but for now let the source component display

      context.commit(MUTATION.INIT_AUDIO);
      context.commit(MUTATION.LOAD_CUES);
    },
    [ACTION.DISCORD_LOGIN](context) {
      // will probably want to attach handlers here too
      // and error handlers
      discordManager.login(context.state.discord.token, (client) => {
        // create broadcast
        if (duplexStream) duplexStream.destroy();

        duplexStream = new StreamStorage({
          chunkSize: 8 * 1024,
          maxSize: 64 * 1024,
        });
        audioEngine.setOutputStream(duplexStream);
        discordManager.connectDiscordAudioStream(
          duplexStream,
          console.log,
          console.log,
          console.log
        );

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
      opts.swap = 'swap' in opts ? opts.swap : false;

      audioEngine.fadeStagedToLive(
        opts.time,
        () => {
          // swap the sources
          context.commit(
            MUTATION.AUDIO_UPDATE_STAGED,
            audioEngine.stagedSources
          );
          context.commit(MUTATION.AUDIO_UPDATE_LIVE, audioEngine.liveSources);
        },
        opts.swap
      );
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
    [ACTION.SET_CUSTOM_FADE_TIME](context, val) {
      context.commit(MUTATION.SET_CUSTOM_FADE_TIME, val);
    },
    [ACTION.ADD_CUE](context, cueData) {
      context.commit(MUTATION.ADD_CUE, {
        name: cueData.name ? cueData.name : 'New Cue',
        sources: cueData.sources ? cueData.sources : [],
        preloaded: [],
        fadeTime: cueData.fadeTime ? cueData.fadeTime : 5,
        category: cueData.category !== '' ? cueData.category : 'Uncategorized',
      });
    },
    [ACTION.REPLACE_CUE](context, data) {
      context.commit(MUTATION.REPLACE_CUE, data);
    },
    [ACTION.STAGE_CUE](context, cue) {
      // first, clear all the stuff from staged
      audioEngine.removeAllStaged();
      const useCache = cue.preloaded.length > 0;

      for (let i = 0; i < cue.sources.length; i++) {
        const src = cue.sources[i];

        // otherwise load normally
        audioEngine.stageResource(src.locator, src.type, {
          volume: src.volume,
          loop: src.loop,
          cacheId: useCache ? cue.preloaded[i] : null,
        });
      }

      // set the fade time from the cue
      if (cue.fadeTime) {
        context.commit(MUTATION.SET_CUSTOM_FADE_TIME, cue.fadeTime);
      }
      // update the store
      context.commit(MUTATION.AUDIO_UPDATE_STAGED, audioEngine.stagedSources);
    },
    [ACTION.DELETE_CUE](context, id) {
      context.commit(MUTATION.DELETE_CUE, id);
    },
    [ACTION.CLEAN_UP_STREAM](context) {
      discordManager.logout();
      audioEngine.stop();

      if (duplexStream) duplexStream.destroy();
    },
    [ACTION.AUDIO_COPY_FROM_LIVE](context) {
      audioEngine.copyFromLiveToStaging();
      context.commit(MUTATION.AUDIO_UPDATE_STAGED, audioEngine.stagedSources);
    },
    [ACTION.AUDIO_PRELOAD_CUE](context, data) {
      // load sources into cache
      data.cue.preloaded = [];

      for (const src of data.cue.sources) {
        data.cue.preloaded.push(
          audioEngine.cacheResource(src.locator, src.type, {
            loop: src.loop,
            volume: src.volume,
          })
        );
      }

      // update the cache
      context.commit(MUTATION.REPLACE_CUE, data);
      context.commit(MUTATION.AUDIO_UPDATE_CACHE, audioEngine.cache);
    },
    [ACTION.AUDIO_UNLOAD_CUE](context, data) {
      // in order to unload, we need to make sure no other cue has
      // the source pre-loaded
      for (const srcId of data.cue.preloaded) {
        let canDelete = true;

        for (const cueId in context.state.cues) {
          // don't check against self
          if (cueId === data.id) continue;

          // check for same id
          const cue = context.state.cues[cueId];
          if (cue.preloaded.length > 0) {
            if (cue.preloaded.indexOf(srcId) > -1) {
              canDelete = false;
              break;
            }
          }
        }

        if (canDelete) audioEngine.deleteFromCache(srcId);
      }

      data.cue.preloaded = [];
      context.commit(MUTATION.REPLACE_CUE, data);
      context.commit(MUTATION.AUDIO_UPDATE_CACHE, audioEngine.cache);
    },
    [ACTION.AUDIO_IMPORT_CUES](context, { file, append, onError }) {
      // there's also no validation for this??? lol
      try {
        const cues = JSON.parse(fs.readFileSync(file));

        // replace or append?
        if (!append) {
          context.commit(MUTATION.DELETE_ALL_CUES);

          // if replacing, unload the cache at will
          context.dispatch(ACTION.AUDIO_UNLOAD_CACHE);
        }

        for (const id in cues) {
          // probably shoooooould validate but eh
          context.commit(MUTATION.ADD_CUE, cues[id]);
        }
      } catch (err) {
        // error
        console.log(err);
      }
    },
    [ACTION.AUDIO_UNLOAD_CACHE](context) {
      // lil dangerous, cues will still be preloaded
      // intended for use with other actions that replace cues
      audioEngine.deleteCache();
    },
  },
};
