const ACTION = {
  INIT_STATE: 'Initialize state',
  DISCORD_LOGIN: 'Log in to Discord',
  DISCORD_LOGOUT: 'Log out of Discord',
  DISCORD_JOIN_VOICE: 'Connect to Voice Channel',
  DISCORD_LEAVE_VOICE: 'Disconnect from Voice Channel',
  DISCORD_SET_TOKEN: 'Set bot token',
};

const MUTATION = {
  DISCORD_SET_READY: 'Set bot connection status',
  DISCORD_SET_TOKEN: 'Set bot token',
  DISCORD_SET_BOT_INFO: 'Set bot info',
  DISCORD_SET_CHANNELS: 'Set available voice channels',
  DISCORD_CONNECTED_TO: 'Set current active voice channel',
};

module.exports = {
  ACTION,
  MUTATION,
};
