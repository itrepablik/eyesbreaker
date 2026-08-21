import type { SoundPattern } from './settings';

const SAMPLE_RATE = 44100;
const SOUND_SECONDS = 3.6;

/** Generate an intentionally annoying 16-bit mono PCM WAV. */
export function generateAlarmWav(pattern: SoundPattern, volume: number): Uint8Array {
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
            const cycle = t % 0.4;
            const freq = cycle < 0.2 ? 1200 : 800;
            sample = Math.round(amplitude * square(freq, t) * envelope(t));
        }

        data.writeInt16LE(sample, i * 2);
    }

    return new Uint8Array(buildWav(data));
}

/** Generate the WAV and return a data URL suitable for <audio> playback. */
export function wavDataUrl(pattern: SoundPattern, volume: number): string {
    const bytes = generateAlarmWav(pattern, volume);
    const base64 = Buffer.from(bytes).toString('base64');
    return `data:audio/wav;base64,${base64}`;
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
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(SAMPLE_RATE, 24);
    header.writeUInt32LE(SAMPLE_RATE * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36, 'ascii');
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, samples]);
}
