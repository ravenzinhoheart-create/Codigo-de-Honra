/**
 * Motoclube
 * Global Modal System
 */

import { hydrateIcons } from "../icons/icons.js";

const modalRoot = document.getElementById("modal-root");
const appOverlay = document.getElementById("app-overlay");

let currentModal = null;

function ensureRoot() {
    if (!modalRoot) {
        console.error("[Modal] #modal-root não encontrado.");
        return false;
    }

    return true;
}

function createModal(options = {}) {
    if (!ensureRoot()) return null;

    const {
        title = "",
        content = "",
        size = "medium",
        closeButton = true,
        closeOnOverlay = true,
        className = "",
        onOpen = null,
        onClose = null
    } = options;

    const modal = document.createElement("section");

    modal.className = [
        "modal",
        `modal--${size}`,
        className
    ].filter(Boolean).join(" ");

    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    modal.innerHTML = `
        <div class="modal__backdrop"></div>

        <div class="modal__dialog">

            <header class="modal__header">

                ${
                    title
                        ? `<h2 class="modal__title">${title}</h2>`
                        : ""
                }

                ${
                    closeButton
                        ? `
                            <button
                                type="button"
                                class="modal__close"
                                data-modal-close
                                aria-label="Fechar"
                            >
                                <span data-icon="close"></span>
                            </button>
                        `
                        : ""
                }

            </header>

            <div class="modal__body">
                ${content}
            </div>

        </div>
    `;

    modalRoot.appendChild(modal);
    hydrateIcons(modal);

    const close = () => {
        if (!modal.parentNode) return;

        modal.classList.remove("is-visible");
        appOverlay?.classList.remove("is-visible");

        document.body.classList.remove("modal-open");

        setTimeout(() => {
            modal.remove();

            if (currentModal === modal) {
                currentModal = null;
            }

            onClose?.();
        }, 220);
    };

    modal.querySelector("[data-modal-close]")?.addEventListener(
        "click",
        close
    );

    if (closeOnOverlay) {
        modal.querySelector(".modal__backdrop")?.addEventListener(
            "click",
            close
        );
    }

    currentModal = modal;

    requestAnimationFrame(() => {
        modal.classList.add("is-visible");
        appOverlay?.classList.add("is-visible");
        document.body.classList.add("modal-open");

        onOpen?.(modal);
    });

    return {
        element: modal,
        body: modal.querySelector(".modal__body"),
        dialog: modal.querySelector(".modal__dialog"),
        close
    };
}

function closeModal() {
    if (!currentModal) return;

    currentModal
        .querySelector("[data-modal-close]")
        ?.click();
}

function isOpen() {
    return Boolean(currentModal);
}

export {
    createModal,
    closeModal,
    isOpen
};