/** Shared settings types and defaults for the Eyesbreaker desktop app. */
export type SoundPattern = 'alarm' | 'beep' | 'siren';

export interface EyeBreakSettings {
    enabled: boolean;
    intervalMinutes: number;
    breakSeconds: number;
    soundEnabled: boolean;
    soundVolume: number;
    soundPattern: SoundPattern;
    snoozeMinutes: number;
    launchAtLogin: boolean;
}

export const DEFAULT_SETTINGS: EyeBreakSettings = {
    enabled: true,
    intervalMinutes: 20,
    breakSeconds: 20,
    soundEnabled: true,
    soundVolume: 1,
    soundPattern: 'alarm',
    snoozeMinutes: 5,
    launchAtLogin: false,
};

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function formatDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
