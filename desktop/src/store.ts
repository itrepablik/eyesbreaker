import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { EyeBreakSettings, DEFAULT_SETTINGS } from './settings';

const FILE_NAME = 'settings.json';

/** Persists Eyesbreaker settings to a JSON file in the user-data directory. */
export class SettingsStore {
    private readonly filePath: string;
    private settings: EyeBreakSettings;

    constructor() {
        this.filePath = path.join(app.getPath('userData'), FILE_NAME);
        this.settings = this.loadFromDisk();
    }

    get(): EyeBreakSettings {
        return { ...this.settings };
    }

    update(patch: Partial<EyeBreakSettings>): EyeBreakSettings {
        this.settings = { ...this.settings, ...patch };
        this.saveToDisk();
        return this.get();
    }

    restoreDefaults(): EyeBreakSettings {
        this.settings = { ...DEFAULT_SETTINGS };
        this.saveToDisk();
        return this.get();
    }

    private loadFromDisk(): EyeBreakSettings {
        try {
            const raw = fs.readFileSync(this.filePath, 'utf8');
            return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
        } catch {
            return { ...DEFAULT_SETTINGS };
        }
    }

    private saveToDisk(): void {
        try {
            fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
            fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf8');
        } catch (err) {
            console.error('[eyesbreaker] Failed to save settings:', err);
        }
    }
}
