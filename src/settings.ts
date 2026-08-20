/**
 * Central definition of the Eyesbreaker default settings.
 *
 * These values are used both as fallbacks when a setting is missing and by
 * the "Restore Default Settings" action in the configuration webview.
 */
export const DEFAULT_SETTINGS = {
    enabled: true,
    intervalMinutes: 20,
    breakSeconds: 20,
    soundEnabled: true,
    soundVolume: 1,
    soundPattern: 'alarm',
    snoozeMinutes: 5,
} as const;

/** Valid sound patterns. */
export type SoundPattern = 'alarm' | 'beep' | 'siren';

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** Format milliseconds as mm:ss. */
export function formatDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
