const { app, BrowserWindow, ipcMain } = require('electron')

let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile('index.html')
}

ipcMain.on('re-render', () => {
  win.loadFile('index.html')
})


app.name = "TTS Interface";
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
