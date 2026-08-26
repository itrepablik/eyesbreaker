import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

/**
 * Shared, cross-window scheduling state for Eyesbreaker.
 *
 * VS Code runs one extension host instance per window. To keep every window on
 * the *same* countdown and to show only *one* 20-20-20 popup, this module
 * persists two small files inside the extension's global storage directory
 * (`ExtensionContext.globalStorageUri`), which is shared by every VS Code
 * window running the extension on the same machine:
 *
 * - `schedule.json`     -> the single source of truth for "next break at".
 * - `break.claim.json`  -> which window currently owns the active break popup
 *                          (created atomically with an exclusive flag so only
 *                          one window can ever win the claim).
 *
 * Reads are tolerant of missing/corrupt files (e.g. a concurrent mid-write) and
 * simply fall back to the last known value until the next read.
 */

/** Contents of the shared schedule file. */
export interface ScheduleState {
    /** Epoch ms when the next 20-20-20 break should fire. */
    nextBreakAt: number;
    /** Epoch ms of the last write. */
    updatedAt: number;
    /** hostId of the window that wrote it last. */
    updatedBy: string;
}

/** Contents of the claim file (which window owns the active break popup). */
export interface BreakClaim {
    hostId: string;
    startAt: number;
    endAt: number;
}

const SCHEDULE_FILE = 'schedule.json';
const CLAIM_FILE = 'break.claim.json';

/**
 * Upper bound for how long a claim may live. The longest configurable break is
 * 300 seconds, so anything claiming to last much longer is stale/corrupt.
 */
const MAX_BREAK_MS = 10 * 60_000;

/**
 * A claim file that exists but cannot be parsed is considered mid-write by
 * another window unless it is older than this; older unparseable claims are
 * treated as corrupt leftovers and reclaimed.
 */
const CLAIM_WRITE_GRACE_MS = 2_000;

export class ScheduleStore {
    /** Unique id for this extension host instance (one per VS Code window). */
    readonly hostId: string = randomUUID();

    private readonly dir: string;
    private readonly schedulePath: string;
    private readonly claimPath: string;

    /** Local mirror of the shared schedule (the file on disk is the truth). */
    private nextBreakAt = 0;
    private updatedAt = 0;
    private updatedBy = '';

    constructor(globalStoragePath: string) {
        this.dir = globalStoragePath;
        this.schedulePath = path.join(globalStoragePath, SCHEDULE_FILE);
        this.claimPath = path.join(globalStoragePath, CLAIM_FILE);
    }

    /**
     * Adopt an existing shared schedule (if any) at startup so a newly opened
     * window joins the countdown already running in other windows.
     */
    init(): void {
        const state = this.readSchedule();
        if (state) {
            this.nextBreakAt = state.nextBreakAt;
            this.updatedAt = state.updatedAt;
            this.updatedBy = state.updatedBy;
        }
    }

    getNextBreakAt(): number {
        return this.nextBreakAt;
    }

    /** Persist a new next-break time so every window shares it. */
    setNextBreakAt(nextBreakAt: number): void {
        this.nextBreakAt = nextBreakAt;
        this.updatedAt = Date.now();
        this.updatedBy = this.hostId;
        const payload = JSON.stringify({
            version: 1,
            nextBreakAt,
            updatedAt: this.updatedAt,
            updatedBy: this.hostId,
        });
        this.writeFile(this.schedulePath, payload);
    }

    /**
     * Re-read the shared schedule and adopt it if another window changed it.
     * Returns true when the local value changed. Called from the heartbeat so
     * every window converges on the same countdown within a second.
     */
    syncFromDisk(): boolean {
        const state = this.readSchedule();
        if (!state || state.nextBreakAt === this.nextBreakAt) {
            return false;
        }
        this.nextBreakAt = state.nextBreakAt;
        this.updatedAt = state.updatedAt;
        this.updatedBy = state.updatedBy;
        return true;
    }

    /**
     * Try to become the single window that shows the break popup.
     *
     * The claim file is created with the OS-level exclusive flag (`wx`), so at
     * most one window can ever succeed. A claim is stolen (removed + retried)
     * when it is stale: already past its end time or impossibly far in the
     * future (i.e. the owning window crashed mid-break).
     *
     * @returns true only if this window won the claim and should show the popup.
     */
    claimBreak(startAt: number, endAt: number): boolean {
        const payload = JSON.stringify({ hostId: this.hostId, startAt, endAt });

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                fs.mkdirSync(this.dir, { recursive: true });
                fs.writeFileSync(this.claimPath, payload, { flag: 'wx' });
                return true;
            } catch (err) {
                const code = (err as NodeJS.ErrnoException).code;
                if (code !== 'EEXIST') {
                    return false;
                }

                const existing = this.readClaim();
                const now = Date.now();
                if (existing) {
                    if (existing.endAt > now && existing.endAt <= now + MAX_BREAK_MS) {
                        // Another window legitimately owns the active break.
                        return false;
                    }
                    // Provably stale (break already over or impossibly long) ->
                    // remove it and retry.
                    try {
                        fs.unlinkSync(this.claimPath);
                    } catch {
                        // ignore; another window may have removed it first
                    }
                } else {
                    // The claim exists but is unreadable: another window is
                    // mid-write. Only reclaim it if it is clearly a leftover.
                    try {
                        const st = fs.statSync(this.claimPath);
                        if (Date.now() - st.mtimeMs <= CLAIM_WRITE_GRACE_MS) {
                            return false; // fresh write in progress elsewhere
                        }
                        try {
                            fs.unlinkSync(this.claimPath);
                        } catch {
                            // ignore
                        }
                    } catch {
                        // File disappeared between read and stat; retry.
                    }
                }
            }
        }

        return false;
    }

    /** Release the break claim, but only if this window still owns it. */
    releaseClaim(): void {
        const existing = this.readClaim();
        if (existing && existing.hostId === this.hostId) {
            try {
                fs.unlinkSync(this.claimPath);
            } catch {
                // ignore
            }
        }
    }

    /** The currently active break popup (owned by any window), or null. */
    getActiveClaim(): BreakClaim | null {
        const claim = this.readClaim();
        if (!claim || claim.endAt <= Date.now()) {
            return null;
        }
        return claim;
    }

    // ---- helpers ----

    private readSchedule(): ScheduleState | null {
        try {
            const raw = fs.readFileSync(this.schedulePath, 'utf8');
            const data = JSON.parse(raw) as Partial<ScheduleState>;
            if (typeof data.nextBreakAt === 'number' && Number.isFinite(data.nextBreakAt)) {
                return {
                    nextBreakAt: data.nextBreakAt,
                    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
                    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
                };
            }
            return null;
        } catch {
            // Missing, corrupt, or caught mid-write; caller keeps last value.
            return null;
        }
    }

    private readClaim(): BreakClaim | null {
        try {
            const raw = fs.readFileSync(this.claimPath, 'utf8');
            const data = JSON.parse(raw) as Partial<BreakClaim>;
            if (
                typeof data.hostId === 'string' &&
                typeof data.startAt === 'number' &&
                typeof data.endAt === 'number'
            ) {
                return { hostId: data.hostId, startAt: data.startAt, endAt: data.endAt };
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Write via a temp file + rename so a concurrent reader never sees half a
     * file. On Windows rename onto an existing file fails, so the destination
     * is removed first when needed.
     */
    private writeFile(filePath: string, data: string): void {
        fs.mkdirSync(this.dir, { recursive: true });
        const tmp = `${filePath}.tmp`;
        fs.writeFileSync(tmp, data);
        try {
            fs.renameSync(tmp, filePath);
        } catch {
            try {
                fs.unlinkSync(filePath);
            } catch {
                // ignore
            }
            try {
                fs.renameSync(tmp, filePath);
            } catch {
                // ignore; a later write will retry
            }
        }
    }
}
