const { app, BrowserWindow } = require("electron");
const path = require("node:path");

// Startup profiling: run with STARTUP_PROFILE=1 (see npm run electron:profile)
// CI gate: STARTUP_PROFILE_EXIT=1 quits after firstInteractive (or timeout).
const launchTime = Date.now();
const profiling = process.env.STARTUP_PROFILE === "1";
const exitAfterProfile = process.env.STARTUP_PROFILE_EXIT === "1";
const startupBudgetMs = Number(process.env.STARTUP_BUDGET_MS || 10_000);
const startupTimeoutMs = Number(process.env.STARTUP_TIMEOUT_MS || 30_000);

const mark = (label) => {
  if (profiling || exitAfterProfile) {
    console.log(`[startup] ${label}: +${Date.now() - launchTime}ms`);
  }
};

let settled = false;
const finishStartupCheck = (ok, reason) => {
  if (!exitAfterProfile || settled) return;
  settled = true;
  const elapsed = Date.now() - launchTime;
  if (ok) {
    console.log(`[startup] OK: ${reason} in ${elapsed}ms (budget ${startupBudgetMs}ms)`);
    app.exit(0);
  } else {
    console.error(`[startup] FAIL: ${reason} (elapsed ${elapsed}ms, budget ${startupBudgetMs}ms)`);
    app.exit(1);
  }
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

  if (profiling || exitAfterProfile) {
    // Surface the renderer's own [startup] marks in the terminal
    win.webContents.on("console-message", (event) => {
      const message = event.message ?? "";
      if (message.startsWith("[startup]")) console.log(message);

      if (exitAfterProfile && message.includes("firstInteractive")) {
        const elapsed = Date.now() - launchTime;
        console.log(`[startup] wallClock firstInteractive: +${elapsed}ms`);
        finishStartupCheck(
          elapsed <= startupBudgetMs,
          elapsed <= startupBudgetMs
            ? "app reached firstInteractive within budget"
            : `firstInteractive exceeded budget (${elapsed}ms > ${startupBudgetMs}ms)`,
        );
      }
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

  if (exitAfterProfile) {
    setTimeout(() => {
      finishStartupCheck(
        false,
        `timed out waiting for firstInteractive after ${startupTimeoutMs}ms`,
      );
    }, startupTimeoutMs);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
