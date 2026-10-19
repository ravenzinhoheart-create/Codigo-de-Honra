/**
 * Motoclube
 * Native GPS Bridge
 *
 * Camada de acesso ao GPS.
 * A lógica de negócio permanece em services/location.js.
 */

const NativeGPS = (() => {
  let watchId = null;

  const hasGeolocation =
    typeof navigator !== "undefined" &&
    "geolocation" in navigator;

  const nativeGPS =
    typeof window !== "undefined" &&
    window.MotoclubeNative &&
    window.MotoclubeNative.gps;

  function isSupported() {
    return Boolean(nativeGPS || hasGeolocation);
  }

  function getCurrentPosition(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000
    };

    const finalOptions = {
      ...defaultOptions,
      ...options
    };

    if (nativeGPS?.getCurrentPosition) {
      return nativeGPS.getCurrentPosition(finalOptions);
    }

    if (!hasGeolocation) {
      return Promise.reject(
        new Error("GPS não suportado neste dispositivo.")
      );
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        finalOptions
      );
    });
  }

  function watchPosition(onUpdate, onError, options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000
    };

    const finalOptions = {
      ...defaultOptions,
      ...options
    };

    stopWatching();

    if (nativeGPS?.watchPosition) {
      watchId = nativeGPS.watchPosition(
        onUpdate,
        onError,
        finalOptions
      );

      return watchId;
    }

    if (!hasGeolocation) {
      const error = new Error(
        "GPS não suportado neste dispositivo."
      );

      if (typeof onError === "function") {
        onError(error);
      }

      return null;
    }

    watchId = navigator.geolocation.watchPosition(
      onUpdate,
      onError,
      finalOptions
    );

    return watchId;
  }

  function stopWatching() {
    if (watchId === null) {
      return;
    }

    if (nativeGPS?.clearWatch) {
      nativeGPS.clearWatch(watchId);
    } else if (hasGeolocation) {
      navigator.geolocation.clearWatch(watchId);
    }

    watchId = null;
  }

  async function requestPermission() {
    if (nativeGPS?.requestPermission) {
      return nativeGPS.requestPermission();
    }

    if (!hasGeolocation) {
      return "unsupported";
    }

    /*
     * A permissão do browser é solicitada automaticamente
     * no primeiro acesso ao GPS.
     */
    return "available";
  }

  return Object.freeze({
    isSupported,
    getCurrentPosition,
    watchPosition,
    stopWatching,
    requestPermission
  });
})();

export default NativeGPS;
export const isSupported = NativeGPS.isSupported;
export const getCurrentPosition = NativeGPS.getCurrentPosition;
export const watchPosition = NativeGPS.watchPosition;
export const clearWatch = NativeGPS.stopWatching;
export const stopWatching = NativeGPS.stopWatching;
export const requestPermission = NativeGPS.requestPermission;
