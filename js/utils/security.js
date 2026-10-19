// Motoclube — Security Utils

export function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function sanitizeText(value, maxLength = 10000) {
    return String(value ?? '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .trim()
        .slice(0, maxLength);
}

export function sanitizeUrl(value, {
    protocols = ['http:', 'https:']
} = {}) {
    try {
        const url = new URL(String(value));

        if (!protocols.includes(url.protocol)) {
            return null;
        }

        return url.href;
    } catch {
        return null;
    }
}

export function isSafeUrl(value) {
    return sanitizeUrl(value) !== null;
}

export function generateId(prefix = '') {
    const uuid =
        globalThis.crypto?.randomUUID?.();

    if (uuid) {
        return prefix
            ? `${prefix}_${uuid}`
            : uuid;
    }

    const random =
        Math.random().toString(36).slice(2);

    return prefix
        ? `${prefix}_${Date.now()}_${random}`
        : `${Date.now()}_${random}`;
}

export function generateToken(length = 32) {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    const array = new Uint32Array(length);

    if (globalThis.crypto?.getRandomValues) {
        crypto.getRandomValues(array);
    } else {
        for (let i = 0; i < length; i++) {
            array[i] = Math.floor(
                Math.random() * 0xffffffff
            );
        }
    }

    return Array.from(
        array,
        value => chars[value % chars.length]
    ).join('');
}

export async function sha256(value) {
    const encoder = new TextEncoder();

    const data = encoder.encode(
        String(value ?? '')
    );

    const hash = await crypto.subtle.digest(
        'SHA-256',
        data
    );

    return Array.from(
        new Uint8Array(hash),
        byte => byte.toString(16).padStart(2, '0')
    ).join('');
}

export function constantTimeEqual(a, b) {
    const first = String(a ?? '');
    const second = String(b ?? '');

    if (first.length !== second.length) {
        return false;
    }

    let result = 0;

    for (let i = 0; i < first.length; i++) {
        result |= first.charCodeAt(i) ^ second.charCodeAt(i);
    }

    return result === 0;
}

export function safeJsonParse(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

export function safeJsonStringify(value, fallback = '') {
    try {
        return JSON.stringify(value);
    } catch {
        return fallback;
    }
}

export function removeSensitiveFields(
    object,
    fields = [
        'password',
        'password_confirmation',
        'token',
        'access_token',
        'refresh_token',
        'secret'
    ]
) {
    if (!object || typeof object !== 'object') {
        return object;
    }

    const result = Array.isArray(object)
        ? [...object]
        : { ...object };

    for (const field of fields) {
        if (Array.isArray(result)) {
            continue;
        }

        if (Object.prototype.hasOwnProperty.call(result, field)) {
            delete result[field];
        }
    }

    return result;
}

export function isSecureContextAvailable() {
    return Boolean(
        globalThis.isSecureContext
    );
}

export function canUseWebCrypto() {
    return Boolean(
        globalThis.crypto?.subtle
    );
}