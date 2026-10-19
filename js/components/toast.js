/**
 * Motoclube
 * Global Toast System
 */

let toastId = 0;

function getToastRoot() {
    let root = document.getElementById("toast-root");

    // Toast is a truly global UI layer. Move it directly under <body> so
    // no app container, overflow rule, transform or stacking context can
    // hide it. This is especially important on Android/WebView.
    if (root && root.parentElement !== document.body) {
        document.body.appendChild(root);
    }

    return root;
}

function showToast(message, options = {}) {
    const toastRoot = getToastRoot();

    if (!toastRoot) {
        console.error("[Toast] #toast-root não encontrado.");
        return;
    }

    // Aceita tanto showToast("mensagem", { type }) quanto
    // showToast({ message, type, title, duration }).
    if (message && typeof message === "object") {
        const payload = message;
        message = payload.message ?? "";
        options = { ...payload, ...options };
    }

    const {
        type = "default",
        duration = 3200,
        title = ""
    } = options;

    const id = `toast-${++toastId}`;

    const toast = document.createElement("div");

    toast.className = [
        "toast",
        `toast--${type}`
    ].join(" ");

    toast.dataset.toastId = id;

    toast.innerHTML = `
        <div class="toast__icon" aria-hidden="true">
            ${getToastIconSvg(type)}
        </div>

        <div class="toast__content">
            ${title ? `<strong class="toast__title"></strong>` : ""}
            <span class="toast__message"></span>
        </div>
    `;

    // Texto é inserido como textContent para não interpretar HTML vindo de mensagens de erro.
    const titleNode = toast.querySelector(".toast__title");
    const messageNode = toast.querySelector(".toast__message");
    if (titleNode) titleNode.textContent = title;
    if (messageNode) messageNode.textContent = String(message ?? "");

    toastRoot.appendChild(toast);

    // Garante que ícones do toast sejam renderizados mesmo quando o toast
    // é criado depois do bootstrap inicial da aplicação.
    try {
        const hydrate = window.MotoClube?.hydrateIcons;
        if (typeof hydrate === "function") hydrate(toast);
    } catch (_) {}

    requestAnimationFrame(() => {
        toast.classList.add("is-visible");
    });

    if (duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }

    return toast;
}

function removeToast(toast) {
    if (!toast) return;

    toast.classList.remove("is-visible");

    setTimeout(() => {
        toast.remove();
    }, 220);
}

function getToastIconSvg(type) {
    const common = 'viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

    switch (type) {
        case "success":
            return `<svg ${common} aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

        case "error":
            return `<svg ${common} aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>`;

        case "warning":
            return `<svg ${common} aria-hidden="true"><path d="M10.3 4.4 2.6 18a1.8 1.8 0 0 0 1.6 2.7h15.6a1.8 1.8 0 0 0 1.6-2.7L13.7 4.4a1.9 1.9 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>`;

        case "info":
        default:
            return `<svg ${common} aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/></svg>`;
    }
}

const toast = {
    show: showToast,

    success(message, options = {}) {
        return showToast(message, {
            ...options,
            type: "success"
        });
    },

    error(message, options = {}) {
        return showToast(message, {
            ...options,
            type: "error"
        });
    },

    warning(message, options = {}) {
        return showToast(message, {
            ...options,
            type: "warning"
        });
    },

    info(message, options = {}) {
        return showToast(message, {
            ...options,
            type: "info"
        });
    }
};

export {
    showToast,
    removeToast,
    toast
};