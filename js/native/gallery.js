/**
 * Motoclube
 * Native Gallery Bridge
 */

const NativeGallery = (() => {
  function getNativeGallery() {
    return typeof window !== "undefined" && window.MotoclubeNative
      ? window.MotoclubeNative.gallery
      : null;
  }

  function isSupported() {
    return Boolean(
      getNativeGallery()?.pick ||
      typeof document !== "undefined"
    );
  }

  async function pick({
    multiple = false,
    accept = "image/*"
  } = {}) {
    const nativeGallery = getNativeGallery();
    if (nativeGallery?.pick) {
      const result = await nativeGallery.pick({
        multiple,
        accept
      });
      return Array.isArray(result) ? result : [];
    }

    if (typeof document === "undefined") {
      return [];
    }

    return new Promise((resolve) => {
      const input = document.createElement("input");

      input.type = "file";
      input.accept = accept;
      input.multiple = Boolean(multiple);

      input.addEventListener("change", () => {
        const files = Array.from(input.files || []);
        resolve(files);
        input.remove();
      });

      input.addEventListener("cancel", () => {
        resolve([]);
        input.remove();
      });

      document.body.appendChild(input);
      input.click();
    });
  }

  return Object.freeze({
    isSupported,
    pick
  });
})();

export default NativeGallery;
export const isSupported = NativeGallery.isSupported;
export const isGalleryAvailable = NativeGallery.isSupported;
export const pick = NativeGallery.pick;
export const openGallery = NativeGallery.pick;
