// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron');
const path = require('path');
const ElectronStore = require('electron-store');
const eStore = new ElectronStore();
const { autoUpdater } = require('electron-updater');

const Vue = require('Vue');
const Vuex = require('Vuex');
Vue.use(Vuex);
const store = new Vuex.Store(require('../store/store'));
const { ACTION, MUTATION } = require('../store/actions');

const Discord = require('../modules/discordManager');
const { AudioEngine } = require('../modules/audioEngine');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1200,
    minHeight: 380,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, '..', 'render', 'index.html'));

  // Open the DevTools.
  // if (process.env.NODE_ENV === 'debug')
  //   mainWindow.webContents.openDevTools();
}

autoUpdater.on('update-downloaded', function (info) {
  console.log(info);
  store.commit(MUTATION.ADD_MESSAGE, {
    title: 'Update Available',
    message: 'An app update will be installed when you exit.',
    type: 'info',
  });
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // vue devtool install
  // if (process.env.NODE_ENV !== 'production') {
  //  require('vue-devtools').install();
  // }

  createWindow();
  autoUpdater.checkForUpdatesAndNotify();

  // app.on('activate', function () {
  //   // On macOS it's common to re-create a window in the app when the
  //   // dock icon is clicked and there are no other windows open.
  //   if (BrowserWindow.getAllWindows().length === 0) createWindow();
  // });
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  store.dispatch(ACTION.CLEAN_UP_STREAM).then(() => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    // if (process.platform !== 'darwin') app.quit();
    app.quit();
  });
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// literally just dumping the entire test script here to see if it's possible
// to run any of this in the electron main
// initialize the store
// may want an init event inside the store itself, not persisting all data
if (eStore.get('discord.token')) {
  store.commit(MUTATION.DISCORD_SET_TOKEN, eStore.get('discord.token'));
}

store.dispatch(ACTION.INIT_STATE, {
  discord: Discord,
  audio: new AudioEngine(),
});
