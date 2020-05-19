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
  ADD_CUE: 'Add cue',
  STAGE_CUE: 'Stage cue',
  SET_CUSTOM_FADE_TIME: 'Set Custom Fade Time',
  REPLACE_CUE: 'Replace cue',
  DELETE_CUE: 'Delete cue',
  CLEAN_UP_STREAM: 'Clean up before exit',
  AUDIO_COPY_FROM_LIVE: 'Copy Live to Staging',
  AUDIO_PRELOAD_CUE: 'Preload Cue',
  AUDIO_UNLOAD_CUE: 'Unload Cue',
  AUDIO_IMPORT_CUES: 'Import Cues',
  AUDIO_UNLOAD_CACHE: 'Unload Cache'
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
  ADD_CUE: 'Add Cue',
  SET_CUSTOM_FADE_TIME: 'Set custom fade time',
  REPLACE_CUE: 'Replace Cue',
  DELETE_CUE: 'Delete Cue',
  DELETE_ALL_CUES: 'Delete all Cues',
  AUDIO_UPDATE_CACHE: 'Update Cache'
};

module.exports = {
  ACTION,
  MUTATION,
};
