const ACTION = {
  INIT_STATE: 'Initialize state',
  DISCORD_LOGIN: 'Log in to Discord',
  DISCORD_JOIN_VOICE: 'Connect to Voice Channel',
  DISCORD_LEAVE_VOICE: 'Disconnect from Voice Channel',
};

const MUTATION = {
  DISCORD_SET_READY: 'Set bot connection status',
};

module.exports = {
  ACTION,
  MUTATION,
};
