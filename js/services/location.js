import NativeGPS from "../native/gps.js";

let activeWatch = null;

export async function getCurrentLocation(options = {}) {
    return NativeGPS.getCurrentPosition(options);
}

export function startTracking(callback, options = {}) {
    stopTracking();

    activeWatch = NativeGPS.watchPosition(
        position => callback?.(position),
        error => callback?.(null, error),
        options
    );

    return activeWatch;
}

export function stopTracking() {
    if (activeWatch !== null) {
        NativeGPS.stopWatching();
        activeWatch = null;
    }
}

export function isTracking() {
    return activeWatch !== null;
}

export function normalizeLocation(position) {
    if (!position) return null;

    const coords = position.coords || position;

    return {
        latitude: Number(coords.latitude),
        longitude: Number(coords.longitude),
        accuracy: coords.accuracy ?? null,
        altitude: coords.altitude ?? null,
        heading: coords.heading ?? null,
        speed: coords.speed ?? null,
        timestamp:
            position.timestamp ||
            new Date().toISOString()
    };
}
