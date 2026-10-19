/**
 * Motoclube
 * Native Vibration Bridge
 */

const NativeVibration = (() => {
  const nativeVibration =
    typeof window !== "undefined" &&
    window.MotoclubeNative &&
    window.MotoclubeNative.vibration;

  const hasVibration =
    typeof navigator !== "undefined" &&
    "vibrate" in navigator;

  function isSupported() {
    return Boolean(nativeVibration || hasVibration);
  }

  function vibrate(pattern = 100) {
    if (nativeVibration?.vibrate) {
      return nativeVibration.vibrate(pattern);
    }

    if (!hasVibration) {
      return false;
    }

    return navigator.vibrate(pattern);
  }

  function short() {
    return vibrate(60);
  }

  function medium() {
    return vibrate(150);
  }

  function long() {
    return vibrate(300);
  }

  function sos() {
    return vibrate([
      120,
      80,
      120,
      80,
      350
    ]);
  }

  function stop() {
    if (nativeVibration?.cancel) {
      return nativeVibration.cancel();
    }

    if (!hasVibration) {
      return false;
    }

    return navigator.vibrate(0);
  }

  return Object.freeze({
    isSupported,
    vibrate,
    short,
    medium,
    long,
    sos,
    stop
  });
})();

export default NativeVibration;