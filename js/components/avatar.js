import { icon } from "../icons/icons.js";
import { getMediaUrl } from "../services/media.js";
import { events } from "../core/events.js";

// Avatar global: a URL may be resolved asynchronously while a view is being
// rendered. Because many views use outerHTML, the resolver must also hydrate
// clones inserted into the DOM after createAvatar() returned.
const resolved = new Map();
const pending = new Map();
let observerStarted = false;
let avatarEventBound = false;

function bindAvatarEvents() {
    if (avatarEventBound) return;
    avatarEventBound = true;
    events.on("profile:avatar-updated", payload => {
        const path = String(payload?.path || "").trim();
        const previewUrl = String(payload?.previewUrl || "").trim();
        if (!path || !previewUrl) return;

        // O arquivo do avatar usa um caminho estável e é sobrescrito no Storage.
        // A URL/Blob antigo não pode continuar preso no cache em memória.
        resolved.set(path, previewUrl);
        pending.delete(path);

        document.querySelectorAll(".avatar[data-avatar-source]").forEach(node => {
            if (node.dataset.avatarSource === path) setState(node, previewUrl);
        });
    });
}

function startObserver() {
    if (observerStarted || typeof MutationObserver === "undefined") return;
    observerStarted = true;
    const hydrate = root => {
        if (!root?.querySelectorAll) return;
        const nodes = [];
        if (root.matches?.(".avatar[data-avatar-source]")) nodes.push(root);
        nodes.push(...root.querySelectorAll(".avatar[data-avatar-source]"));
        for (const node of nodes) hydrateElement(node);
    };
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) hydrate(node);
            }
        }
    });
    const boot = () => {
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
            hydrate(document.body);
        }
    };
    if (document.body) boot();
    else document.addEventListener("DOMContentLoaded", boot, { once: true });
}

function setState(root, url) {
    const img = root?.querySelector?.(".avatar__image");
    const fallback = root?.querySelector?.(".avatar__fallback");
    if (!img || !fallback) return;

    root.classList.remove("is-loading");

    if (!url) {
        img.hidden = true;
        img.removeAttribute("src");
        fallback.hidden = false;
        return;
    }

    img.onload = () => {
        root.classList.remove("is-loading");
        img.hidden = false;
        fallback.hidden = true;
    };
    img.onerror = () => {
        root.classList.remove("is-loading");
        img.hidden = true;
        img.removeAttribute("src");
        fallback.hidden = false;
    };

    img.hidden = true;
    fallback.hidden = false;
    img.src = url;
}

function hydrateElement(root) {
    const path = String(root?.dataset?.avatarSource || "").trim();
    if (!path) return;

    if (resolved.has(path)) {
        setState(root, resolved.get(path));
        return;
    }

    // Keep the normal avatar fallback visible while the signed URL is being
    // resolved. A remote request must never leave a permanent spinner.
    setState(root, "");

    if (!pending.has(path)) {
        const promise = getMediaUrl(path, 3600, { forceDownload: true })
            .then(url => {
                const value = String(url || "");
                resolved.set(path, value);
                return value;
            })
            .catch(error => {
                console.warn("[AVATAR] Não foi possível resolver a mídia:", error);
                resolved.set(path, "");
                return "";
            });
        pending.set(path, promise);
        promise.finally(() => pending.delete(path));
    }

    pending.get(path).then(url => {
        document.querySelectorAll(`.avatar[data-avatar-source]`).forEach(node => {
            if (node.dataset.avatarSource === path) setState(node, url);
        });
        // The original wrapper may not be in the document yet.
        if (root?.isConnected) setState(root, url);
    });
}

function createAvatar(options = {}) {
    bindAvatarEvents();
    const {
        src = "",
        username = "",
        size = "medium",
        status = null
    } = options;

    const wrapper = document.createElement("div");
    wrapper.className = ["avatar", `avatar--${size}`].filter(Boolean).join(" ");
    if (status) wrapper.dataset.status = status;
    wrapper.setAttribute("role", "img");
    wrapper.setAttribute("aria-label", username ? `Avatar de ${username}` : "Avatar");

    const image = document.createElement("img");
    image.className = "avatar__image";
    image.alt = "";
    image.decoding = "async";
    image.loading = "eager";
    image.hidden = true;

    const fallbackElement = document.createElement("span");
    fallbackElement.className = "avatar__fallback";
    fallbackElement.innerHTML = icon("user", { size: 24, decorative: true });
    fallbackElement.setAttribute("aria-hidden", "true");

    wrapper.appendChild(image);
    wrapper.appendChild(fallbackElement);

    if (status) {
        const statusRing = document.createElement("span");
        statusRing.className = "avatar__status-ring";
        statusRing.dataset.status = status;
        wrapper.appendChild(statusRing);
    }

    const value = String(src || "").trim();

    if (!value) {
        setState(wrapper, "");
        return wrapper;
    }

    if (/^(https?:|blob:|data:)/i.test(value)) {
        setState(wrapper, value);
        return wrapper;
    }

    wrapper.dataset.avatarSource = value;
    startObserver();
    hydrateElement(wrapper);

    return wrapper;
}

export { createAvatar };
