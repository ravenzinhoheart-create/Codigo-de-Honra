// =========================================================
// MOTOCLUBE
// Native Bridge
// =========================================================

import * as notifications from "./notifications.js";
import NativeGPS from "./gps.js";
import NativeGallery from "./gallery.js";
import NativeVibration from "./vibration.js";
import NativeDevice from "./device.js";

/*
 * API nativa centralizada.
 *
 * Cada propriedade aponta para a API real do módulo,
 * e não para um namespace contendo apenas `default`.
 */
export const native = Object.freeze({
    notifications,
    gps: NativeGPS,
    gallery: NativeGallery,
    vibration: NativeVibration,
    microphone: window.MotoclubeNative?.microphone || null,
    communications: window.MotoclubeNative?.communications || null,
    sos: window.MotoclubeNative?.sos || null,
    device: NativeDevice
});

export {
    notifications,
    NativeGPS as gps,
    NativeGallery as gallery,
    NativeVibration as vibration,
    NativeDevice as device
};

export default native;
