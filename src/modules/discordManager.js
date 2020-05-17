const Discord = require('discord.js');
const client = new Discord.Client();

function login(key, onComplete) {
  client.once('ready', onComplete);
  client.login(key);
}

function logout() {
  client.destroy();
}

function addHandler(event, handler) {
  // currently just appends to the listeners
  // without doing anything about existing ones
  client.on(event, handler);
}

// lists voice channels by server
function voiceChannelsByServer() {
  // return client.guilds.cache.
}

module.exports = {
  login,
  logout,
  addHandler
}