// =========================================================
// MOTOCLUBE
// Bottom Navigation
// =========================================================

import { router } from "../core/router.js";
import { events } from "../core/events.js";
import { NAVBAR_ROUTES } from "../core/constants.js";
import { openEventCreateSheet } from "../views/events/event-create.js";
import { openBottomSheet } from "./bottom-sheet.js";
import { renderPostCreate } from "../views/posts/post-create.js";
import { renderProductCreate } from "../views/marketplace/product-create.js";
import { renderSosCreate } from "../views/sos/sos-create.js";
import { session } from "../core/session.js";
import { store } from "../core/store.js";


// =========================================================
// NAVBAR
// =========================================================

const navbar = {

    element: null,
    addButton: null,
    addMenu: null,
    closeButton: null,

    _initialized: false,
    _navigationUnsubscribe: null,
    _openTimer: null,
    _closeTimer: null,


    // =====================================================
    // INITIALIZE
    // =====================================================

    initialize() {

        this.element =
            document.getElementById("app-navbar");

        this.addButton =
            document.getElementById("navbar-add");

        this.addMenu =
            document.getElementById("navbar-add-menu");

        this.closeButton =
            document.getElementById("navbar-add-close");


        if (!this.element) {
            console.warn("[NAVBAR] Navbar não encontrada.");
            return false;
        }


        if (this._initialized) {
            this.bindRouteVisibility();
            return true;
        }


        this._initialized = true;

        this.bindNavigation();
        this.bindAddMenu();
        this.bindRouteVisibility();

        return true;
    },


    // =====================================================
    // ROUTE VISIBILITY
    // =====================================================

    bindRouteVisibility() {

        if (this._navigationUnsubscribe) {
            return;
        }

        /*
         * A SPA local não pode usar pathname como fonte da
         * verdade. O Router já possui a rota atual.
         *
         * Escutamos o EventBus do próprio projeto. Assim não
         * precisamos sobrescrever history.pushState/replaceState
         * e não criamos efeitos colaterais em outras views.
         */

        this._navigationUnsubscribe = events.on(
            "navigation:after",
            payload => {

                const route =
                    payload?.to ||
                    payload?.route ||
                    null;

                this.syncRouteVisibility(route);
            }
        );

        /*
         * Em caso de erro de navegação, mantemos a navbar em um
         * estado coerente com a rota que o Router já conhecia.
         */

        events.on(
            "navigation:error",
            () => {

                const route =
                    router.getCurrentRoute?.() ||
                    null;

                this.syncRouteVisibility(route);
            }
        );
    },


    syncRouteVisibility(route = null) {

        if (!route) {
            return;
        }

        const normalized =
            String(route)
                .replace(/^\/+/, "")
                .replace(/\/+$/, "")
                .toLowerCase();

        if (NAVBAR_ROUTES.includes(normalized)) {
            this.show(normalized);
            return;
        }

        this.hide();
    },


    // =====================================================
    // MAIN NAVIGATION
    // =====================================================

    bindNavigation() {

        if (!this.element) {
            return;
        }

        const buttons =
            this.element.querySelectorAll(
                "[data-route]"
            );

        buttons.forEach(button => {

            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    const route =
                        button.dataset.route;

                    if (!route) {
                        return;
                    }

                    this.closeAddMenu();

                    try {
                        await router.navigate(route);
                    } catch (error) {
                        console.error(
                            "[NAVBAR] Erro ao navegar:",
                            error
                        );
                    }
                }
            );
        });
    },


    // =====================================================
    // ADD MENU
    // =====================================================

    bindAddMenu() {

        if (!this.addButton) {
            return;
        }

        /*
         * O + é um DIV propositalmente: dentro dele existe a
         * pill com vários <button>. Isso evita botão dentro de
         * botão e permite que o próprio elemento seja a cápsula.
         */

        this.addButton.addEventListener(
            "click",
            event => {

                if (
                    event.target.closest("[data-action]") ||
                    event.target.closest("#navbar-add-close")
                ) {
                    return;
                }

                this.toggleAddMenu();
            }
        );

        this.addButton.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Enter" &&
                    event.key !== " "
                ) {
                    return;
                }

                if (
                    event.target.closest("[data-action]") ||
                    event.target.closest("#navbar-add-close")
                ) {
                    return;
                }

                event.preventDefault();
                this.toggleAddMenu();
            }
        );

        if (this.closeButton) {

            this.closeButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    this.closeAddMenu();
                }
            );
        }

        const actions =
            this.addMenu?.querySelectorAll(
                "[data-action]"
            );

        actions?.forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    const action =
                        button.dataset.action;

                    this.handleAddAction(action);
                }
            );
        });
    },


    toggleAddMenu() {

        const expanded =
            this.addButton?.getAttribute(
                "aria-expanded"
            ) === "true";

        if (expanded) {
            this.closeAddMenu();
        } else {
            this.openAddMenu();
        }
    },


    // =====================================================
    // OPEN ADD MENU
    // =====================================================

    openAddMenu() {

        if (!this.addButton) {
            return;
        }

        if (this._closeTimer) {
            clearTimeout(this._closeTimer);
            this._closeTimer = null;
        }

        if (this._openTimer) {
            clearTimeout(this._openTimer);
            this._openTimer = null;
        }

        this.addButton.setAttribute(
            "aria-expanded",
            "true"
        );

        this.addButton.classList.remove(
            "is-closing"
        );

        /*
         * O próprio + faz o morph:
         * círculo -> subida -> cápsula.
         */
        this.addButton.classList.add(
            "is-open"
        );

        document.body.classList.add("add-menu-open");

        if (this.addMenu) {
            this.addMenu.setAttribute(
                "aria-hidden",
                "true"
            );

            this.addMenu.classList.remove(
                "is-open"
            );
        }

        /*
         * A cápsula já começou a existir visualmente. Liberamos
         * os comandos antes do final da animação para o toque
         * parecer imediato, sem sacrificar o morph.
         */
        this._openTimer = window.setTimeout(
            () => {

                this._openTimer = null;

                if (
                    this.addButton?.getAttribute(
                        "aria-expanded"
                    ) !== "true"
                ) {
                    return;
                }

                this.addMenu?.setAttribute(
                    "aria-hidden",
                    "false"
                );

                this.addMenu?.classList.add(
                    "is-open"
                );
            },
            180
        );
    },


    // =====================================================
    // CLOSE ADD MENU
    // =====================================================

    closeAddMenu() {

        if (!this.addButton) {
            return;
        }

        if (this._openTimer) {
            clearTimeout(this._openTimer);
            this._openTimer = null;
        }

        const expanded =
            this.addButton.getAttribute(
                "aria-expanded"
            ) === "true";

        if (!expanded) {

            this.addMenu?.setAttribute(
                "aria-hidden",
                "true"
            );

            this.addMenu?.classList.remove(
                "is-open"
            );

            this.addButton.classList.remove(
                "is-open",
                "is-closing"
            );

            document.body.classList.remove("add-menu-open");

            return;
        }

        this.addMenu?.setAttribute(
            "aria-hidden",
            "true"
        );

        this.addMenu?.classList.remove(
            "is-open"
        );

        this.addButton.classList.remove(
            "is-open"
        );

        this.addButton.classList.add(
            "is-closing"
        );

        this.addButton.setAttribute(
            "aria-expanded",
            "false"
        );

        document.body.classList.remove("add-menu-open");

        if (this._closeTimer) {
            clearTimeout(this._closeTimer);
        }

        this._closeTimer = window.setTimeout(
            () => {

                this._closeTimer = null;

                this.addButton?.classList.remove(
                    "is-closing"
                );
            },
            360
        );
    },


    // =====================================================
    // ADD ACTIONS
    // =====================================================

    async handleAddAction(action) {

        /*
         * Fecha a cápsula, mas NÃO navega.
         * Todas as quatro ações são bottom-sheets.
         */
        this.closeAddMenu();

        const user =
            session.getCurrentUser?.() || {};

        const currentVehicle =
            store.get?.("profile.currentVehicle") ||
            user?.currentVehicle || {
                type: "on_foot",
                id: null,
                name: "A pé"
            };


        // =================================================
        // POST
        // =================================================

        if (action === "create-post") {

            console.info(
                "[NAVBAR] Nova postagem — bottom-sheet"
            );

            const content =
                renderPostCreate({
                    user,
                    currentVehicle,
                    modal: true
                });

            if (!content) {
                console.error(
                    "[NAVBAR] Falha ao renderizar post."
                );
                return;
            }

            const sheet =
                openBottomSheet({
                    title: "Nova postagem",
                    className: "bottom-sheet--post-create",
                    content
                });

            content
                .querySelector('[data-action="back"]')
                ?.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();
                        sheet?.close();
                    },
                    { once: true }
                );

            content.addEventListener("post:close", () => sheet?.close(), { once: true });

            return;
        }


        // =================================================
        // EVENT
        // =================================================

        if (action === "create-event") {

            console.info(
                "[NAVBAR] Novo evento — bottom-sheet"
            );

            openEventCreateSheet();

            return;
        }


        // =================================================
        // MARKETPLACE
        // =================================================

        if (action === "create-marketplace") {

            console.info(
                "[NAVBAR] Novo anúncio — bottom-sheet"
            );

            /*
             * A view retorna o próprio HTMLElement.
             * O Bottom Sheet recebe esse elemento diretamente,
             * assim como acontece com Postagem e SOS.
             *
             * O código anterior criava um mount vazio e chamava
             * renderProductCreate(), mas descartava o HTMLElement
             * retornado pela view. Resultado: o sheet abria somente
             * com o cabeçalho "Novo anúncio".
             */
            const content =
                renderProductCreate({
                    user,
                    currentVehicle,
                    modal: true
                });

            if (!content) {
                console.error(
                    "[NAVBAR] Falha ao renderizar anúncio."
                );
                return;
            }

            const sheet =
                openBottomSheet({
                    title: "Novo anúncio",
                    className: "bottom-sheet--product-create",
                    content
                });

            if (!sheet) {
                return;
            }

            /* O botão Cancelar da view fecha o sheet atual. */
            content.addEventListener(
                "product:close",
                () => sheet.close(),
                { once: true }
            );

            return;
        }


        // =================================================
        // SOS
        // =================================================

        if (action === "sos") {

            console.info(
                "[NAVBAR] SOS — bottom-sheet"
            );

            const content =
                renderSosCreate({
                    user,
                    currentVehicle
                });

            if (!content) {
                console.error(
                    "[NAVBAR] Falha ao renderizar SOS."
                );
                return;
            }

            const sheet =
                openBottomSheet({
                    title: "Emitir SOS",
                    className: "bottom-sheet--sos-create",
                    content
                });

            content.addEventListener("sos:create", () => sheet?.close(), { once: true });

            content
                .querySelector('[data-action="back"]')
                ?.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();
                        sheet?.close();
                    },
                    { once: true }
                );

            return;
        }

        console.warn(
            `[NAVBAR] Ação desconhecida: ${action}`
        );
    },


    // =====================================================
    // SHOW
    // =====================================================

    show(route = null) {

        if (!this.element) {
            return;
        }

        this.element.hidden = false;

        /* Atualiza o item ativo sem alterar o layout. */
        this.element
            .querySelectorAll("[data-route]")
            .forEach(button => {

                button.classList.toggle(
                    "is-active",
                    Boolean(
                        route &&
                        button.dataset.route === route
                    )
                );
            });

        requestAnimationFrame(() => {
            this.element.classList.add(
                "is-visible"
            );
        });
    },


    // =====================================================
    // HIDE
    // =====================================================

    hide() {

        if (!this.element) {
            return;
        }

        this.closeAddMenu();

        this.element.classList.remove(
            "is-visible"
        );

        this.element.hidden = true;

        this.element
            .querySelectorAll("[data-route].is-active")
            .forEach(button => {
                button.classList.remove("is-active");
            });
    }
};


// =========================================================
// EXPORTS
// =========================================================

export {
    navbar
};

export default navbar;
