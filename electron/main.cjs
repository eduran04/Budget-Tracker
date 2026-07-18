const { app, BrowserWindow } = require("electron");
const path = require("node:path");

// Startup profiling: run with STARTUP_PROFILE=1 (see npm run electron:profile)
const launchTime = Date.now();
const profiling = process.env.STARTUP_PROFILE === "1";
const mark = (label) => {
  if (profiling) console.log(`[startup] ${label}: +${Date.now() - launchTime}ms`);
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    // Stay hidden until the first paint so users never see a blank white frame
    show: false,
    backgroundColor: "#09090b",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mark("windowCreated");

  win.once("ready-to-show", () => {
    mark("readyToShow");
    win.show();
  });
  win.webContents.on("did-finish-load", () => mark("didFinishLoad"));
  if (profiling) {
    // Surface the renderer's own [startup] marks in the terminal
    win.webContents.on("console-message", (event) => {
      if (event.message?.startsWith("[startup]")) console.log(event.message);
    });
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  mark("appReady");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
