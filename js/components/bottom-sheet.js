// =========================================================
// MOTOCLUBE — Bottom Sheet
// =========================================================

import { hydrateIcons } from "../icons/icons.js";
import { initDropdowns } from "./dropdown.js";

const root = document.getElementById("bottom-sheet-root");
const sheetStack = [];

function getTopSheet() {
    return sheetStack[sheetStack.length - 1] || null;
}

function updateBodyLock() {
    document.body.classList.toggle(
        "bottom-sheet-open",
        sheetStack.length > 0
    );
}

function openBottomSheet(options = {}) {
    if (!root) {
        console.error("[BOTTOM-SHEET] #bottom-sheet-root não encontrado.");
        return null;
    }

    const {
        title = "",
        subtitle = "",
        content = "",
        closeOnBackdrop = true,
        closeOnEscape = true,
        className = "",
        stack = false,
        onClose = null
    } = options;

    // Por padrão, abrir um sheet novo substitui o anterior.
    // stack:true permite abrir um sheet por cima sem destruir o anterior.
    if (!stack && sheetStack.length) {
        [...sheetStack].forEach(item => item.close());
    }

    const sheet = document.createElement("section");
    sheet.className = [
        "bottom-sheet",
        stack ? "bottom-sheet--stacked" : "",
        className
    ].filter(Boolean).join(" ");

    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    sheet.innerHTML = `
        <div class="bottom-sheet__backdrop" aria-hidden="true"></div>

        <div class="bottom-sheet__panel">
            <div class="bottom-sheet__handle" aria-hidden="true"></div>

            <header class="bottom-sheet__header">
                <div class="bottom-sheet__heading">
                    ${title ? `<h2>${title}</h2>` : ""}
                    ${subtitle ? `<p>${subtitle}</p>` : ""}
                </div>

                <button
                    type="button"
                    class="bottom-sheet__close"
                    aria-label="Fechar"
                >
                    <span data-icon="close"></span>
                </button>
            </header>

            <div class="bottom-sheet__body"></div>
        </div>
    `;

    const body = sheet.querySelector(".bottom-sheet__body");

    if (content instanceof Node) {
        body.appendChild(content);
    } else {
        body.innerHTML = String(content);
    }

    root.appendChild(sheet);

    let closed = false;

    const onKeyDown = event => {
        if (closeOnEscape && event.key === "Escape") {
            event.preventDefault();
            close();
        }
    };

    const close = () => {
        if (closed) return;
        closed = true;

        const index = sheetStack.indexOf(api);
        if (index !== -1) sheetStack.splice(index, 1);

        sheet.classList.remove("is-visible");
        document.removeEventListener("keydown", onKeyDown);
        updateBodyLock();

        window.setTimeout(() => {
            sheet.remove();
            try {
                if (typeof onClose === "function") onClose();
            } catch (error) {
                console.error("[BOTTOM-SHEET] onClose falhou:", error);
            }
        }, 300);
    };

    const api = {
        element: sheet,
        body,
        close,
        isOpen: () => !closed
    };

    sheet._close = close;
    sheet._sheetApi = api;

    sheet.querySelector(".bottom-sheet__close")?.addEventListener("click", close);

    if (closeOnBackdrop) {
        sheet.querySelector(".bottom-sheet__backdrop")?.addEventListener("click", close);
    }

    sheetStack.push(api);
    document.addEventListener("keydown", onKeyDown);
    updateBodyLock();

    requestAnimationFrame(() => {
        if (closed) return;
        sheet.classList.add("is-visible");
        // Component hydration happens after the sheet is painted, so opening
        // the sheet never waits on icon/dropdown processing.
        requestAnimationFrame(() => {
            if (closed) return;
            initDropdowns(sheet);
            hydrateIcons(sheet);
        });
    });

    return api;
}

function closeBottomSheet() {
    getTopSheet()?.close?.();
}

function getActiveBottomSheet() {
    return getTopSheet();
}

export {
    openBottomSheet,
    closeBottomSheet,
    getActiveBottomSheet
};
