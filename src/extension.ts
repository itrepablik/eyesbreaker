import * as vscode from 'vscode';
import { AnnoyingSoundPlayer } from './sound';
import { BreakReminderController, BreakEndReason } from './breakReminderPanel';
import { SettingsWebviewProvider } from './settingsWebviewProvider';
import { DEFAULT_SETTINGS, clamp, formatDuration, SoundPattern } from './settings';
import { ScheduleStore } from './scheduleStore';

const CONFIG_NS = 'eyesbreaker';

/**
 * A persisted schedule this far past its due time (with no active break) is
 * considered stale from a previous session and is re-established on startup,
 * so reopening VS Code never pops an overdue break.
 */
const STALE_SCHEDULE_GRACE_MS = 15_000;

let statusBarItem: vscode.StatusBarItem | undefined;
let settingsWebview: SettingsWebviewProvider | undefined;
let soundPlayer: AnnoyingSoundPlayer | undefined;
let breakController: BreakReminderController | undefined;
let scheduleStore: ScheduleStore | undefined;
let heartbeat: NodeJS.Timeout | undefined;

/**
 * Called when the extension is activated. Starts the background heartbeat
 * timer that schedules 20-20-20 breaks.
 */
export function activate(context: vscode.ExtensionContext): void {
    soundPlayer = new AnnoyingSoundPlayer(context);

    // The schedule store persists the next-break time and the active break
    // claim to globalStorage, which is shared across every VS Code window.
    scheduleStore = new ScheduleStore(context.globalStorageUri.fsPath);
    scheduleStore.init();

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

    // If another window already established a schedule, adopt it (init did).
    // Otherwise this window creates the shared schedule. A schedule left over
    // from a previous session that is long past due is treated as stale and
    // re-established so reopening VS Code resumes a fresh countdown.
    const enabled = vscode.workspace
        .getConfiguration(CONFIG_NS)
        .get<boolean>('enabled', DEFAULT_SETTINGS.enabled);
    if (enabled) {
        const nextBreakAt = scheduleStore.getNextBreakAt();
        const staleFromPreviousSession =
            nextBreakAt !== 0 &&
            nextBreakAt < Date.now() - STALE_SCHEDULE_GRACE_MS &&
            !scheduleStore.getActiveClaim();
        if (nextBreakAt === 0 || staleFromPreviousSession) {
            resetSchedule();
        }
    }

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
    scheduleStore?.releaseClaim();
    scheduleStore = undefined;
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

    // Adopt schedule changes made by another VS Code window so every window
    // shows the same countdown.
    scheduleStore?.syncFromDisk();

    const config = vscode.workspace.getConfiguration(CONFIG_NS);
    const enabled = config.get<boolean>('enabled', DEFAULT_SETTINGS.enabled);

    // Another window is already showing the break popup; just reflect it.
    if (scheduleStore?.getActiveClaim()) {
        updateStatusBar();
        return;
    }

    if (enabled && scheduleStore && Date.now() >= scheduleStore.getNextBreakAt()) {
        startBreak();
    }

    updateStatusBar();
}

function resetSchedule(): void {
    const config = vscode.workspace.getConfiguration(CONFIG_NS);
    const enabled = config.get<boolean>('enabled', DEFAULT_SETTINGS.enabled);
    if (!enabled) {
        return;
    }
    scheduleStore?.setNextBreakAt(Date.now() + getIntervalMinutes() * 60_000);
    updateStatusBar();
}

function getIntervalMinutes(): number {
    const config = vscode.workspace.getConfiguration(CONFIG_NS);
    return Math.round(clamp(config.get<number>('intervalMinutes', DEFAULT_SETTINGS.intervalMinutes), 1, 120));
}

function handleBreakEnd(reason: BreakEndReason, snoozeMinutes?: number): void {
    // Release our ownership of the popup so other windows resume the countdown.
    scheduleStore?.releaseClaim();

    if (reason === 'snoozed') {
        const config = vscode.workspace.getConfiguration(CONFIG_NS);
        const minutes = snoozeMinutes
            ?? clamp(config.get<number>('snoozeMinutes', DEFAULT_SETTINGS.snoozeMinutes), 1, 60);
        scheduleStore?.setNextBreakAt(Date.now() + minutes * 60_000);
    } else {
        scheduleStore?.setNextBreakAt(Date.now() + getIntervalMinutes() * 60_000);
    }

    // The countdown ran all the way to zero (rather than being dismissed or
    // snoozed): chime so the user knows the break is over and they can look
    // back at the screen.
    if (reason === 'completed') {
        playCompletionSound();
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

    // This window already owns the popup: just (re)start the countdown.
    if (breakController?.isActive) {
        breakController.start(breakSeconds, snoozeMinutes);
        playBreakSound();
        updateStatusBar();
        return;
    }

    const startAt = Date.now();
    const endAt = startAt + breakSeconds * 1000;

    // Only one window (across all VS Code instances) may show the popup. The
    // claim is created exclusively, so exactly one window wins.
    if (!scheduleStore?.claimBreak(startAt, endAt)) {
        // Another window already owns the active break; just reflect it.
        updateStatusBar();
        return;
    }

    // Pre-arm the post-break schedule so every window stays in sync even if
    // this window closes mid-break.
    scheduleStore?.setNextBreakAt(startAt + getIntervalMinutes() * 60_000);

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

/** Chime that plays when the break countdown reaches zero. */
function playCompletionSound(): void {
    const config = vscode.workspace.getConfiguration(CONFIG_NS);

    if (!config.get<boolean>('soundEnabled', DEFAULT_SETTINGS.soundEnabled)) {
        return;
    }

    const volume = clamp(config.get<number>('soundVolume', DEFAULT_SETTINGS.soundVolume), 0, 1);
    soundPlayer?.playCompletion(volume);
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

    // A break is active in another VS Code window: mirror it here.
    const activeClaim = scheduleStore?.getActiveClaim();
    if (activeClaim) {
        const remaining = Math.max(0, Math.ceil((activeClaim.endAt - Date.now()) / 1000));
        statusBarItem.text = `$(eye) Break: ${String(remaining).padStart(2, '0')}s`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.tooltip = '20-20-20 break in progress (in another window). Look away from your screen!';
        return;
    }

    const remainingMs = Math.max(0, (scheduleStore?.getNextBreakAt() ?? Date.now()) - Date.now());
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
    if (scheduleStore?.getActiveClaim()) {
        return 'Break in progress (in another window) - look away now!';
    }

    const remainingMs = Math.max(0, (scheduleStore?.getNextBreakAt() ?? Date.now()) - Date.now());
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
