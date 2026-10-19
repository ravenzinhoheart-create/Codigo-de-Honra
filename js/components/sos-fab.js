import { icon, hydrateIcons } from "../icons/icons.js";
import { events } from "../core/events.js";
import { session } from "../core/session.js";
import { getActiveSOSList } from "../services/sos.js";
import { router } from "../core/router.js";
import { openSosDetailSheet } from "../views/sos/sos-detail.js";

const ROOT_ID = "global-sos-fab-root";

const TYPE_ICON = Object.freeze({
    conflict: "conflict",
    motorcycle_breakdown: "motorcycle-breakdown",
    accident: "accident",
    natural_cause: "natural-cause",
    other: "alert"
});

let timer = null;

function ensureRoot() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
        root = document.createElement("div");
        root.id = ROOT_ID;
        root.className = "global-sos-fab-root";
        document.body.appendChild(root);
    }
    return root;
}

export async function refreshSosFab() {
    const root = ensureRoot();
    const user = session.getUser?.() || session.getCurrentUser?.();

    if (!user || user.status === "off") {
        root.innerHTML = "";
        return;
    }

    let active = [];
    try {
        active = await getActiveSOSList();
    } catch {
        active = [];
    }

    if (!active.length) {
        root.innerHTML = "";
        return;
    }

    const sos = active[0];
    const iconName = TYPE_ICON[sos.type] || "sos";
    const emitter = sos.emitter?.username || "Membro";
    const count = active.length;

    root.innerHTML = `
        <button type="button" class="global-sos-fab" data-sos-id="${escapeHtml(sos.id)}" aria-label="Abrir SOS de ${escapeHtml(emitter)}">
            <span class="global-sos-fab__pulse"></span>
            <span class="global-sos-fab__icon">${icon(iconName, { size: 23, decorative: true })}</span>
            <span class="global-sos-fab__copy">
                <strong>SOS</strong>
                <small>${escapeHtml(emitter)}${count > 1 ? ` +${count - 1}` : ""}</small>
            </span>
        </button>
    `;

    root.querySelector(".global-sos-fab")?.addEventListener("click", () => {
        openSosDetailSheet(sos.id);
    });

    hydrateIcons(root);
}

export function initSosFab() {
    if (timer) return;
    const refresh = () => refreshSosFab();
    ["sos:created", "sos:updated", "sos:resolved", "user:updated", "session:changed", "navigation:after"].forEach(name => events.on(name, refresh));
    timer = window.setInterval(refresh, 1500);
    refresh();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
