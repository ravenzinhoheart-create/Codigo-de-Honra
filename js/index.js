// =========================================================
// MOTOCLUBE
// Application Entry Point
// =========================================================

import { native } from "./native/index.js";
import { USER_STATUS } from "./core/constants.js";
import { session } from "./core/session.js";
import { router } from "./core/router.js";
import { navbar } from "./components/navbar.js";
import { hydrateIcons } from "./icons/icons.js";
import { initSosFab } from "./components/sos-fab.js";
import { selectMedia } from "./services/media.js";
import { initDropdowns } from "./components/dropdown.js";
import { initializeAuth } from "./services/auth.js";

// PWA: registro opcional. O navegador exige HTTPS (ou localhost).
function registerPwaServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .catch(error => console.warn('[PWA] Não foi possível registrar o service worker:', error));
    }, { once: true });
}
registerPwaServiceWorker();

const App = {
    initialized: false,
    iconObserver: null,
    nativeSelectObserver: null,
    mediaBridgeInstalled: false,

    async init() {
        if (this.initialized) return;
        this.initialized = true;

        try {
            console.info("[MotoClube] Inicializando aplicação...");

            // O Supabase é a fonte de verdade da sessão.
            session.initialize();
            await initializeAuth();

            hydrateIcons(document);
            initDropdowns(document);
            this.installNativeSelectGuard();
            this.installIconObserver();
            this.installMediaBridge();

            if (navbar?.initialize) {
                navbar.initialize();
            }

            if (router?.initialize) {
                await router.initialize();
            }

            initSosFab();
            await this.initNative();

            document.documentElement.dataset.appReady = "true";

            console.info("[MotoClube] Aplicação inicializada.");
        } catch (error) {
            console.error(
                "[MotoClube] Falha na inicialização:",
                error
            );

            document.documentElement.dataset.appReady = "error";
            throw error;
        }
    },


    installMediaBridge() {
        if (this.mediaBridgeInstalled) return;
        this.mediaBridgeInstalled = true;

        document.addEventListener("media:gallery", async event => {
            const target = event.target;
            if (!target || !target.dispatchEvent) return;
            try {
                const user = session.getUser?.();
                const media = await selectMedia({
    multiple: true,
    userId: user?.id || null,
    onProgress: progress => {
        try {
            target.dispatchEvent(
                new CustomEvent("media:progress", {
                    bubbles: true,
                    detail: progress
                })
            );
        } catch {}
    }
});
                if (!media.length) return;
                target.dispatchEvent(new CustomEvent("media:selected", {
                    bubbles: true,
                    detail: { media }
                }));
            } catch (error) {
                console.error("[MEDIA] Falha na galeria:", error);
                try { target.dispatchEvent(new CustomEvent('media:error', { bubbles: true, detail: { error } })); } catch {}
            }
        });
    },

    installNativeSelectGuard() {
        if (this.nativeSelectObserver || typeof MutationObserver === "undefined") return;

        const root = document.getElementById("app");
        if (!root) return;

        this.nativeSelectObserver = new MutationObserver(mutations => {
            let needsInit = false;
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.matches?.("select") || node.querySelector?.("select")) {
                        needsInit = true;
                        break;
                    }
                }
                if (needsInit) break;
            }
            if (needsInit) initDropdowns(root);
        });

        this.nativeSelectObserver.observe(root, { childList: true, subtree: true });
    },

    installIconObserver() {
        if (
            this.iconObserver ||
            typeof MutationObserver === "undefined"
        ) {
            return;
        }

        const root = document.getElementById("app-view");
        if (!root) return;

        this.iconObserver = new MutationObserver(() => {
            hydrateIcons(root);
        });

        this.iconObserver.observe(root, {
            childList: true,
            subtree: true
        });
    },

    async initNative() {
        if (!native) return;

        if (native.device?.init) {
            await native.device.init();
        }

        if (native.notifications?.isSupported) {
            console.info(
                "[MotoClube] Notificações:",
                native.notifications.isSupported()
                    ? "suportadas"
                    : "não suportadas"
            );
        }

        if (native.gps?.init) {
            await native.gps.init();
        }

        if (native.vibration?.init) {
            await native.vibration.init();
        }
    }
};

window.MotoClube = Object.freeze({
    App,
    native,
    USER_STATUS,
    router,
    navbar,
    hydrateIcons
});

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        () => App.init(),
        { once: true }
    );
} else {
    App.init();
}

export default App;

