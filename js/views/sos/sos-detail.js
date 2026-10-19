import { router } from "../../core/router.js";
import { openBottomSheet } from "../../components/bottom-sheet.js";
import { createAvatar } from "../../components/avatar.js";
import { STATUS } from "../../components/status-ring.js";
import { showToast } from "../../components/toast.js";
import { createModal } from "../../components/modal.js";
import { hydrateIcons } from "../../icons/icons.js";
import { getCurrentLocation, normalizeLocation } from "../../services/location.js";
import { session } from "../../core/session.js";
import { events as eventBus } from "../../core/events.js";
import {
    getSOS,
    respondToSOS,
    leaveSOSResponse,
    finishSOS
} from "../../services/sos.js";

const TYPE_META = {
    conflict: { label: "Conflito", icon: "conflict" },
    motorcycle_breakdown: { label: "Pane na moto", icon: "motorcycle-breakdown" },
    accident: { label: "Acidente", icon: "accident" },
    natural_cause: { label: "Causa natural", icon: "natural-cause" },
    other: { label: "Outro", icon: "alert" }
};

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export async function renderSosDetail(data = {}) {
    let sos = data.sos || null;
    if (!sos && data.sosId) {
        sos = await getSOS(data.sosId);
    }

    const container = document.createElement("section");
    container.className = "sos-detail-view";

    if (!sos) {
        container.innerHTML = `
            <div class="sos-detail-view__empty">
                <span data-icon="sos"></span>
                <h1>SOS não encontrado</h1>
                <p>O chamado pode ter sido encerrado.</p>
                <button type="button" class="button button--secondary" data-action="back">Voltar</button>
            </div>`;
        container.querySelector('[data-action="back"]')?.addEventListener("click", () => router.back());
        return container;
    }

    const user = session.getUser?.() || session.getCurrentUser?.() || {};
    const isOwner = String(user.id || "") === String(sos.userId || "");
    const active = sos.status === "active";
    const responders = Array.isArray(sos.responders) ? sos.responders : [];
    const alreadyResponding = responders.some(item => String(item.id) === String(user.id));
    const meta = TYPE_META[sos.type] || TYPE_META.other;
    const emitter = sos.emitter || { username: "Membro", avatar: null, status: "sos" };

    let viewerLocation = data.viewerLocation || null;
    if (active && !isOwner && !viewerLocation && Number.isFinite(Number(sos.latitude)) && Number.isFinite(Number(sos.longitude))) {
        try {
            viewerLocation = normalizeLocation(await getCurrentLocation({ enableHighAccuracy: true, timeout: 9000, maximumAge: 5000 }));
        } catch (error) {
            console.warn("[SOS] Não foi possível obter a localização de quem está visualizando:", error);
        }
    }
    const distanceKm = calculateDistanceKm(viewerLocation, sos);

    container.innerHTML = `
        <div class="sos-detail-view__shell">
            ${data.sheet ? `
                <div class="sos-detail-view__sheet-kicker">
                    <span>SOS · ${escapeHtml(meta.label.toUpperCase())}</span>
                    <strong>${active ? "CHAMADO ATIVO" : "CHAMADO ENCERRADO"}</strong>
                </div>
            ` : `
                <header class="sos-detail-view__header">
                    <button type="button" class="icon-button" data-action="back" aria-label="Voltar">
                        <span data-icon="arrow-left"></span>
                    </button>
                    <div>
                        <span>SOS · ${escapeHtml(meta.label.toUpperCase())}</span>
                        <h1>${active ? "Chamado ativo" : "Chamado encerrado"}</h1>
                    </div>
                    <span class="sos-detail-view__signal" data-icon="${meta.icon}"></span>
                </header>
            `}

            <section class="sos-detail-view__hero">
                <div class="sos-detail-view__type-icon" data-icon="${meta.icon}"></div>
                <div class="sos-detail-view__hero-copy">
                    <span>EMITIDO POR</span>
                    <strong>${escapeHtml(emitter.username || "Membro")}</strong>
                    <small>${formatDate(sos.createdAt)}</small>
                </div>
                <span class="sos-detail-view__status ${active ? "is-active" : ""}">${active ? "ATIVO" : "ENCERRADO"}</span>
            </section>

            <section class="sos-detail-view__location">
                <div data-icon="location"></div>
                <div>
                    <span>LOCALIZAÇÃO</span>
                    ${renderCoordinatesLink(sos.latitude, sos.longitude)}
                    ${distanceKm !== null ? `<small class="sos-detail-view__distance">Você está a <strong>${formatDistance(distanceKm)}</strong> do chamado</small>` : ""}
                </div>
            </section>

            ${sos.description ? `
                <section class="sos-detail-view__description">
                    <span>DETALHES</span>
                    <p>${escapeHtml(sos.description)}</p>
                </section>` : ""}

            <section class="sos-detail-view__responders">
                <div class="sos-detail-view__section-heading">
                    <div>
                        <span>APOIO</span>
                        <h2>Quem está atendendo</h2>
                    </div>
                    <strong>${responders.length}</strong>
                </div>

                ${responders.length ? `
                    <div class="sos-responders-grid">
                        ${responders.map(responder => renderResponder(responder, sos)).join("")}
                    </div>` : `
                    <div class="sos-detail-view__no-responders">Ainda ninguém marcou que está a caminho.</div>
                `}
            </section>

            ${active && !isOwner && !alreadyResponding && user.status !== STATUS.OFF && user.status !== STATUS.SOS ? `
                <button type="button" class="button button--danger button--large" data-action="respond">
                    <span data-icon="location"></span>
                    Vou atender este chamado
                </button>` : ""}

            ${active && !isOwner && alreadyResponding ? `
                <button type="button" class="button button--secondary button--large" data-action="leave-response">
                    <span data-icon="close"></span>
                    Não vou mais atender
                </button>` : ""}

            ${active && isOwner ? `
                <button type="button" class="button button--danger button--large" data-action="finish">
                    <span data-icon="check"></span>
                    Encerrar chamado
                </button>` : ""}
        </div>
    `;

    hydrateIcons(container);
    bindEvents(container, sos, data);
    return container;
}

function renderResponder(responder, sos = null) {
    const username = responder.username || "Membro";
    const avatar = createAvatar({
        src: responder.avatar,
        username,
        status: responder.status || STATUS.ON,
        size: "medium"
    });

    const distance = calculateDistanceKm(responder, sos);
    return `
        <button type="button" class="sos-responder-grid__item" data-member-id="${escapeHtml(responder.id || "")}">
            <span class="sos-responder-grid__avatar">${avatar.outerHTML}</span>
            <strong>${escapeHtml(username)}</strong>
            ${distance !== null ? `<small>${formatDistance(distance)}</small>` : ""}
        </button>
    `;
}

function bindEvents(container, sos, data = {}) {
    container.querySelector('[data-action="back"]')?.addEventListener("click", () => router.back());

    container.querySelector('[data-action="respond"]')?.addEventListener("click", async () => {
        try {
            let responderLocation = null;
            try {
                responderLocation = normalizeLocation(await getCurrentLocation({ enableHighAccuracy: true, timeout: 9000, maximumAge: 5000 }));
            } catch (locationError) {
                console.warn("[SOS] Não foi possível registrar a localização do respondente:", locationError);
            }
            const updated = await respondToSOS(sos.id, responderLocation);
            eventBus.emit("sos:updated", updated);
            showToast({ type: "success", message: "Você marcou que vai atender." });
            if (data.sheet) {
                const refreshed = await getSOS(sos.id);
                const freshContent = await renderSosDetail({ sos: refreshed, sheet: true });
                data.sheetApi?.body.replaceChildren(freshContent);
                return;
            }
            await router.navigate("sos-detail", { sosId: sos.id, replace: true });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível responder." });
        }
    });

    container.querySelector('[data-action="leave-response"]')?.addEventListener("click", async () => {
        try {
            const updated = await leaveSOSResponse(sos.id);
            eventBus.emit("sos:updated", updated);
            showToast({ type: "info", message: "Você deixou de atender o chamado." });
            if (data.sheet) {
                const refreshed = await getSOS(sos.id);
                const freshContent = await renderSosDetail({ sos: refreshed, sheet: true });
                data.sheetApi?.body.replaceChildren(freshContent);
                return;
            }
            await router.navigate("sos-detail", { sosId: sos.id, replace: true });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível atualizar." });
        }
    });

    container.querySelector('[data-action="finish"]')?.addEventListener("click", () => {
        const modal = createModal({
            title: "Encerrar SOS?",
            content: `
                <div class="post-edit-form">
                    <p>O clube será informado de que você está seguro e o chamado será encerrado.</p>
                    <div class="post-edit-form__actions">
                        <button type="button" class="button button--secondary" data-cancel>Cancelar</button>
                        <button type="button" class="button button--danger" data-confirm>Encerrar</button>
                    </div>
                </div>`
        });

        modal?.element?.querySelector("[data-cancel]")?.addEventListener("click", () => modal.close());
        modal?.element?.querySelector("[data-confirm]")?.addEventListener("click", async () => {
            try {
                const updated = await finishSOS(sos.id);
                modal.close();
                eventBus.emit("sos:resolved", updated);
                showToast({ type: "success", message: "SOS encerrado. Clube informado." });
                if (data.sheet && data.sheetApi?.close) {
                    data.sheetApi.close();
                    return;
                }
                await router.navigate("home", { replace: true });
            } catch (error) {
                showToast({ type: "error", message: error.message || "Não foi possível encerrar o SOS." });
            }
        });
    });
}

export async function openSosDetailSheet(sosId) {
    const sos = await getSOS(sosId);
    if (!sos) {
        showToast({ type: "error", message: "Chamado não encontrado." });
        return null;
    }

    const sheet = openBottomSheet({
        title: "Detalhes do SOS",
        subtitle: "Acompanhe o chamado e o apoio do clube.",
        className: "bottom-sheet--sos-detail",
        content: document.createElement("div")
    });

    if (!sheet) return null;

    const content = await renderSosDetail({
        sos,
        sheet: true,
        sheetApi: sheet
    });

    sheet.body.replaceChildren(content);
    return sheet;
}

function calculateDistanceKm(a, b) {
    const lat1 = Number(a?.latitude);
    const lon1 = Number(a?.longitude);
    const lat2 = Number(b?.latitude);
    const lon2 = Number(b?.longitude);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
    const toRad = value => value * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function formatDistance(km) {
    if (!Number.isFinite(km)) return "";
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function renderCoordinatesLink(latitude, longitude) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return `<strong>Localização aguardando atualização</strong>`;
    }
    const label = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}`;
    return `<a class="sos-detail-view__coordinates" href="${mapsUrl}" target="_blank" rel="noopener noreferrer" aria-label="Abrir localização no GPS">${escapeHtml(label)}<span data-icon="arrow-right"></span></a>`;
}

function formatLocation(location, latitude, longitude) {
    if (location && typeof location === "string") return location;
    if (location && typeof location === "object") {
        if (typeof location.latitude === "number" && typeof location.longitude === "number") {
            return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
        }
        return location.title || location.name || "Localização disponível";
    }
    if (typeof latitude === "number" && typeof longitude === "number") {
        return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }
    return "Localização aguardando atualização";
}

function formatDate(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return "Agora";
    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
