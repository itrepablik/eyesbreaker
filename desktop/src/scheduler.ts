import { EyeBreakSettings } from './settings';

export type BreakPhase = 'idle' | 'break';
export type BreakEndReason = 'completed' | 'dismissed' | 'snoozed';

export interface SchedulerState {
    phase: BreakPhase;
    enabled: boolean;
    nextBreakInMs: number;
    remainingBreakSeconds: number;
}

/**
 * Platform-independent 20-20-20 scheduler. Runs a 1-second heartbeat and
 * notifies callers when a break starts, ticks, or ends.
 */
export class EyeBreakScheduler {
    private heartbeat?: NodeJS.Timeout;
    private settings: EyeBreakSettings;
    private nextBreakAt = 0;
    private breakEndsAt = 0;
    private phase: BreakPhase = 'idle';

    private tickCb?: (state: SchedulerState) => void;
    private breakStartCb?: () => void;
    private breakEndCb?: (reason: BreakEndReason) => void;

    constructor(settings: EyeBreakSettings) {
        this.settings = { ...settings };
    }

    start(): void {
        if (this.heartbeat) {
            return;
        }
        this.reschedule();
        this.heartbeat = setInterval(() => this.tick(), 1000);
        this.emitTick();
    }

    stop(): void {
        if (this.heartbeat) {
            clearInterval(this.heartbeat);
            this.heartbeat = undefined;
        }
    }

    updateSettings(settings: EyeBreakSettings): void {
        this.settings = { ...settings };
        if (this.phase === 'idle') {
            this.reschedule();
        }
        this.emitTick();
    }

    startBreakNow(): void {
        this.beginBreak();
    }

    dismissBreak(): void {
        if (this.phase === 'break') {
            this.endBreak('dismissed');
        }
    }

    snoozeBreak(minutes: number): void {
        if (this.phase === 'break') {
            this.endBreak('snoozed', minutes);
        }
    }

    isActive(): boolean {
        return this.phase === 'break';
    }

    onTick(callback: (state: SchedulerState) => void): void {
        this.tickCb = callback;
    }

    onBreakStart(callback: () => void): void {
        this.breakStartCb = callback;
    }

    onBreakEnd(callback: (reason: BreakEndReason) => void): void {
        this.breakEndCb = callback;
    }

    getState(): SchedulerState {
        return {
            phase: this.phase,
            enabled: this.settings.enabled,
            nextBreakInMs: this.settings.enabled
                ? Math.max(0, this.nextBreakAt - Date.now())
                : 0,
            remainingBreakSeconds: this.phase === 'break'
                ? Math.max(0, Math.ceil((this.breakEndsAt - Date.now()) / 1000))
                : 0,
        };
    }

    private tick(): void {
        if (this.phase === 'break') {
            if (Date.now() >= this.breakEndsAt) {
                this.endBreak('completed');
                return;
            }
            this.emitTick();
            return;
        }

        if (this.settings.enabled && Date.now() >= this.nextBreakAt) {
            this.beginBreak();
            return;
        }

        this.emitTick();
    }

    private beginBreak(): void {
        this.phase = 'break';
        this.breakEndsAt = Date.now() + Math.max(1, this.settings.breakSeconds) * 1000;
        this.breakStartCb?.();
        this.emitTick();
    }

    private endBreak(reason: BreakEndReason, snoozeMinutes?: number): void {
        this.phase = 'idle';
        if (reason === 'snoozed' && snoozeMinutes !== undefined) {
            this.nextBreakAt = Date.now() + Math.max(1, snoozeMinutes) * 60_000;
        } else {
            this.nextBreakAt = Date.now() + Math.max(1, this.settings.intervalMinutes) * 60_000;
        }
        this.breakEndCb?.(reason);
        this.emitTick();
    }

    private reschedule(): void {
        this.nextBreakAt = Date.now() + Math.max(1, this.settings.intervalMinutes) * 60_000;
    }

    private emitTick(): void {
        this.tickCb?.(this.getState());
    }
}
