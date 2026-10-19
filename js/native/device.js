/**
 * Motoclube
 * Native Device Bridge
 */

const NativeDevice = (() => {
  const nativeDevice =
    typeof window !== "undefined" &&
    window.MotoclubeNative &&
    window.MotoclubeNative.device;

  function getPlatform() {
    if (nativeDevice?.getPlatform) {
      return nativeDevice.getPlatform();
    }

    if (typeof navigator === "undefined") {
      return "unknown";
    }

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes("android")) {
      return "android";
    }

    if (
      ua.includes("iphone") ||
      ua.includes("ipad") ||
      ua.includes("ipod")
    ) {
      return "ios";
    }

    return "web";
  }

  function getUserAgent() {
    if (nativeDevice?.getUserAgent) {
      return nativeDevice.getUserAgent();
    }

    return typeof navigator !== "undefined"
      ? navigator.userAgent
      : "";
  }

  function getLanguage() {
    if (nativeDevice?.getLanguage) {
      return nativeDevice.getLanguage();
    }

    return typeof navigator !== "undefined"
      ? navigator.language
      : "pt-BR";
  }

  function getOnlineStatus() {
    if (nativeDevice?.getOnlineStatus) {
      return nativeDevice.getOnlineStatus();
    }

    return typeof navigator !== "undefined"
      ? navigator.onLine
      : true;
  }

  function getScreen() {
    if (nativeDevice?.getScreen) {
      return nativeDevice.getScreen();
    }

    if (typeof window === "undefined") {
      return {
        width: 0,
        height: 0,
        pixelRatio: 1
      };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1
    };
  }

  function isNative() {
    return Boolean(nativeDevice);
  }

  function isAndroid() {
    return getPlatform() === "android";
  }

  function isIOS() {
    return getPlatform() === "ios";
  }

  function isWeb() {
    return getPlatform() === "web";
  }

  function getInfo() {
    return {
      platform: getPlatform(),
      native: isNative(),
      language: getLanguage(),
      online: getOnlineStatus(),
      screen: getScreen(),
      userAgent: getUserAgent()
    };
  }

  return Object.freeze({
    getPlatform,
    getUserAgent,
    getLanguage,
    getOnlineStatus,
    getScreen,
    isNative,
    isAndroid,
    isIOS,
    isWeb,
    getInfo
  });
})();

export default NativeDevice;