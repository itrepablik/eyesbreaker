import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import * as path from 'path';
import { EyeBreakSettings, clamp, formatDuration } from './settings';
import { SettingsStore } from './store';
import { EyeBreakScheduler } from './scheduler';
import { wavDataUrl } from './sound';
import { breakScreenHtml, settingsScreenHtml, settingsUpdateMessage } from './ui';

let tray: Tray | undefined;
let breakWindow: BrowserWindow | undefined;
let settingsWindow: BrowserWindow | undefined;
let pendingBreakStart = false;
let quitting = false;

let store: SettingsStore;
let scheduler: EyeBreakScheduler;

function iconPath(): string {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'assets', 'eyesbreaker.png')
        : path.join(__dirname, '..', '..', 'assets', 'eyesbreaker.png');
}

function preloadPath(): string {
    return path.join(__dirname, 'preload.js');
}

void app.whenReady().then(() => {
    store = new SettingsStore();
    scheduler = new EyeBreakScheduler(store.get());

    scheduler.onTick((state) => {
        if (breakWindow && !breakWindow.isDestroyed()) {
            breakWindow.webContents.send('eyesbreaker:update', {
                type: 'tick',
                remaining: state.remainingBreakSeconds,
            });
        }
        updateTray();
        sendStateToSettings();
    });

    scheduler.onBreakStart(() => {
        showBreak();
    });

    scheduler.onBreakEnd(() => {
        closeBreakWindow();
        updateTray();
        sendStateToSettings();
    });

    ipcMain.on('eyesbreaker:message', (event, message) => {
        handleMessage(message, BrowserWindow.fromWebContents(event.sender));
    });

    applyLaunchAtLogin(store.get().launchAtLogin);
    buildTray();
    scheduler.start();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createSettingsWindow();
        }
    });
});

// Keep running in the tray when all windows are closed.
app.on('window-all-closed', () => {
    // Intentionally empty: the tray owns the app lifetime.
});

function buildTray(): void {
    const image = nativeImage.createFromPath(iconPath());
    tray = new Tray(image);
    tray.setToolTip('Eyesbreaker');
    updateTray();
}

function updateTray(): void {
    if (!tray) {
        return;
    }

    const settings = store.get();
    const state = scheduler.getState();

    let text: string;
    if (!settings.enabled) {
        text = 'Eyesbreaker: Off';
    } else if (state.phase === 'break') {
        text = `Eyesbreaker: Break ${state.remainingBreakSeconds}s`;
    } else {
        text = `Eyesbreaker: ${formatDuration(state.nextBreakInMs)}`;
    }

    tray.setToolTip(text);
    tray.setContextMenu(buildTrayMenu(settings));
}

function buildTrayMenu(settings: EyeBreakSettings): Menu {
    const state = scheduler.getState();
    return Menu.buildFromTemplate([
        {
            label: settings.enabled
                ? `Next break in ${formatDuration(state.nextBreakInMs)}`
                : 'Reminders disabled',
            enabled: false,
        },
        { type: 'separator' },
        {
            label: 'Start Break Now',
            click: () => scheduler.startBreakNow(),
        },
        {
            label: 'Open Settings',
            click: () => createSettingsWindow(),
        },
        {
            label: 'Enabled',
            type: 'checkbox',
            checked: settings.enabled,
            click: (item) => {
                store.update({ enabled: item.checked });
                scheduler.updateSettings(store.get());
                updateTray();
                sendStateToSettings();
            },
        },
        {
            label: 'Launch at Login',
            type: 'checkbox',
            checked: settings.launchAtLogin,
            click: (item) => {
                store.update({ launchAtLogin: item.checked });
                applyLaunchAtLogin(item.checked);
                updateTray();
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                quitting = true;
                app.quit();
            },
        },
    ]);
}

function applyLaunchAtLogin(enabled: boolean): void {
    if (process.platform === 'linux') {
        // setLoginItemSettings is not supported on Linux.
        return;
    }
    app.setLoginItemSettings({
        openAtLogin: enabled,
        path: process.execPath,
    });
}

function showBreak(): void {
    if (!breakWindow || breakWindow.isDestroyed()) {
        createBreakWindow();
    }

    breakWindow?.setAlwaysOnTop(true, 'screen-saver');
    breakWindow?.center();
    breakWindow?.show();
    pendingBreakStart = true;
    sendBreakStartIfPending();
}

function createBreakWindow(): void {
    if (breakWindow && !breakWindow.isDestroyed()) {
        return;
    }

    const settings = store.get();
    breakWindow = new BrowserWindow({
        width: 640,
        height: 540,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        icon: iconPath(),
        webPreferences: {
            preload: preloadPath(),
            contextIsolation: true,
            nodeIntegration: false,
            autoplayPolicy: 'no-user-gesture-required',
        },
    });

    breakWindow.setMenuBarVisibility(false);
    breakWindow.setAlwaysOnTop(true, 'screen-saver');
    void breakWindow.loadURL(
        'data:text/html;charset=utf-8,' +
            encodeURIComponent(breakScreenHtml(settings.breakSeconds, settings.snoozeMinutes))
    );

    breakWindow.once('ready-to-show', () => {
        breakWindow?.show();
    });

    breakWindow.on('closed', () => {
        breakWindow = undefined;
        pendingBreakStart = false;
    });
}

function closeBreakWindow(): void {
    if (breakWindow && !breakWindow.isDestroyed()) {
        breakWindow.destroy();
    }
    breakWindow = undefined;
    pendingBreakStart = false;
}

function sendBreakStartIfPending(): void {
    if (!pendingBreakStart) {
        return;
    }
    if (!breakWindow || breakWindow.isDestroyed()) {
        return;
    }

    const settings = store.get();
    const soundDataUrl = settings.soundEnabled
        ? wavDataUrl(settings.soundPattern, settings.soundVolume)
        : '';

    breakWindow.webContents.send('eyesbreaker:update', {
        type: 'start',
        total: settings.breakSeconds,
        snoozeMinutes: settings.snoozeMinutes,
        soundDataUrl,
    });
    pendingBreakStart = false;
}

function createSettingsWindow(): void {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 480,
        height: 680,
        title: 'Eyesbreaker Settings',
        resizable: true,
        icon: iconPath(),
        webPreferences: {
            preload: preloadPath(),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    settingsWindow.setMenuBarVisibility(false);
    void settingsWindow.loadURL(
        'data:text/html;charset=utf-8,' + encodeURIComponent(settingsScreenHtml())
    );
    settingsWindow.webContents.once('did-finish-load', () => sendStateToSettings());
    settingsWindow.on('closed', () => {
        settingsWindow = undefined;
    });
}

function sendStateToSettings(): void {
    if (!settingsWindow || settingsWindow.isDestroyed()) {
        return;
    }

    const settings = store.get();
    settingsWindow.webContents.send(
        'eyesbreaker:update',
        settingsUpdateMessage(settings, buildStatusText(settings))
    );
}

function buildStatusText(settings: EyeBreakSettings): string {
    if (!settings.enabled) {
        return 'Reminders disabled';
    }

    const state = scheduler.getState();
    if (state.phase === 'break') {
        return 'Break in progress - look away now!';
    }

    return `Active - next break in ${formatDuration(state.nextBreakInMs)}`;
}

interface UiMessage {
    type?: string;
    value?: unknown;
}

function handleMessage(message: unknown, win: BrowserWindow | null): void {
    if (!message || typeof message !== 'object') {
        return;
    }

    const msg = message as UiMessage;
    if (typeof msg.type !== 'string') {
        return;
    }

    if (win === breakWindow) {
        switch (msg.type) {
            case 'ready':
                sendBreakStartIfPending();
                break;
            case 'dismiss':
                scheduler.dismissBreak();
                break;
            case 'snooze':
                scheduler.snoozeBreak(store.get().snoozeMinutes);
                break;
        }
        return;
    }

    if (win === settingsWindow) {
        handleSettingsMessage(msg);
    }
}

function handleSettingsMessage(msg: UiMessage): void {
    switch (msg.type) {
        case 'setEnabled':
            store.update({ enabled: Boolean(msg.value) });
            break;
        case 'setInterval':
            store.update({ intervalMinutes: clamp(Number(msg.value), 1, 120) });
            break;
        case 'setBreakSeconds':
            store.update({ breakSeconds: clamp(Number(msg.value), 5, 300) });
            break;
        case 'setSoundEnabled':
            store.update({ soundEnabled: Boolean(msg.value) });
            break;
        case 'setSoundPattern': {
            const value = String(msg.value);
            if (value === 'alarm' || value === 'beep' || value === 'siren') {
                store.update({ soundPattern: value });
            }
            break;
        }
        case 'setVolume':
            store.update({ soundVolume: clamp(Number(msg.value), 0, 1) });
            break;
        case 'setSnoozeMinutes':
            store.update({ snoozeMinutes: clamp(Number(msg.value), 1, 60) });
            break;
        case 'restoreDefaults':
            store.restoreDefaults();
            break;
        case 'testBreak':
            scheduler.startBreakNow();
            break;
    }

    scheduler.updateSettings(store.get());
    updateTray();
    sendStateToSettings();
}
