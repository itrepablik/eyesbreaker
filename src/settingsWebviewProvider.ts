import * as vscode from 'vscode';
import { DEFAULT_SETTINGS, clamp } from './settings';

interface SettingsMessage {
    type:
        | 'setEnabled'
        | 'setInterval'
        | 'setBreakSeconds'
        | 'setSoundEnabled'
        | 'setSoundPattern'
        | 'setVolume'
        | 'setSnoozeMinutes'
        | 'testBreak'
        | 'restoreDefaults';
    value?: string | boolean | number;
}

/**
 * Activity Bar webview that renders a modern settings form (the same style as
 * the reference AISUG project): toggles, number inputs, a select, and a
 * volume slider, all persisted straight to VS Code settings.
 */
export class SettingsWebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private readonly extensionUri: vscode.Uri;
    private readonly getStatusText: () => string;

    constructor(extensionUri: vscode.Uri, getStatusText: () => string) {
        this.extensionUri = extensionUri;
        this.getStatusText = getStatusText;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };

        webviewView.webview.html = this.buildHtml();
        this.updateWebviewContent();

        webviewView.webview.onDidReceiveMessage((msg: SettingsMessage) => {
            void this.handleMessage(msg);
        });

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateWebviewContent();
            }
        });
    }

    /** Push the latest settings and status into the webview. */
    refresh(): void {
        this.updateWebviewContent();
    }

    private async handleMessage(msg: SettingsMessage): Promise<void> {
        const config = vscode.workspace.getConfiguration('eyesbreaker');

        switch (msg.type) {
            case 'setEnabled':
                await config.update('enabled', Boolean(msg.value), vscode.ConfigurationTarget.Global);
                break;
            case 'setInterval':
                await config.update(
                    'intervalMinutes',
                    clamp(Number(msg.value), 1, 120),
                    vscode.ConfigurationTarget.Global
                );
                break;
            case 'setBreakSeconds':
                await config.update(
                    'breakSeconds',
                    clamp(Number(msg.value), 5, 300),
                    vscode.ConfigurationTarget.Global
                );
                break;
            case 'setSoundEnabled':
                await config.update('soundEnabled', Boolean(msg.value), vscode.ConfigurationTarget.Global);
                break;
            case 'setSoundPattern':
                await config.update('soundPattern', String(msg.value), vscode.ConfigurationTarget.Global);
                break;
            case 'setVolume':
                await config.update(
                    'soundVolume',
                    clamp(Number(msg.value), 0, 1),
                    vscode.ConfigurationTarget.Global
                );
                break;
            case 'setSnoozeMinutes':
                await config.update(
                    'snoozeMinutes',
                    clamp(Number(msg.value), 1, 60),
                    vscode.ConfigurationTarget.Global
                );
                break;
            case 'testBreak':
                await vscode.commands.executeCommand('eyesbreaker.startBreak');
                break;
            case 'restoreDefaults': {
                const confirmation = await vscode.window.showWarningMessage(
                    'Restore all Eyesbreaker settings to their default values?',
                    { modal: true },
                    'Restore Defaults'
                );

                if (confirmation !== 'Restore Defaults') {
                    break;
                }

                await Promise.all([
                    config.update('enabled', DEFAULT_SETTINGS.enabled, vscode.ConfigurationTarget.Global),
                    config.update('intervalMinutes', DEFAULT_SETTINGS.intervalMinutes, vscode.ConfigurationTarget.Global),
                    config.update('breakSeconds', DEFAULT_SETTINGS.breakSeconds, vscode.ConfigurationTarget.Global),
                    config.update('soundEnabled', DEFAULT_SETTINGS.soundEnabled, vscode.ConfigurationTarget.Global),
                    config.update('soundVolume', DEFAULT_SETTINGS.soundVolume, vscode.ConfigurationTarget.Global),
                    config.update('soundPattern', DEFAULT_SETTINGS.soundPattern, vscode.ConfigurationTarget.Global),
                    config.update('snoozeMinutes', DEFAULT_SETTINGS.snoozeMinutes, vscode.ConfigurationTarget.Global),
                ]);
                this.updateWebviewContent();
                break;
            }
        }
    }

    private updateWebviewContent(): void {
        if (!this.view) {
            return;
        }

        const config = vscode.workspace.getConfiguration('eyesbreaker');

        void this.view.webview.postMessage({
            type: 'updateState',
            statusText: this.getStatusText(),
            enabled: config.get<boolean>('enabled', DEFAULT_SETTINGS.enabled),
            intervalMinutes: config.get<number>('intervalMinutes', DEFAULT_SETTINGS.intervalMinutes),
            breakSeconds: config.get<number>('breakSeconds', DEFAULT_SETTINGS.breakSeconds),
            soundEnabled: config.get<boolean>('soundEnabled', DEFAULT_SETTINGS.soundEnabled),
            soundVolume: config.get<number>('soundVolume', DEFAULT_SETTINGS.soundVolume),
            soundPattern: config.get<string>('soundPattern', DEFAULT_SETTINGS.soundPattern),
            snoozeMinutes: config.get<number>('snoozeMinutes', DEFAULT_SETTINGS.snoozeMinutes),
        });
    }

    private buildHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    :root {
        --bg: var(--vscode-sideBar-background, #1e1e2e);
        --fg: var(--vscode-sideBar-foreground, #cdd6f4);
        --input-bg: var(--vscode-input-background, #313244);
        --input-fg: var(--vscode-input-foreground, #cdd6f4);
        --input-border: var(--vscode-input-border, #45475a);
        --input-focus: var(--vscode-focusBorder, #89b4fa);
        --btn-bg: var(--vscode-button-background, #2563eb);
        --btn-fg: var(--vscode-button-foreground, #ffffff);
        --btn-hover: var(--vscode-button-hoverBackground, #3b82f6);
        --good: #22c55e;
        --muted: var(--vscode-descriptionForeground, #6c7086);
        --border-subtle: var(--vscode-sideBar-border, #313244);
        --warn: #f59e0b;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: var(--vscode-font-family, -apple-system, sans-serif);
        font-size: 13px;
        color: var(--fg);
        background: var(--bg);
        padding: 10px 0 16px;
        user-select: none;
        line-height: 1.4;
    }
    .section-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: var(--muted);
        padding: 10px 12px 6px;
    }
    .section-note {
        font-size: 12px;
        color: var(--muted);
        padding: 0 12px 8px;
        line-height: 1.45;
    }
    .field {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-subtle);
    }
    .field:last-child { border-bottom: none; }
    .field label {
        flex: 0 0 auto;
        min-width: 90px;
        font-weight: 500;
        white-space: nowrap;
        color: var(--fg);
        font-size: 13px;
    }
    .field-desc {
        font-size: 11px;
        color: var(--muted);
        padding: 0 12px 8px;
        line-height: 1.4;
    }
    .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle .slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background: var(--input-border);
        border-radius: 20px;
        transition: background 0.15s;
    }
    .toggle .slider::before {
        content: '';
        position: absolute;
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background: white;
        border-radius: 50%;
        transition: transform 0.15s;
    }
    .toggle input:checked + .slider { background: var(--good); }
    .toggle input:checked + .slider::before { transform: translateX(16px); }

    input[type="text"],
    input[type="number"],
    select {
        flex: 1;
        background: var(--input-bg);
        color: var(--input-fg);
        border: 1px solid var(--input-border);
        border-radius: 4px;
        padding: 5px 8px;
        font-size: 13px;
        font-family: var(--vscode-editor-font-family, var(--vscode-font-family, monospace));
        outline: none;
        min-width: 0;
        line-height: 1.3;
    }
    input:focus, select:focus { border-color: var(--input-focus); }
    select {
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236c7086'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
        padding-right: 24px;
    }
    input[type="number"] { width: 80px; flex: 0 0 80px; }
    .field-row { display: flex; gap: 6px; align-items: center; flex: 1; }
    .field-row .unit { color: var(--muted); font-size: 12px; flex-shrink: 0; }

    input[type="range"] {
        flex: 1;
        accent-color: var(--btn-bg);
        cursor: pointer;
    }
    .range-value { color: var(--muted); font-size: 12px; min-width: 42px; text-align: right; }

    .btn {
        display: block;
        width: calc(100% - 24px);
        margin: 12px;
        padding: 8px;
        background: var(--btn-bg);
        color: var(--btn-fg);
        border: none;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        text-align: center;
    }
    .btn:hover { background: var(--btn-hover); }
    .btn.secondary {
        background: transparent;
        color: var(--fg);
        border: 1px solid var(--input-border);
        margin-top: 0;
    }
    .btn.secondary:hover { background: var(--input-bg); }

    .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 6px;
        flex-shrink: 0;
    }
    .status-dot.on { background: var(--good); }
    .status-dot.off { background: var(--muted); }
    .status-dot.warn { background: var(--warn); }
    .info-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        font-size: 12px;
        color: var(--muted);
    }
</style>
</head>
<body>

<div class="section-title">Status</div>
<div class="info-row">
    <span class="status-dot" id="statusDot"></span>
    <span id="statusText"></span>
</div>

<div class="section-title">Reminder</div>
<div class="section-note">Follow the 20-20-20 rule: every 20 minutes, look 20 feet away for 20 seconds.</div>

<div class="field">
    <label>Enabled</label>
    <label class="toggle">
        <input type="checkbox" id="enabledToggle" onchange="onToggle('setEnabled', this)">
        <span class="slider"></span>
    </label>
</div>
<div class="field-desc">Master switch for all Eyesbreaker reminders.</div>

<div class="field">
    <label>Interval</label>
    <div class="field-row">
        <input type="number" id="intervalInput" min="1" max="120" onchange="onNumber('setInterval', this.value, 1, 120)">
        <span class="unit">minutes</span>
    </div>
</div>
<div class="field-desc">How often to remind you. Default is 20 minutes.</div>

<div class="field">
    <label>Break length</label>
    <div class="field-row">
        <input type="number" id="breakSecondsInput" min="5" max="300" onchange="onNumber('setBreakSeconds', this.value, 5, 300)">
        <span class="unit">seconds</span>
    </div>
</div>
<div class="field-desc">How long the reminder stays on screen before it disappears. Default is 20 seconds.</div>

<div class="section-title">Sound</div>
<div class="section-note">The sound is intentionally annoying so you actually look away from the screen.</div>

<div class="field">
    <label>Sound</label>
    <label class="toggle">
        <input type="checkbox" id="soundEnabledToggle" onchange="onToggle('setSoundEnabled', this)">
        <span class="slider"></span>
    </label>
</div>
<div class="field-desc">Play a sound when a break starts.</div>

<div class="field">
    <label>Pattern</label>
    <select id="patternSelect" onchange="onSelect('setSoundPattern', this)">
        <option value="alarm">Alarm — two-tone nag</option>
        <option value="beep">Beep — fast repetitive beeper</option>
        <option value="siren">Siren — rising and falling</option>
    </select>
</div>
<div class="field-desc">Choose the kind of annoying you prefer.</div>

<div class="field">
    <label>Volume</label>
    <input type="range" id="volumeSlider" min="0" max="100" value="100" oninput="onVolume(this.value)">
    <span class="range-value" id="volumeValue">100%</span>
</div>
<div class="field-desc">Volume of the break sound (0 to 100%).</div>

<div class="section-title">Snooze</div>

<div class="field">
    <label>Snooze</label>
    <div class="field-row">
        <input type="number" id="snoozeInput" min="1" max="60" onchange="onNumber('setSnoozeMinutes', this.value, 1, 60)">
        <span class="unit">minutes</span>
    </div>
</div>
<div class="field-desc">How long to postpone the reminder when you press Snooze.</div>

<button class="btn" onclick="post({type:'testBreak'})">Test Break Now</button>
<button class="btn secondary" onclick="post({type:'restoreDefaults'})">Restore Default Settings</button>

<script>
const vscode = acquireVsCodeApi();

function post(msg) { vscode.postMessage(msg); }

window.addEventListener('message', function (e) {
    const d = e.data;
    if (!d || d.type !== 'updateState') return;

    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    dot.className = 'status-dot ' + (d.enabled ? (d.soundEnabled ? 'on' : 'warn') : 'off');
    txt.textContent = d.statusText;

    document.getElementById('enabledToggle').checked = d.enabled;

    const interval = document.getElementById('intervalInput');
    if (document.activeElement !== interval) interval.value = d.intervalMinutes;

    const breakSeconds = document.getElementById('breakSecondsInput');
    if (document.activeElement !== breakSeconds) breakSeconds.value = d.breakSeconds;

    document.getElementById('soundEnabledToggle').checked = d.soundEnabled;
    document.getElementById('patternSelect').value = d.soundPattern;

    const slider = document.getElementById('volumeSlider');
    if (document.activeElement !== slider) slider.value = Math.round(d.soundVolume * 100);
    document.getElementById('volumeValue').textContent = Math.round(d.soundVolume * 100) + '%';

    const snooze = document.getElementById('snoozeInput');
    if (document.activeElement !== snooze) snooze.value = d.snoozeMinutes;
});

function onToggle(type, el) { post({ type: type, value: el.checked }); }
function onSelect(type, el) { post({ type: type, value: el.value }); }

function onNumber(type, val, min, max) {
    const n = parseInt(val, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(min, Math.min(max, n));
    post({ type: type, value: clamped });
    const el = document.activeElement;
    if (el && el.tagName === 'INPUT') el.value = clamped;
}

function onVolume(val) {
    const percent = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
    document.getElementById('volumeValue').textContent = percent + '%';
    post({ type: 'setVolume', value: percent / 100 });
}
</script>
</body>
</html>`;
    }
}
