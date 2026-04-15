type SatSession = {
    rfc: string;
    password: string;
    cerBase64: string;
    keyBase64: string;
    createdAt: number;
    updatedAt: number;
};

const globalForSat = globalThis as typeof globalThis & {
    __SAT_SESSION__?: SatSession | null;
};

export function setSatSession(input: {
    rfc: string;
    password: string;
    cerBase64: string;
    keyBase64: string;
}) {
    const now = Date.now();

    globalForSat.__SAT_SESSION__ = {
        ...input,
        createdAt: globalForSat.__SAT_SESSION__?.createdAt ?? now,
        updatedAt: now,
    };

    return globalForSat.__SAT_SESSION__;
}

export function getSatSession(): SatSession | null {
    return globalForSat.__SAT_SESSION__ ?? null;
}

export function clearSatSession() {
    globalForSat.__SAT_SESSION__ = null;
}

export function getSatCredentialsAsBinary():
    | {
        rfc: string;
        password: string;
        cerString: string;
        keyString: string;
    }
    | null {
    const session = getSatSession();

    if (!session) return null;

    return {
        rfc: session.rfc,
        password: session.password,
        cerString: Buffer.from(session.cerBase64, 'base64').toString('binary'),
        keyString: Buffer.from(session.keyBase64, 'base64').toString('binary'),
    };
}