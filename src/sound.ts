import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import type { SoundPattern } from './settings';

const SAMPLE_RATE = 44100;
const SOUND_SECONDS = 3.6;

/**
 * Plays an intentionally annoying alarm sound from the extension host.
 *
 * The sound is generated as a PCM WAV buffer at runtime (no binary asset is
 * required) and handed to the platform's audio player. Doing this in the
 * extension host avoids the autoplay restrictions that webviews may impose.
 */
export class AnnoyingSoundPlayer {
    private readonly storageDir: string;
    private readonly cache = new Map<string, string>();

    constructor(context: vscode.ExtensionContext) {
        this.storageDir = context.globalStorageUri.fsPath;
    }

    /** Play the selected annoying sound pattern at the given volume (0..1). */
    play(pattern: SoundPattern, volume: number): void {
        this.playGenerated(
            `${pattern}:${volume}`,
            'eyesbreaker-sound.wav',
            () => generateWav(pattern, volume),
            volume
        );
    }

    /**
     * Play a short, pleasant chime that signals the break countdown has
     * finished, so the user knows they can look back at the screen.
     */
    playCompletion(volume: number): void {
        this.playGenerated(
            `complete:${volume}`,
            'eyesbreaker-done.wav',
            () => generateCompletionWav(volume),
            volume
        );
    }

    /**
     * Generate (once, then cache) a WAV clip and hand it to the platform
     * audio player. Guarded against generating/playing at zero volume.
     */
    private playGenerated(
        signature: string,
        fileName: string,
        generate: () => Buffer,
        volume: number
    ): void {
        if (volume <= 0) {
            return;
        }

        let filePath = this.cache.get(signature);
        if (!filePath) {
            try {
                fs.mkdirSync(this.storageDir, { recursive: true });
                filePath = path.join(this.storageDir, fileName);
                fs.writeFileSync(filePath, generate());
                this.cache.set(signature, filePath);
            } catch (err) {
                console.error('[eyesbreaker] Failed to generate sound:', err);
                return;
            }
        }

        this.playFile(filePath);
    }

    private playFile(filePath: string): void {
        try {
            if (process.platform === 'win32') {
                const escapedPath = filePath.replace(/'/g, "''");
                const command = `(New-Object System.Media.SoundPlayer '${escapedPath}').PlaySync()`;
                const child = spawn(
                    'powershell.exe',
                    ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', command],
                    { stdio: 'ignore' }
                );
                child.on('error', (err) => console.error('[eyesbreaker] Sound playback failed:', err));
                child.unref();
                return;
            }

            if (process.platform === 'darwin') {
                const child = spawn('afplay', [filePath], { stdio: 'ignore' });
                child.on('error', (err) => console.error('[eyesbreaker] Sound playback failed:', err));
                child.unref();
                return;
            }

            // Linux fallback: prefer PulseAudio's paplay, then ALSA's aplay.
            const child = spawn('paplay', [filePath], { stdio: 'ignore' });
            child.on('error', () => {
                const fallback = spawn('aplay', [filePath], { stdio: 'ignore' });
                fallback.unref();
            });
            child.unref();
        } catch (err) {
            console.error('[eyesbreaker] Sound playback failed:', err);
        }
    }
}

/** Build a 16-bit mono PCM WAV buffer containing the annoying pattern. */
function generateWav(pattern: SoundPattern, volume: number): Buffer {
    const numSamples = Math.floor(SAMPLE_RATE * SOUND_SECONDS);
    const data = Buffer.alloc(numSamples * 2);
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const amplitude = Math.round(32767 * 0.6 * clampedVolume);

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        let sample = 0;

        if (pattern === 'beep') {
            const cycle = t % 0.25;
            if (cycle < 0.12) {
                sample = Math.round(amplitude * square(1000, t) * envelope(t));
            }
        } else if (pattern === 'siren') {
            sample = Math.round(amplitude * square(sirenFrequency(t), t) * envelope(t));
        } else {
            // alarm: a classic two-tone nag.
            const cycle = t % 0.4;
            const freq = cycle < 0.2 ? 1200 : 800;
            sample = Math.round(amplitude * square(freq, t) * envelope(t));
        }

        data.writeInt16LE(sample, i * 2);
    }

    return buildWav(data);
}

/**
 * Build a short, pleasant "countdown finished" chime: two rising sine notes
 * (C6 then E6) with soft attack/release so it sounds distinctly different from
 * the harsh break alarm.
 */
function generateCompletionWav(volume: number): Buffer {
    const noteSeconds = 0.3;
    const numSamples = Math.floor(SAMPLE_RATE * noteSeconds * 2);
    const data = Buffer.alloc(numSamples * 2);
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const amplitude = Math.round(32767 * 0.55 * clampedVolume);

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const secondNote = t >= noteSeconds;
        const noteT = secondNote ? t - noteSeconds : t;
        const frequency = secondNote ? 1318.5 : 1046.5; // E6 then C6
        const tone = Math.sin(2 * Math.PI * frequency * noteT) * noteEnvelope(noteT, noteSeconds);
        data.writeInt16LE(Math.round(amplitude * tone), i * 2);
    }

    return buildWav(data);
}

/** Smooth fade-in/out envelope shared by the completion chime notes. */
function noteEnvelope(t: number, duration: number): number {
    const attack = 0.012;
    const release = 0.12;
    if (t < attack) {
        return t / attack;
    }
    if (t > duration - release) {
        return Math.max(0, (duration - t) / release);
    }
    return 1;
}

function square(frequency: number, t: number): number {
    return Math.sin(2 * Math.PI * frequency * t) >= 0 ? 1 : -1;
}

function sirenFrequency(t: number): number {
    const period = 1.8;
    const phase = (t % period) / period;
    if (phase < 0.5) {
        return 600 + (phase / 0.5) * 800;
    }
    return 1400 - ((phase - 0.5) / 0.5) * 800;
}

function envelope(t: number): number {
    const attack = 0.005;
    const release = 0.08;
    if (t < attack) {
        return t / attack;
    }
    if (t > SOUND_SECONDS - release) {
        return Math.max(0, (SOUND_SECONDS - t) / release);
    }
    return 1;
}

function buildWav(samples: Buffer): Buffer {
    const header = Buffer.alloc(44);
    const dataSize = samples.length;

    header.write('RIFF', 0, 'ascii');
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8, 'ascii');
    header.write('fmt ', 12, 'ascii');
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM
    header.writeUInt16LE(1, 22); // mono
    header.writeUInt32LE(SAMPLE_RATE, 24);
    header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
    header.writeUInt16LE(2, 32); // block align
    header.writeUInt16LE(16, 34); // bits per sample
    header.write('data', 36, 'ascii');
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, samples]);
}
