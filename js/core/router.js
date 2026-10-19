// =========================================================
// MOTOCLUBE
// SPA Router
// =========================================================

import {
    PUBLIC_ROUTES,
    PRIVATE_ROUTES
} from "./constants.js";

import { session } from "./session.js";
import { store } from "./store.js";
import { events } from "./events.js";
import { hydrateIcons } from "../icons/icons.js";
import { initDropdowns } from "../components/dropdown.js";

const ROUTES = Object.freeze({
    login: {
        auth: false,
        renderer: "renderLogin",
        containerRenderer: true,
        loader: () => import("../views/auth/login.js")
    },

    register: {
        auth: false,
        renderer: "renderRegister",
        containerRenderer: true,
        loader: () => import("../views/auth/register.js")
    },

    home: {
        auth: true,
        renderer: "renderHome",
        loader: () => import("../views/home/home.js")
    },

    club: {
        auth: true,
        renderer: "renderClub",
        loader: () => import("../views/club/club.js")
    },

    "member-profile": {
        auth: true,
        renderer: "renderMemberProfile",
        loader: () => import("../views/club/member-profile.js")
    },

    events: {
        auth: true,
        renderer: "renderEvents",
        loader: () => import("../views/events/events.js")
    },

    "event-create": {
        auth: true,
        renderer: "renderEventCreate",
        loader: () => import("../views/events/event-create.js")
    },

    "event-edit": {
        auth: true,
        renderer: "renderEventEdit",
        loader: () => import("../views/events/event-edit.js")
    },

    marketplace: {
        auth: true,
        renderer: "renderMarketplace",
        containerRenderer: true,
        loader: () => import("../views/marketplace/marketplace.js")
    },

    "product-detail": {
        auth: true,
        renderer: "renderProductDetail",
        loader: () => import("../views/marketplace/product-detail.js")
    },

    "product-create": {
        auth: true,
        renderer: "renderProductCreate",
        loader: () => import("../views/marketplace/product-create.js")
    },

    "product-edit": {
        auth: true,
        renderer: "renderProductEdit",
        loader: () => import("../views/marketplace/product-edit.js")
    },

    profile: {
        auth: true,
        renderer: "renderProfile",
        loader: () => import("../views/profile/profile.js")
    },

    settings: {
        auth: true,
        renderer: "renderSettings",
        loader: () => import("../views/profile/settings.js")
    },

    vehicles: {
        auth: true,
        renderer: "renderVehicles",
        loader: () => import("../views/profile/vehicles.js")
    },

    "vehicle-create": {
        auth: true,
        renderer: "renderVehicleCreate",
        loader: () => import("../views/profile/vehicle-create.js")
    },

    "vehicle-edit": {
        auth: true,
        renderer: "renderVehicleEdit",
        loader: () => import("../views/profile/vehicle-edit.js")
    },

    ride: {
        auth: true,
        renderer: "renderRide",
        loader: () => import("../views/ride/ride.js")
    },

    sos: {
        auth: true,
        renderer: "renderSos",
        loader: () => import("../views/sos/sos.js")
    },

    "sos-create": {
        auth: true,
        renderer: "renderSosCreate",
        loader: () => import("../views/sos/sos-create.js")
    },

    "sos-detail": {
        auth: true,
        renderer: "renderSosDetail",
        loader: () => import("../views/sos/sos-detail.js")
    },

    "post-create": {
        auth: true,
        renderer: "renderPostCreate",
        loader: () => import("../views/posts/post-create.js")
    },

    "post-detail": {
        auth: true,
        renderer: "renderPostDetail",
        loader: () => import("../views/posts/post-detail.js")
    }
});

class Router {
    constructor() {
        this.currentRoute = null;
        this.previousRoute = null;
        this.initialized = false;
        this.navigationId = 0;
    }

    initialize() {
        if (this.initialized) return;

        this.initialized = true;

        window.addEventListener("popstate", () => {
            this.resolveCurrentLocation();
        });

        return this.resolveCurrentLocation();
    }

    normalize(path) {
        let normalized = String(path || "")
            .trim()
            .replace(/^\/+/, "")
            .replace(/\/+$/, "")
            .toLowerCase();

        if (!normalized) return "home";

        // Quando o app é aberto como arquivo local/WebView, o pathname
        // pode ser algo como /storage/emulated/0/CDHMC/index.html.
        if (normalized.endsWith("index.html")) {
            return session.isAuthenticated() ? "home" : "login";
        }

        // Suporta tanto /events/create quanto /event-create.
        normalized = normalized.replace(/\/+?/g, "-");
        normalized = normalized.replace(/^-+|-+$/g, "");

        return normalized || "home";
    }

    resolveCurrentLocation() {
        const route = this.normalize(window.location.pathname);
        const data = window.history.state?.data || {};

        return this.navigate(route, {
            replace: true,
            fromHistory: true,
            data
        });
    }

    async navigate(route, options = {}) {
        const target = this.normalize(route);
        const config = ROUTES[target];

        if (!config) {
            console.warn(`[ROUTER] Rota inexistente: ${target}`);

            return this.navigate(
                session.isAuthenticated() ? "home" : "login",
                { replace: true }
            );
        }

        if (config.auth && !session.isAuthenticated()) {
            return this.navigate("login", {
                replace: true,
                data: {}
            });
        }

        if (
            !config.auth &&
            session.isAuthenticated() &&
            PUBLIC_ROUTES.includes(target)
        ) {
            return this.navigate("home", { replace: true });
        }

        const navigationId = ++this.navigationId;

        this.previousRoute = this.currentRoute;
        this.currentRoute = target;

        store.set("navigation.previousRoute", this.previousRoute);
        store.set("navigation.route", target);

        events.emit("navigation:before", {
            from: this.previousRoute,
            to: target
        });

        try {
            const container = document.getElementById("app-view");
            let loadingTimer = null;
            if (container) {
                container.setAttribute("aria-busy", "true");
                loadingTimer = window.setTimeout(() => {
                    if (navigationId !== this.navigationId) return;
                    container.classList.add("is-route-loading");
                }, 120);
            }

            const module = await config.loader();

            if (navigationId !== this.navigationId) {
                if (loadingTimer) clearTimeout(loadingTimer);
                return;
            }

            const viewRenderer =
                module[config.renderer];

            if (typeof viewRenderer !== "function") {
                throw new Error(
                    `A view "${target}" não possui renderer válido (${config.renderer}).`
                );
            }

            const renderContainer = document.getElementById("app-view");

            if (!renderContainer) {
                throw new Error("Elemento #app-view não encontrado.");
            }

            renderContainer.innerHTML = "";

            const data = getNavigationData(options);

            if (config.containerRenderer) {
                await viewRenderer(renderContainer, data);
            } else {
                await viewRenderer(data);
            }

            hydrateIcons(renderContainer);
            // Nenhuma view deixa um <select> nativo exposto ao usuário.
            initDropdowns(renderContainer);
            renderContainer.classList.remove("is-route-loading");
            renderContainer.removeAttribute("aria-busy");
            if (loadingTimer) clearTimeout(loadingTimer);

            events.emit("navigation:after", {
                from: this.previousRoute,
                to: target,
                route: target,
                data
            });

            /*
             * Evento DOM somente para componentes que não usam
             * diretamente o EventBus. A navbar usa o EventBus,
             * mas manter este evento torna a navegação observável
             * sem precisar sobrescrever history.pushState.
             */
            window.dispatchEvent(
                new CustomEvent("motoclube:navigation", {
                    detail: {
                        from: this.previousRoute,
                        to: target,
                        route: target,
                        data
                    }
                })
            );

            if (!options.fromHistory) {
                const state = {
                    route: target,
                    data
                };

                const url = `/${target}`;

                if (options.replace) {
                    history.replaceState(state, "", url);
                } else {
                    history.pushState(state, "", url);
                }
            }

            return true;
        } catch (error) {
            console.error(
                `[ROUTER] Falha ao carregar "${target}":`,
                error
            );

            events.emit("navigation:error", {
                route: target,
                error
            });

            return false;
        }
    }

    back() {
        window.history.back();
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    isPublicRoute(route) {
        return PUBLIC_ROUTES.includes(this.normalize(route));
    }

    isPrivateRoute(route) {
        return PRIVATE_ROUTES.includes(this.normalize(route));
    }

    resolveRenderer(module, route) {
        const target = ROUTES[this.normalize(route)];
        return target
            ? module[target.renderer]
            : undefined;
    }
}

function getNavigationData(options = {}) {
    if (options?.fromHistory) {
        return options.data || {};
    }

    if (
        options &&
        Object.prototype.hasOwnProperty.call(options, "data")
    ) {
        return options.data || {};
    }

    const data = { ...options };
    delete data.replace;
    delete data.fromHistory;
    return data;
}

export const router = new Router();

// Compatibilidade com versões anteriores da inicialização.
export function initRouter() {
    return router.initialize();
}

export { Router, ROUTES };
