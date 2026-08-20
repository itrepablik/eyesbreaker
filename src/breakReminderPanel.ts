import * as vscode from 'vscode';

export type BreakEndReason = 'completed' | 'dismissed' | 'snoozed' | 'disposed';

interface BreakWebviewMessage {
    type: 'ready' | 'dismiss' | 'snooze' | 'replaySound';
}

/**
 * Owns the full-screen (editor-column) break reminder panel and its
 * 20-second countdown. The extension host is the source of truth for timing;
 * the webview only renders the countdown it receives.
 */
export class BreakReminderController {
    private panel?: vscode.WebviewPanel;
    private countdown?: NodeJS.Timeout;
    private endTime = 0;
    private totalSeconds = 20;
    private snoozeMinutes = 5;
    private ending = false;

    private readonly extensionUri: vscode.Uri;
    private readonly onEnd: (reason: BreakEndReason, snoozeMinutes?: number) => void;
    private readonly onReplaySound?: () => void;

    constructor(
        extensionUri: vscode.Uri,
        onEnd: (reason: BreakEndReason, snoozeMinutes?: number) => void,
        onReplaySound?: () => void
    ) {
        this.extensionUri = extensionUri;
        this.onEnd = onEnd;
        this.onReplaySound = onReplaySound;
    }

    get isActive(): boolean {
        return this.panel !== undefined;
    }

    remainingSeconds(): number {
        if (!this.panel) {
            return 0;
        }
        return Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
    }

    /** Open (or reveal) the break reminder and start its countdown. */
    start(breakSeconds: number, snoozeMinutes: number): void {
        this.snoozeMinutes = Math.max(1, Math.round(snoozeMinutes));

        if (this.panel) {
            this.panel.reveal();
            this.resetCountdown(breakSeconds);
            return;
        }

        this.totalSeconds = Math.max(5, Math.round(breakSeconds));
        const panel = vscode.window.createWebviewPanel(
            'eyesbreakerBreak',
            '20-20-20 Break',
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.extensionUri],
            }
        );

        this.panel = panel;
        panel.webview.html = this.buildHtml();
        panel.webview.onDidReceiveMessage((msg: BreakWebviewMessage) => this.handleMessage(msg));
        panel.onDidDispose(() => this.finish('disposed'));

        this.resetCountdown(this.totalSeconds);
    }

    dispose(): void {
        this.finish('disposed');
    }

    private resetCountdown(seconds: number): void {
        if (this.countdown) {
            clearInterval(this.countdown);
        }

        this.totalSeconds = Math.max(1, Math.round(seconds));
        this.endTime = Date.now() + this.totalSeconds * 1000;
        this.post({
            type: 'start',
            total: this.totalSeconds,
            snoozeMinutes: this.snoozeMinutes,
            remaining: this.totalSeconds,
        });

        this.countdown = setInterval(() => this.tick(), 1000);
        this.tick();
    }

    private tick(): void {
        const remaining = this.remainingSeconds();
        this.post({ type: 'tick', remaining });
        if (remaining <= 0) {
            this.finish('completed');
        }
    }

    private handleMessage(msg: BreakWebviewMessage): void {
        switch (msg.type) {
            case 'ready':
                this.post({
                    type: 'start',
                    total: this.totalSeconds,
                    snoozeMinutes: this.snoozeMinutes,
                    remaining: this.remainingSeconds(),
                });
                break;
            case 'dismiss':
                this.finish('dismissed');
                break;
            case 'snooze':
                this.finish('snoozed');
                break;
            case 'replaySound':
                this.onReplaySound?.();
                break;
        }
    }

    private finish(reason: BreakEndReason): void {
        if (this.ending) {
            return;
        }
        this.ending = true;

        if (this.countdown) {
            clearInterval(this.countdown);
            this.countdown = undefined;
        }

        const panel = this.panel;
        this.panel = undefined;
        if (panel) {
            panel.dispose();
        }

        this.ending = false;
        this.onEnd(reason);
    }

    private post(message: unknown): void {
        if (!this.panel) {
            return;
        }
        void this.panel.webview.postMessage(message);
    }

    private buildHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    :root {
        --bg: var(--vscode-editor-background, #1e1e1e);
        --card-bg: var(--vscode-sideBar-background, #252526);
        --fg: var(--vscode-foreground, #cccccc);
        --muted: var(--vscode-descriptionForeground, #9d9d9d);
        --border: var(--vscode-panel-border, #3c3c3c);
        --accent: var(--vscode-focusBorder, #007acc);
        --warn: var(--vscode-editorWarning-foreground, #cca700);
        --btn-bg: var(--vscode-button-background, #0e639c);
        --btn-fg: var(--vscode-button-foreground, #ffffff);
        --btn-hover: var(--vscode-button-hoverBackground, #1177bb);
        --btn-secondary: var(--vscode-button-secondaryBackground, #3a3d41);
        --btn-secondary-hover: var(--vscode-button-secondaryHoverBackground, #45494e);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; }
    body {
        font-family: var(--vscode-font-family, -apple-system, sans-serif);
        background: var(--bg);
        color: var(--fg);
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
    }
    .card {
        max-width: 520px;
        width: calc(100% - 48px);
        padding: 36px 32px 28px;
        border-radius: 14px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        text-align: center;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
    }
    h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
    .rule {
        font-size: 14px;
        color: var(--muted);
        line-height: 1.55;
        margin-bottom: 28px;
    }
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
    .bar {
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: var(--btn-secondary);
        overflow: hidden;
        margin-bottom: 16px;
    }
    .bar-fill {
        height: 100%;
        width: 100%;
        background: var(--warn);
        border-radius: 4px;
        transition: width 0.9s linear;
    }
    .hint {
        font-size: 14px;
        color: var(--fg);
        margin-bottom: 26px;
        min-height: 20px;
    }
    .actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .btn {
        padding: 9px 18px;
        border: none;
        border-radius: 5px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        color: var(--btn-fg);
    }
    .btn.primary { background: var(--btn-bg); }
    .btn.primary:hover { background: var(--btn-hover); }
    .btn.secondary { background: var(--btn-secondary); }
    .btn.secondary:hover { background: var(--btn-secondary-hover); }
    .link {
        margin-top: 16px;
        background: none;
        border: none;
        color: var(--muted);
        font-size: 12px;
        cursor: pointer;
        text-decoration: underline;
        padding: 2px 6px;
    }
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
        <div class="countdown" id="countdown">20</div>
        <div class="seconds-label">seconds remaining</div>
        <div class="bar"><div class="bar-fill" id="bar"></div></div>
        <p class="hint" id="hint">Look away from your screen now.</p>
        <div class="actions">
            <button class="btn primary" id="dismissBtn">I'm looking away</button>
            <button class="btn secondary" id="snoozeBtn">Snooze 5 min</button>
        </div>
        <button class="link" id="replayBtn">Replay annoying sound</button>
    </div>

<script>
const vscode = acquireVsCodeApi();
let total = 20;

function post(msg) { vscode.postMessage(msg); }

window.addEventListener('message', function (e) {
    const d = e.data;
    if (!d) return;

    if (d.type === 'start') {
        total = Number(d.total) || 20;
        document.getElementById('snoozeBtn').textContent =
            'Snooze ' + (Number(d.snoozeMinutes) || 5) + ' min';
        render(d.remaining !== undefined ? d.remaining : total);
    } else if (d.type === 'tick') {
        render(d.remaining);
    }
});

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
    post({ type: 'replaySound' });
});

post({ type: 'ready' });
</script>
</body>
</html>`;
    }
}
