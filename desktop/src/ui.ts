import type { EyeBreakSettings } from './settings';
import { formatDuration } from './settings';

/** Full-screen break reminder with countdown, progress, and sound playback. */
export function breakScreenHtml(totalSeconds: number, snoozeMinutes: number): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    :root {
        --bg: #1e1e1e;
        --card-bg: #252526;
        --fg: #cccccc;
        --muted: #9d9d9d;
        --border: #3c3c3c;
        --warn: #cca700;
        --btn-bg: #0e639c;
        --btn-fg: #ffffff;
        --btn-hover: #1177bb;
        --btn-secondary: #3a3d41;
        --btn-secondary-hover: #45494e;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; overflow: hidden; }
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--bg);
        color: var(--fg);
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        overflow: hidden;
    }
    .card {
        max-width: 520px;
        width: 100%;
        padding: 28px 28px 24px;
        border-radius: 14px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        text-align: center;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
    }
    h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
    .rule { font-size: 14px; color: var(--muted); line-height: 1.55; margin-bottom: 28px; }
    .countdown {
        font-size: 96px;
        font-weight: 700;
        line-height: 1;
        color: var(--warn);
        font-variant-numeric: tabular-nums;
    }
    .seconds-label {
        font-size: 13px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 1.2px;
        margin: 8px 0 22px;
    }
    .bar { width: 100%; height: 8px; border-radius: 4px; background: var(--btn-secondary); overflow: hidden; margin-bottom: 16px; }
    .bar-fill { height: 100%; width: 100%; background: var(--warn); border-radius: 4px; transition: width 0.9s linear; }
    .hint { font-size: 14px; color: var(--fg); margin-bottom: 26px; min-height: 20px; }
    .actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .btn { padding: 9px 18px; border: none; border-radius: 5px; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--btn-fg); }
    .btn.primary { background: var(--btn-bg); }
    .btn.primary:hover { background: var(--btn-hover); }
    .btn.secondary { background: var(--btn-secondary); }
    .btn.secondary:hover { background: var(--btn-secondary-hover); }
    .link { margin-top: 16px; background: none; border: none; color: var(--muted); font-size: 12px; cursor: pointer; text-decoration: underline; padding: 2px 6px; }
    .link:hover { color: var(--fg); }
</style>
</head>
<body>
    <div class="card">
        <h1>20-20-20 Break</h1>
        <p class="rule">
            Every 20 minutes, look at something <strong>20 feet away</strong>
            for <strong>20 seconds</strong> to reduce digital eye strain.
        </p>
        <div class="countdown" id="countdown">${totalSeconds}</div>
        <div class="seconds-label">seconds remaining</div>
        <div class="bar"><div class="bar-fill" id="bar"></div></div>
        <p class="hint" id="hint">Look away from your screen now.</p>
        <div class="actions">
            <button class="btn primary" id="dismissBtn">I'm looking away</button>
            <button class="btn secondary" id="snoozeBtn">Snooze ${snoozeMinutes} min</button>
        </div>
        <button class="link" id="replayBtn">Replay annoying sound</button>
    </div>

<script>
const bridge = window.eyesbreakerBridge;
let total = ${totalSeconds};
let lastSoundDataUrl = '';
let currentAudio = null;

function post(msg) { bridge.postMessage(msg); }

bridge.onMessage(function (d) {
    if (!d) return;
    if (d.type === 'start') {
        total = Number(d.total) || ${totalSeconds};
        document.getElementById('snoozeBtn').textContent =
            'Snooze ' + (Number(d.snoozeMinutes) || ${snoozeMinutes}) + ' min';
        if (d.soundDataUrl) {
            lastSoundDataUrl = d.soundDataUrl;
            playSound(d.soundDataUrl);
        }
        render(d.remaining !== undefined ? d.remaining : total);
    } else if (d.type === 'tick') {
        render(d.remaining);
    }
});

function playSound(dataUrl) {
    stopSound();
    currentAudio = new Audio(dataUrl);
    currentAudio.play().catch(function () {});
}

function stopSound() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
}

function render(remaining) {
    const sec = Math.max(0, Number(remaining) || 0);
    document.getElementById('countdown').textContent = String(sec).padStart(2, '0');
    const pct = total > 0 ? Math.min(100, Math.max(0, (sec / total) * 100)) : 0;
    document.getElementById('bar').style.width = pct + '%';
    document.getElementById('hint').textContent = sec <= 0
        ? 'Time is up! Look away now and give your eyes a rest.'
        : 'Look at something 20 feet away for 20 seconds.';
}

document.getElementById('dismissBtn').addEventListener('click', function () {
    post({ type: 'dismiss' });
});
document.getElementById('snoozeBtn').addEventListener('click', function () {
    post({ type: 'snooze' });
});
document.getElementById('replayBtn').addEventListener('click', function () {
    if (lastSoundDataUrl) playSound(lastSoundDataUrl);
});

post({ type: 'ready' });
</script>
</body>
</html>`;
}

/** Settings window with the same webview-style form as the VS Code extension. */
export function settingsScreenHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    :root {
        --bg: #1e1e2e;
        --fg: #cdd6f4;
        --input-bg: #313244;
        --input-fg: #cdd6f4;
        --input-border: #45475a;
        --input-focus: #89b4fa;
        --btn-bg: #2563eb;
        --btn-fg: #ffffff;
        --btn-hover: #3b82f6;
        --good: #22c55e;
        --muted: #6c7086;
        --border-subtle: #313244;
        --warn: #f59e0b;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
    .section-note { font-size: 12px; color: var(--muted); padding: 0 12px 8px; line-height: 1.45; }
    .field { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); }
    .field label { flex: 0 0 auto; min-width: 90px; font-weight: 500; white-space: nowrap; color: var(--fg); font-size: 13px; }
    .field-desc { font-size: 11px; color: var(--muted); padding: 0 12px 8px; line-height: 1.4; }
    .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle .slider { position: absolute; cursor: pointer; inset: 0; background: var(--input-border); border-radius: 20px; transition: background 0.15s; }
    .toggle .slider::before { content: ''; position: absolute; height: 16px; width: 16px; left: 2px; bottom: 2px; background: white; border-radius: 50%; transition: transform 0.15s; }
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
    input[type="range"] { flex: 1; accent-color: var(--btn-bg); cursor: pointer; }
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
    .btn.secondary { background: transparent; color: var(--fg); border: 1px solid var(--input-border); margin-top: 0; }
    .btn.secondary:hover { background: var(--input-bg); }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; flex-shrink: 0; }
    .status-dot.on { background: var(--good); }
    .status-dot.off { background: var(--muted); }
    .status-dot.warn { background: var(--warn); }
    .info-row { display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12px; color: var(--muted); }
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
const bridge = window.eyesbreakerBridge;

function post(msg) { bridge.postMessage(msg); }

bridge.onMessage(function (d) {
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

/** Build the updateState message sent to the settings window. */
export function settingsUpdateMessage(settings: EyeBreakSettings, statusText: string): unknown {
    return {
        type: 'updateState',
        statusText,
        enabled: settings.enabled,
        intervalMinutes: settings.intervalMinutes,
        breakSeconds: settings.breakSeconds,
        soundEnabled: settings.soundEnabled,
        soundVolume: settings.soundVolume,
        soundPattern: settings.soundPattern,
        snoozeMinutes: settings.snoozeMinutes,
    };
}
