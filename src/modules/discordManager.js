const Discord = require('discord.js');
let client = new Discord.Client();
let voiceConnection = null;
let dispatcher = null;

function login(key, onComplete) {
  console.log(`Attempting login with [${key.substr(0, 10)}...]`);
  client.once('ready', function () {
    onComplete(client);
  });
  client.login(key);
}

function logout() {
  client.destroy();
  client = new Discord.Client();
  return client;
}

function addHandler(event, handler) {
  // currently just appends to the listeners
  // without doing anything about existing ones
  client.on(event, handler);
}

// lists voice channels by server
function getChannels() {
  const channelsByGuild = {};
  client.guilds.cache.each((guild) => {
    channelsByGuild[guild.id] = {
      channels: Array.from(
        guild.channels.cache
          .filter((channel) => channel.type === 'voice')
          .values()
      ).map((channel) => {
        return { id: channel.id, name: channel.name };
      }),
      name: guild.name,
    };
  });

  return channelsByGuild;
}

async function joinChannel(channelId, onJoin, onError) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel) {
      voiceConnection = await channel.join();
      return true;
    } else {
      console.log(`Channel id ${channelId} not found`);
      return false;
    }
  } catch (e) {
    console.log(`Error connecting to voice channel: ${e}`);
    return false;
  }
}

async function leaveChannel() {
  // we're only ever in one voice channel
  await voiceConnection.disconnect();
  return true;
}

async function connectDiscordAudioStream(stream, onError, onStart, onFinish) {
  dispatcher = voiceConnection.play(stream, { type: 'converted' });
  dispatcher.on('error', onError);
  dispatcher.on('start', onStart);
  dispatcher.on('finish', onFinish);
}

module.exports = {
  login,
  logout,
  addHandler,
  getChannels,
  joinChannel,
  leaveChannel,
  connectDiscordAudioStream,
};
