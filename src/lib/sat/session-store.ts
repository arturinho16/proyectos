import fs from 'fs';
import path from 'path';
import { createHash, randomBytes, createCipheriv, createDecipheriv, randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

const SAT_SESSION_DIR = path.join(process.cwd(), '.sat_sessions');
export const SAT_SESSION_COOKIE = 'sat_session_id';

const SECRET = process.env.SAT_SESSION_SECRET || 'cambia-esto-en-produccion-por-un-secreto-largo';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

type StoredSatSession = {
    id: string;
    rfc: string;
    cerBase64Encrypted: string;
    keyBase64Encrypted: string;
    passwordEncrypted: string;
    createdAt: string;
};

export type SatSessionData = {
    id: string;
    rfc: string;
    cerString: string;
    keyString: string;
    password: string;
    createdAt: string;
};

function ensureDir() {
    if (!fs.existsSync(SAT_SESSION_DIR)) {
        fs.mkdirSync(SAT_SESSION_DIR, { recursive: true });
    }
}

function getSessionPath(id: string) {
    return path.join(SAT_SESSION_DIR, `${id}.json`);
}

function getKey() {
    return createHash('sha256').update(SECRET).digest();
}

function encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(payload: string): string {
    const buffer = Buffer.from(payload, 'base64');
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function createSatSession(data: { rfc: string; cerBase64: string; keyBase64: string; password: string }) {
    ensureDir();

    const id = randomUUID();

    const payload: StoredSatSession = {
        id,
        rfc: data.rfc.trim().toUpperCase(),
        cerBase64Encrypted: encrypt(data.cerBase64),
        keyBase64Encrypted: encrypt(data.keyBase64),
        passwordEncrypted: encrypt(data.password),
        createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(getSessionPath(id), JSON.stringify(payload, null, 2), 'utf8');

    return id;
}

export function getSatSessionById(id: string): SatSessionData | null {
    ensureDir();

    const sessionPath = getSessionPath(id);
    if (!fs.existsSync(sessionPath)) {
        return null;
    }

    try {
        const raw = fs.readFileSync(sessionPath, 'utf8');
        const stored = JSON.parse(raw) as StoredSatSession;

        const cerBase64 = decrypt(stored.cerBase64Encrypted);
        const keyBase64 = decrypt(stored.keyBase64Encrypted);
        const password = decrypt(stored.passwordEncrypted);

        return {
            id: stored.id,
            rfc: stored.rfc,
            cerString: Buffer.from(cerBase64, 'base64').toString('binary'),
            keyString: Buffer.from(keyBase64, 'base64').toString('binary'),
            password,
            createdAt: stored.createdAt,
        };
    } catch (error) {
        return null;
    }
}

export function getSatSessionFromRequest(req: NextRequest): SatSessionData | null {
    const sessionId = req.cookies.get(SAT_SESSION_COOKIE)?.value;
    if (!sessionId) {
        return null;
    }

    return getSatSessionById(sessionId);
}

export function clearSatSessionById(id?: string | null) {
    if (!id) return;

    const sessionPath = getSessionPath(id);
    if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
    }
}