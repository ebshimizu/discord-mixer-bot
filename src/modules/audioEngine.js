// the audio engine is a fairly simple staging-live setup.
// It maintains two sets of sources:
// - live, currently playing
// - staging, up next / loading
// sources are cued up in staging, and then flipped to live either
// immediately or through a crossfade operation.
// Engine cannot transition staging to live until all sources are loaded
// Staging config can be snapshot to a cue at any time
// - cues snapshots should be stored in the state; this object should
//   only handle things that are supposed to be played
const wae = require('@descript/web-audio-js');
const AudioContext = wae.StreamAudioContext;
const ffmpeg = require('easy-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const Speaker = require('speaker');
const fs = require('fs-extra');
const { app } = require('electron');
const path = require('path');

const ResourceStatus = {
  INIT: 'Initializing',
  TRANS: 'Transcoding',
  BUFFER: 'Buffering',
  READY: 'Ready',
  ERROR: 'Error',
};

const SourceType = {
  FILE: 'file',
  URL: 'url',
  YOUTUBE: 'youtube',
};

class AudioSource {
  constructor(context, locator, type, id, buffer = null) {
    // eventually type will indicate url or file and handle appropriately
    this._id = id;
    this._status = ResourceStatus.INIT;
    this._locator = locator;
    this._type = type;
    this._name = this._id;

    // available callback hooks
    this._onProgress = null;
    this._onReady = null;
    this._onError = null;
    this._onStatusChange = null;

    // internals
    this._audioData = Buffer.alloc(0);
    this._audioBuffer = buffer;
    this._outNode = context.createGain();
    this._outNode.gain.value = 1;
    this._context = context;
    this._loop = true;
    this._srcNode = null;
    this._tmpFileLocation = path.join(
      app.getPath('appData'),
      `${this._id}.tmp.wav`
    );

    this.setReadableName();
    if (buffer) {
      this._status = ResourceStatus.READY;
    }
    console.log(`tmp file location: ${this._tmpFileLocation}`);
  }

  setReadableName() {
    if (this._type === SourceType.FILE) {
      // use the filename
      this._name = path.basename(this._locator);
    }
  }

  get volume() {
    return this._outNode.gain.value;
  }
  set volume(val) {
    if (this._srcNode) {
      const now = this._context.currentTime;
      this._outNode.gain.setValueAtTime(this._outNode.gain.value, now);
      this._outNode.gain.exponentialRampToValueAtTime(val, now + 0.016);
    } else {
      this._outNode.gain.value = val;
    }
  }

  connect(dest) {
    this._outNode.connect(dest);
  }

  disconnect() {
    this._outNode.disconnect();
  }

  loop(shouldLoop) {
    this._loop = shouldLoop;
  }

  setStatus(status) {
    this._status = status;

    if (this._onStatusChange) {
      this._onStatusChange(this._id, status);
    }
  }

  load() {
    if (this._audioBuffer !== null) {
      this.setStatus(ResourceStatus.READY);
      console.log('Source already has a buffer, is ready');
      return;
    }

    // starts the loading process
    console.log(`Loading media from ${this._locator}...`);

    // assumes file for now
    this.setStatus(ResourceStatus.TRANS);
    const self = this;

    ffmpeg(this._locator)
      .toFormat('wav')
      .outputOptions(['-ac 2', '-ar 48000'])
      .save(this._tmpFileLocation)
      .on('error', function (err) {
        console.log(err);
        self.setStatus(ResourceStatus.ERROR);

        if (self._onError) self._onError(self._id, err);
      })
      .on('end', function () {
        self.setStatus(ResourceStatus.BUFFER);
        fs.readFile(self._tmpFileLocation, (err, data) => {
          self._context.decodeAudioData(data).then((audioBuffer) => {
            self._audioBuffer = audioBuffer;
            self.setStatus(ResourceStatus.READY);
            setTimeout(() => fs.unlink(self._tmpFileLocation), 1000);
          });
        });
      });
  }

  play() {
    if (this._status !== ResourceStatus.READY) {
      console.log(`Source ${this._id} is not ready to play`);
      return;
    }

    if (this._srcNode) {
      this._srcNode.stop();
      this._srcNode.disconnect();
    }

    this._srcNode = this._context.createBufferSource();
    this._srcNode.buffer = this._audioBuffer;
    this._srcNode.connect(this._outNode);
    this._srcNode.loop = this._loop;
    this._srcNode.start();

    console.log(`Audio node ${this._id} playing...`);
  }

  stop() {
    if (this._srcNode) this._srcNode.stop();
  }
}

class AudioEngine {
  constructor() {
    // first, construct the basics of the audio graph.
    this._context = new AudioContext({ sampleRate: 48000 });

    // master volume control
    this._masterGain = this._context.createGain();
    this._masterGain.connect(this._context.destination);
    this._masterGain.gain.value = 0.9;

    // staging and live gains actually end up alternating;
    // don't want to swap things during playback.
    this._subA = this._context.createGain();
    this._subA.connect(this._masterGain);

    this._subB = this._context.createGain();
    this._subB.connect(this._masterGain);

    // loaded stuff
    this._live = {
      sources: [],
      submaster: this._subA,
    };

    this._staged = {
      sources: [],
      submaster: this._subB,
    };

    this._staged.submaster.gain.value = 0;
    this._live.submaster.gain.value = 1;

    // internals
    this._locked = false; // will be true when a cue fade is happening

    // callbacks
    // default is just logging until user assignment after creation
    this._onSrcProgress = console.log;
    this._onSrcError = console.log;
    this._onSrcStatusChange = console.log;
    this._onLock = null;
    this._onUnlock = null;

    // the preloaded sources cache
    this._cache = {};

    // offline test
    // this._context.pipe(new Speaker({ sampleRate: 48000 }));
    this._context.resume();
  }

  stop() {
    this._context.close();
  }

  lock() {
    this._locked = true;
    if (this._onLock) this._onLock();
  }

  unlock() {
    this._locked = false;
    if (this._onUnlock) this._onUnlock();
  }

  // maps sources to an object that can be shoved into the vuex state
  // doesn't include any buffers for hopefully obvious reasons
  getSourceInfo(sources) {
    if (sources.length === 0) return [];

    return sources.map((src) => {
      return {
        id: src._id,
        type: src._type,
        locator: src._locator,
        status: src._status,
        loop: src._loop,
        volume: src.volume,
        name: src._name,
      };
    });
  }

  get cache() {
    const ret = {};
    for (const id in this._cache) {
      const src = this._cache[id];
      ret[id] = {
        id: src._id,
        type: src._type,
        locator: src._locator,
        status: src._status,
        loop: src._loop,
        volume: src.volume,
        name: src._name,
      };
    }

    return ret;
  }

  deleteCache() {
    // byeeeeeeeee
    this._cache = {};
  }

  getSource(id) {
    // search through all sources to find a corresponding id
    return this._staged.sources
      .concat(this._live.sources)
      .find((source) => source._id === id);
  }

  get liveSources() {
    return this.getSourceInfo(this._live.sources);
  }

  get stagedSources() {
    return this.getSourceInfo(this._staged.sources);
  }

  get liveVolume() {
    return this._live.submaster.gain.value;
  }

  get stagedVolume() {
    return this._staged.submaster.gain.value;
  }

  get masterVolume() {
    return this._masterGain.gain.value;
  }

  set liveVolume(vol) {
    this._live.submaster.gain.exponentialRampToValueAtTime(
      vol,
      this._context.currentTime + 0.05
    );
  }

  set stagedVolume(vol) {
    this._staged.submaster.gain.exponentialRampToValueAtTime(
      vol,
      this._context.currentTime + 0.05
    );
  }

  set masterVolume(vol) {
    this._masterGain.gain.exponentialRampToValueAtTime(
      vol,
      this._context.currentTime + 0.05
    );
  }

  removeSource(id) {
    const stagedIdx = this._staged.sources.findIndex((src) => src._id === id);
    if (stagedIdx > -1) {
      this.removeStaged(stagedIdx);
      return;
    }

    const liveIdx = this._live.sources.findIndex((src) => src._id === id);
    if (liveIdx > -1) {
      this.removeLive(liveIdx);
    }
  }

  removeStaged(srcIdx) {
    if (srcIdx >= 0) {
      this._staged.sources.splice(srcIdx, 1);
    }
  }

  removeLive(srcIdx) {
    if (srcIdx >= 0) {
      // live sources need to stop first
      this._live.sources[srcIdx].stop();
      this._live.sources[srcIdx].disconnect();
      this._live.sources.splice(srcIdx, 1);
    }
  }

  removeAllStaged() {
    this._staged.sources = [];
  }

  // things can't be directly loaded into live ever due to the load delay
  // with the current web audio library
  stageResource(locator, type, opts = {}) {
    let srcBuffer = null;

    // cache lookup
    if (opts.cacheId) {
      if (
        opts.cacheId in this._cache &&
        this._cache[opts.cacheId]._status === ResourceStatus.READY
      ) {
        srcBuffer = this._cache[opts.cacheId]._audioBuffer;
      }
    }

    const src = new AudioSource(this._context, locator, type, uuidv4(), srcBuffer);
    src._onProgress = this._onSrcProgress;
    src._onError = this._onSrcError;
    src._onStatusChange = this._onSrcStatusChange;

    if ('volume' in opts) src.volume = opts.volume;
    if ('loop' in opts) src.loop(opts.loop);

    this._staged.sources.push(src);
    src.load();
  }

  // copies the live sources back to staging
  copyFromLiveToStaging() {
    this._staged.sources = [];

    for (const src of this._live.sources) {
      // copy references to the audio buffer
      const copySrc = new AudioSource(
        this._context,
        src._locator,
        src._type,
        uuidv4(),
        src._audioBuffer
      );
      copySrc._onProgress = this._onSrcProgress;
      copySrc._onError = this._onSrcError;
      copySrc._onStatusChange = this._onSrcStatusChange;
      copySrc.loop(src._loop);
      copySrc.volume = src.volume;

      this._staged.sources.push(copySrc);
    }
  }

  cacheResource(locator, type, opts = {}) {
    // if something already exists, return that id
    for (const id in this._cache) {
      if (this._cache[id]._locator === locator) return id;
    }

    const src = new AudioSource(this._context, locator, type, uuidv4());
    src._onProgress = this._onSrcProgress;
    src._onError = this._onSrcError;
    src._onStatusChange = this._onSrcStatusChange;

    if ('volume' in opts) src.volume = opts.volume;
    if ('loop' in opts) src.loop(opts.loop);

    this._cache[src._id] = src;
    src.load();

    return src._id;
  }

  deleteFromCache(id) {
    if (id in this._cache) delete this._cache[id];
  }

  fadeStagedToLive(time, onComplete, swap = false) {
    // connect the sources, if not all are ready refuse to change
    for (const source of this._staged.sources) {
      if (source._status !== ResourceStatus.READY) {
        console.log('Not all sources are ready. Cannot transition to live');

        // probably want a return value
        return;
      }
    }

    // should indicate lock here
    this.lock();

    // connect and play all of the sources
    for (const source of this._staged.sources) {
      source.connect(this._staged.submaster);
      source.play();
    }

    const now = this._context.currentTime;
    this._staged.submaster.gain.setValueAtTime(0.001, now);
    this._live.submaster.gain.setValueAtTime(1, now);

    this._staged.submaster.gain.exponentialRampToValueAtTime(1, now + time);
    this._live.submaster.gain.exponentialRampToValueAtTime(0.001, now + time);

    // set a callback
    const self = this;
    setTimeout(() => self.swapStagedAndLive(onComplete, swap), time * 1000);
  }

  swapStagedAndLive(onComplete, swap = false) {
    // at this point, live has faded out and staged is now live
    // disconnect all live sources
    for (const source of this._live.sources) {
      source.stop();
      source.disconnect();
    }

    // swap sources
    let tmp = this._staged.sources;
    if (swap) {
      this.copyFromLiveToStaging();
    } else {
      this._staged.sources = [];
    }

    this._live.sources = tmp;

    // swap submasters
    tmp = this._live.submaster;
    this._live.submaster = this._staged.submaster;
    this._staged.submaster = tmp;

    if (onComplete) onComplete();
    this.unlock();
  }

  setOutputStream(stream) {
    // suspend rq
    this._context.suspend();
    this._context.pipe(stream);
    this._context.resume();

    console.log('Audio output stream changed');
  }
}

module.exports = {
  AudioEngine,
  ResourceStatus,
  SourceType,
};
