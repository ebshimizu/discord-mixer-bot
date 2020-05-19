const ACTION = {
  INIT_STATE: 'Initialize state',
  DISCORD_LOGIN: 'Log in to Discord',
  DISCORD_LOGOUT: 'Log out of Discord',
  DISCORD_JOIN_VOICE: 'Connect to Voice Channel',
  DISCORD_LEAVE_VOICE: 'Disconnect from Voice Channel',
  DISCORD_SET_TOKEN: 'Set bot token',
  AUDIO_STAGE_FILE: 'Load and Stage Audio File',
  AUDIO_MOVE_TO_LIVE: 'Move staged sources to live',
  AUDIO_SRC_SET_VOLUME: 'Set audio source volume',
  AUDIO_SRC_SET_LOOP: 'Set audio source loop',
  AUDIO_SRC_REMOVE: 'Remove audio source',
  AUDIO_SET_MASTER_VOLUME: 'Set master volume',
  ADD_CUE: 'Add cue'
};

const MUTATION = {
  DISCORD_SET_READY: 'Set bot connection status',
  DISCORD_SET_TOKEN: 'Set bot token',
  DISCORD_SET_BOT_INFO: 'Set bot info',
  DISCORD_SET_CHANNELS: 'Set available voice channels',
  DISCORD_CONNECTED_TO: 'Set current active voice channel',
  INIT_AUDIO: 'Initialize Audio Engine',
  AUDIO_UPDATE_STAGED: 'Update staged sources',
  AUDIO_UPDATE_LIVE: 'Update live sources',
  AUDIO_SRC_STATUS_CHANGE: 'Audio Source Status Change',
  AUDIO_SRC_SET_VOLUME: 'Set audio source volume',
  AUDIO_SRC_SET_LOOP: 'Set audio source loop',
  AUDIO_SET_MASTER_VOLUME: 'Set master volume',
  LOAD_CUES: 'Load Cues',
  ADD_CUE: 'Add Cue'
};

module.exports = {
  ACTION,
  MUTATION,
};
