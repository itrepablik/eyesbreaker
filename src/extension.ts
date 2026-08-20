import * as vscode from 'vscode';
import { AnnoyingSoundPlayer } from './sound';
import { BreakReminderController, BreakEndReason } from './breakReminderPanel';
import { SettingsWebviewProvider } from './settingsWebviewProvider';
import { DEFAULT_SETTINGS, clamp, formatDuration, SoundPattern } from './settings';

const CONFIG_NS = 'eyesbreaker';

let statusBarItem: vscode.StatusBarItem | undefined;
let settingsWebview: SettingsWebviewProvider | undefined;
let soundPlayer: AnnoyingSoundPlayer | undefined;
let breakController: BreakReminderController | undefined;
let heartbeat: NodeJS.Timeout | undefined;
let nextBreakAt = 0;

/**
 * Called when the extension is activated. Starts the background heartbeat
 * timer that schedules 20-20-20 breaks.
 */
export function activate(context: vscode.ExtensionContext): void {
    soundPlayer = new AnnoyingSoundPlayer(context);

    settingsWebview = new SettingsWebviewProvider(context.extensionUri, () => buildStatusText());
    breakController = new BreakReminderController(
        context.extensionUri,
        handleBreakEnd,
        () => playBreakSound()
    );

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'eyesbreaker.openSettings';
    statusBarItem.tooltip = 'Eyesbreaker: 20-20-20 eye-break reminders';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('eyesbreaker.settingsView', settingsWebview)
    );

    registerCommands(context);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(CONFIG_NS)) {
                settingsWebview?.refresh();
                updateStatusBar();
                if (!breakController?.isActive) {
                    resetSchedule();
                }
            }
        })
    );

    resetSchedule();
    heartbeat = setInterval(() => heartbeatTick(), 1000);
    context.subscriptions.push({
        dispose: () => {
            if (heartbeat) {
                clearInterval(heartbeat);
                heartbeat = undefined;
            }
        },
    });

    updateStatusBar();
}

export function deactivate(): void {
    if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = undefined;
    }

    breakController?.dispose();
    breakController = undefined;
    statusBarItem?.dispose();
    statusBarItem = undefined;
    settingsWebview = undefined;
    soundPlayer = undefined;
}

// ---- Background scheduling ----

/** Runs every second in the background. */
function heartbeatTick(): void {
    if (breakController?.isActive) {
        updateStatusBar();
        return;
    }

    const config = vscode.workspace.getConfiguration(CONFIG_NS);
    const enabled = config.get<boolean>('enabled', DEFAULT_SETTINGS.enabled);

    if (enabled && Date.now() >= nextBreakAt) {
        startBreak();
    }

    updateStatusBar();
}

function resetSchedule(): void {
    nextBreakAt = Date.now() + getIntervalMinutes() * 60_000;
    updateStatusBar();
}

function getIntervalMinutes(): number {
    const config = vscode.workspace.getConfiguration(CONFIG_NS);
    return Math.round(clamp(config.get<number>('intervalMinutes', DEFAULT_SETTINGS.intervalMinutes), 1, 120));
}

function handleBreakEnd(reason: BreakEndReason, snoozeMinutes?: number): void {
    if (reason === 'snoozed') {
        const config = vscode.workspace.getConfiguration(CONFIG_NS);
        const minutes = snoozeMinutes
            ?? clamp(config.get<number>('snoozeMinutes', DEFAULT_SETTINGS.snoozeMinutes), 1, 60);
        nextBreakAt = Date.now() + minutes * 60_000;
    } else {
        nextBreakAt = Date.now() + getIntervalMinutes() * 60_000;
    }

    updateStatusBar();
}

// ---- Break trigger ----

function startBreak(): void {
    const config = vscode.workspace.getConfiguration(CONFIG_NS);
    const breakSeconds = Math.round(
        clamp(config.get<number>('breakSeconds', DEFAULT_SETTINGS.breakSeconds), 5, 300)
    );
    const snoozeMinutes = Math.round(
        clamp(config.get<number>('snoozeMinutes', DEFAULT_SETTINGS.snoozeMinutes), 1, 60)
    );

    breakController?.start(breakSeconds, snoozeMinutes);
    playBreakSound();
    updateStatusBar();
}

function playBreakSound(): void {
    const config = vscode.workspace.getConfiguration(CONFIG_NS);

    if (!config.get<boolean>('soundEnabled', DEFAULT_SETTINGS.soundEnabled)) {
        return;
    }

    const volume = clamp(config.get<number>('soundVolume', DEFAULT_SETTINGS.soundVolume), 0, 1);
    const pattern = config.get<SoundPattern>('soundPattern', DEFAULT_SETTINGS.soundPattern);
    soundPlayer?.play(pattern, volume);
}

// ---- Status bar ----

function updateStatusBar(): void {
    if (!statusBarItem) {
        return;
    }

    const config = vscode.workspace.getConfiguration(CONFIG_NS);
    const enabled = config.get<boolean>('enabled', DEFAULT_SETTINGS.enabled);

    if (!enabled) {
        statusBarItem.text = '$(eye-closed) Eyesbreaker: Off';
        statusBarItem.backgroundColor = undefined;
        statusBarItem.tooltip = 'Eyesbreaker reminders are disabled. Click to open settings.';
        return;
    }

    if (breakController?.isActive) {
        const remaining = breakController.remainingSeconds();
        statusBarItem.text = `$(eye) Break: ${String(remaining).padStart(2, '0')}s`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.tooltip = '20-20-20 break in progress. Look at something 20 feet away!';
        return;
    }

    const remainingMs = Math.max(0, nextBreakAt - Date.now());
    statusBarItem.text = `$(eye) ${formatDuration(remainingMs)}`;
    statusBarItem.backgroundColor = undefined;
    statusBarItem.tooltip = `Next 20-20-20 break in ${formatDuration(remainingMs)}. Click to open settings.`;
}

function buildStatusText(): string {
    const config = vscode.workspace.getConfiguration(CONFIG_NS);
    const enabled = config.get<boolean>('enabled', DEFAULT_SETTINGS.enabled);

    if (!enabled) {
        return 'Reminders disabled';
    }
    if (breakController?.isActive) {
        return 'Break in progress - look away now!';
    }

    const remainingMs = Math.max(0, nextBreakAt - Date.now());
    return `Active - next break in ${formatDuration(remainingMs)}`;
}

// ---- Commands ----

function registerCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('eyesbreaker.openSettings', () => {
            void vscode.commands.executeCommand('workbench.view.extension.eyesbreaker-container');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('eyesbreaker.startBreak', () => {
            startBreak();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('eyesbreaker.toggleEnabled', async () => {
            const config = vscode.workspace.getConfiguration(CONFIG_NS);
            const current = config.get<boolean>('enabled', DEFAULT_SETTINGS.enabled);
            await config.update('enabled', !current, vscode.ConfigurationTarget.Global);
            void vscode.window.showInformationMessage(
                `Eyesbreaker reminders: ${!current ? 'Enabled' : 'Disabled'}`
            );
        })
    );
}
