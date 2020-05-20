# discord-mixer-bot

A simple two scene sound mixer that outputs through a Discord bot.

![discord-mixer-bot interface](https://i.imgur.com/qqbsyix.png)

## What is this?

This is a sound mixer that outputs music or sounds through a Discord bot. I built this bot to provide music for online D&D games because I didn't like the other options available to me.

## What can it do?

The bot can import almost any audio source from file (as long as it can be processed by ffmpeg into a wav), and can import YouTube videos by URL. Imported sources are placed in the "Staging" area. Their volumes can be adjusted, and then faded over to the "Live" area with the center controls where they will begin to play. The bot does not have any play or pause controls (it was intended for background music, after all).

Sets of frequently used sources can be saved as cues for later use. Cues themselves can be named and organized in any way you see fit, allowing for the creation of a library of commonly used effects and scenes. The wiki has more info about [operating the application](https://github.com/ebshimizu/discord-mixer-bot/wiki/Making-Noise).

## System Requirements

To use this bot, you need to have access to your own bot and bot token. [Discord.js guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot) has a pretty good walkthrough of how to do that. You'll then need to put that token into the bot. For more detailed setup instructions, [check out the wiki](https://github.com/ebshimizu/discord-mixer-bot/wiki/Setup).

The libraries used to make this bot work use uncompressed audio in memory. This means that you need a lot of RAM to handle large files. System with 16GB of RAM should be ok if playing back song-length files, while systems with 32GB should be ok if playing back ~1 hour long sources. Above that, run at your own risk.

### Wow that's a lot of memory

Yeah! The libraries do not operate on a streaming from disk basis yet, so if you want to help make this thing more memory efficient, that's a good place to start.

## Troubleshooting

This is a rather rough and quickly written prototype, so if you run into problems I might not be able to help. Here are some things to try though.

### Audio is stuttering

The app is very sensitive to local processing load, so your best bet here is to close all unnecessary processes on your computer. If it persists, you might want to try rebooting and re-launching the app. There's not much I can currently do about this at the moment. The issue might be able to be fixed with a later app update (if you know how to add a bit of a buffer to the audio input stream, let me know!)

### There's a pause as new files get staged

This is not fixable in the current implementation. What's happening is that the process that feeds the audio stream and reads in new audio files are the same process (the Electron main process). This has to be fixed on a technical level, and probably should be handled by a native thread feeding the audio system instead. This might be fixed in the future, but it might take a while.

### App is not responding

You might've loaded too big of a file into the app. Try to force close it and don't do that (for now).

### I can't connect to Discord

Check the permissions on your bot user in the server you're using the bot in, and check that you have the right token. If you get disconnected from Discord and the bot seems out of sync, just give it a restart.

### I don't hear any audio

Well there's a lot of reasons that might happen in this app, so you'll have to give me a bit more detail. Post an issue on GitHub with as much detail as you can (but please don't post your token) and I'll take a look.