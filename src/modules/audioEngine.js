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

const ResourceStatus = {
  INIT: 'Initializing',
  TRANS: 'Transcoding',
  BUFFER: 'Buffering',
  READY: 'Ready',
  ERROR: 'Error',
};

class AudioSource {
  constructor(context, locator, type, id) {
    // eventually type will indicate url or file and handle appropriately
    this._id = id;
    this._status = ResourceStatus.INIT;
    this._locator = locator;
    this._type = type;

    // available callback hooks
    this._onProgress = null;
    this._onReady = null;
    this._onError = null;
    this._onStatusChange = null;

    // internals
    this._audioData = Buffer.alloc(0);
    this._audioBuffer = null;
    this._outNode = context.createGain();
    this._outNode.gain.value = 1;
    this._context = context;
    this._loop = true;
    this._srcNode = null;
  }

  get volume() {
    return this._outNode.gain.value;
  }
  set volume(val) {
    this._outNode.exponentialRampToValueAtTime(
      val,
      this._context.currentTime + 0.05
    );
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
    // starts the loading process
    console.log(`Loading media from ${locator}...`);

    // assumes file for now
    this.setStatus(ResourceStatus.TRANS);

    ffmpeg(locator)
      .toFormat('wav')
      .outputOptions(['-ac 2', '-ar 48000'])
      .pipe(this._audioData, { end: true })
      .on('data', function (chunk) {
        this._audioData = Buffer.concat([audioData, chunk]);
      })
      .on('progress', function (prog) {
        if (this._onProgress) this._onProgress(this._id, prog);
      })
      .on('error', function (err) {
        console.log(err);
        this._status = ResourceStatus.ERROR;

        if (this._onError) this._onError(this._id, err);
      })
      .on('end', function () {
        this.setStatus(ResourceStatus.BUFFER);
        this._context.decodeAudioData(this._audioData).then((audioBuffer) => {
          this._audioBuffer = audioBuffer;
          if (this._onReady) {
            this._onReady(id);
          }
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
    this._masterGain.gain.value = 1;

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

    // internals
    this._locked = false; // will be true when a cue fade is happening

    // callbacks
    this._onSrcProgress = null;
    this._onSrcReady = null;
    this._onSrcError = null;
    this._onSrcStatusChange = null;
  }

  // need to figure out how to have the state interface with this
  // get liveSources() {
  //   return Array.from(this._live.sources);
  // }

  // things can't be directly loaded into live ever due to the load delay
  // with the current web audio library
  stageResource(locator, type) {
    const src = new AudioSource(this._context, locator, type, uuidv4());
    src._onProgress = this._onSrcProgress;
    src._onReady = this._onSrcReady;
    src._onError = this._onError;
    src._onStatusChange = this._onStatusChange;

    this._staged.sources.push(src);
    src.load();
  }

  fadeStagedToLive(time) {
    // connect the sources, if not all are ready refuse to change
    for (const source of this._staged.sources) {
      if (source._status !== ResourceStatus.READY) {
        console.log('Not all sources are ready. Cannot transition to live');

        // probably want a return value
        return;
      }
    }

    // connect and play all of the sources
    for (const source of this._staged.sources) {
      source.connect(this._staged.submaster);
      source.play();
    }

    this._staged.submaster.exponentialRampToValueAtTime(
      1,
      this._context.currentTime + time
    );
    this._live.submaster.exponentialRampToValueAtTime(
      0.001,
      this._context.currentTime + time
    );

    // set a callback
    setTimeout(this.swapStagedAndLive, time * 1000);
  }

  swapStagedAndLive() {
    // at this point, live has faded out and staged is now live
    // disconnect all live sources
    for (const source of this._live.sources) {
      source.stop();
      source.disconnect();
    }

    // swap sources
    this._live.sources = this._staged.sources;
    this._staged.sources = [];

    // swap submasters
    const tmp = this._live.submaster;
    this._live.submaster = this._staged.submaster;
    this._staged.submaster = tmp;
  }

  setOutputStream(stream) {
    this._context.pipe(stream);
    this._context.resume();
  }
}

module.exports = AudioEngine;
