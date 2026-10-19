// =========================================================
// MOTOCLUBE — Eventos
// Greaser / Industrial Premium
// =========================================================

import { router } from "../../core/router.js";
import { renderEventDetail } from "./event-detail.js";
import { renderEventList } from "./event-list.js";
import { getEvents } from "../../services/events.js";
import { getCurrentUser } from "../../services/auth.js";
import { getVehicles } from "../../services/vehicles.js";
import { events as eventBus } from "../../core/events.js";

let state = {
    events: [],
    selectedEventId: null,
    currentUserId: null,
    currentUserVehicle: null,
    vehicles: []
};

let eventCreatedUnsubscribe = null;
let eventUpdatedUnsubscribe = null;
let eventDeletedUnsubscribe = null;
let eventLifecycleTimer = null;

function getDate(event) {
    const value = event?.dateTime || event?.startAt || event?.startDate || event?.date;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function sortUpcoming(events = []) {
    const now = Date.now();
    return [...events]
        .filter(event => {
            const date = getDate(event);
            return date && date.getTime() >= now;
        })
        .sort((a, b) => getDate(a).getTime() - getDate(b).getTime());
}

function sortOngoing(events = []) {
    return [...events]
        .filter(event => event.status === "in_progress")
        .sort((a, b) => getDate(a).getTime() - getDate(b).getTime());
}

function sortHistory(events = []) {
    return [...events]
        .filter(event => event.status === "finished" || event.status === "cancelled")
        .sort((a, b) => getDate(b).getTime() - getDate(a).getTime());
}

function sortAll(events = []) {
    return [...events].sort((a, b) => {
        const da = getDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const db = getDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return da - db;
    });
}

function findSelected(events = [], requestedId = null) {
    if (requestedId) {
        const found = events.find(item => String(item.id) === String(requestedId));
        if (found) return found;
    }
    if (state.selectedEventId) {
        const found = events.find(item => String(item.id) === String(state.selectedEventId));
        if (found) return found;
    }
    return sortOngoing(events)[0] || sortUpcoming(events)[0] || sortAll(events)[0] || null;
}

function formatDay(date) {
    return date ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date) : "--";
}

function formatMonth(date) {
    return date
        ? new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "").toUpperCase()
        : "---";
}

function formatWeekday(date) {
    return date
        ? new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "").toUpperCase()
        : "---";
}

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderSelectedShell(event) {
    if (!event) {
        return `
            <section class="events-empty-panel">
                <div class="events-empty-panel__icon"><span data-icon="calendar"></span></div>
                <span class="events-empty-panel__eyebrow">AGENDA DO CLUBE</span>
                <h2>Nenhum evento programado</h2>
                <p>Quando alguém criar um evento, ele aparecerá aqui.</p>
            </section>
        `;
    }

    const date = getDate(event);
    const confirmed = Array.isArray(event.confirmedMembers) ? event.confirmedMembers.length : 0;

    return `
        <div class="events-featured-head">
            <div class="events-featured-date">
                <strong>${formatDay(date)}</strong>
                <span>${formatMonth(date)}</span>
                <small>${formatWeekday(date)}</small>
            </div>
            <div class="events-featured-copy">
                <span class="events-featured-kicker">PRÓXIMO / SELECIONADO</span>
                <h2>${escapeHtml(event.title || event.name || "Evento")}</h2>
                <div class="events-featured-meta">
                    <span><span data-icon="clock"></span>${date ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</span>
                    <span><span data-icon="users"></span>${confirmed} confirmado${confirmed === 1 ? "" : "s"}</span>
                </div>
            </div>
            <span class="events-featured-mark" data-icon="arrow-right"></span>
        </div>
        <div id="event-detail-container"></div>
    `;
}

async function loadState(requestedEventId = null) {
    const [eventsResult, userResult, vehiclesResult] = await Promise.all([
        getEvents().catch(error => {
            console.error("[EVENTS VIEW] Falha ao carregar eventos:", error);
            return [];
        }),
        getCurrentUser().catch(() => null),
        getVehicles().catch(() => [])
    ]);

    const allEvents = Array.isArray(eventsResult) ? eventsResult : [];
    const selected = findSelected(allEvents, requestedEventId);

    state = {
        ...state,
        events: allEvents,
        selectedEventId: selected?.id || null,
        currentUserId: userResult?.id || userResult?.userId || null,
        currentUserVehicle: userResult?.currentVehicle || { type: "on_foot", id: "on_foot", name: "A pé" },
        vehicles: Array.isArray(vehiclesResult) ? vehiclesResult : []
    };
}

export async function renderEvents(data = {}) {
    const root = document.querySelector("#app-view");
    if (!root) return;

    await loadState(data.eventId || null);

    const upcoming = sortUpcoming(state.events);
    const ongoing = sortOngoing(state.events);
    const history = sortHistory(state.events);
    const selected = state.events.find(item => String(item.id) === String(state.selectedEventId)) || null;

    root.innerHTML = `
        <section class="events-view">
            <header class="events-view__header">
                <button type="button" class="icon-button" data-action="back-events" aria-label="Voltar">
                    <span data-icon="arrow-left"></span>
                </button>
                <div class="events-view__heading">
                    <span class="events-view__eyebrow">MOTOCLUBE / AGENDA</span>
                    <h1>Eventos</h1>
                </div>
                <button type="button" class="icon-button" data-action="create-event" aria-label="Criar evento">
                    <span data-icon="plus"></span>
                </button>
            </header>

            <div class="events-view__content">
                <section class="events-featured">
                    ${renderSelectedShell(selected)}
                </section>

                <section class="events-upcoming">
                    <div class="events-upcoming__header">
                        <div>
                            <span>AGENDA</span>
                            <h2>Próximos eventos</h2>
                        </div>
                        <strong>${upcoming.length}</strong>
                    </div>
                    <div id="event-list-container"></div>
                </section>

                ${ongoing.length ? `<section class="events-upcoming events-upcoming--live"><div class="events-upcoming__header"><div><span>AO VIVO</span><h2>Em andamento</h2></div><strong>${ongoing.length}</strong></div><div id="event-ongoing-container"></div></section>` : ""}

                ${history.length ? `<section class="events-upcoming events-upcoming--history"><div class="events-upcoming__header"><div><span>MEMÓRIA</span><h2>Eventos encerrados</h2></div><strong>${history.length}</strong></div><div id="event-history-container"></div></section>` : ""}
            </div>
        </section>
    `;

    const detailContainer = root.querySelector("#event-detail-container");
    if (detailContainer && selected) {
        renderEventDetail(detailContainer, {
            event: selected,
            currentUserId: state.currentUserId,
            currentUserVehicle: state.currentUserVehicle,
            vehicles: state.vehicles
        });
    }

    renderEventList(root.querySelector("#event-list-container"), {
        events: upcoming,
        selectedEventId: selected?.id,
        currentUserId: state.currentUserId
    });

    renderEventList(root.querySelector("#event-ongoing-container"), {
        events: ongoing,
        selectedEventId: selected?.id,
        currentUserId: state.currentUserId
    });

    renderEventList(root.querySelector("#event-history-container"), {
        events: history,
        selectedEventId: selected?.id,
        currentUserId: state.currentUserId
    });

    root.querySelector("[data-action='back-events']")?.addEventListener("click", () => router.back());
    root.querySelector("[data-action='create-event']")?.addEventListener("click", () => router.navigate("event-create"));

    root.querySelectorAll("[data-event-list-id]").forEach(element => {
        element.addEventListener("click", () => {
            state.selectedEventId = element.dataset.eventListId;
            renderEvents({ eventId: state.selectedEventId });
        });
    });

    if (!eventCreatedUnsubscribe) {
        eventCreatedUnsubscribe = eventBus.on("event:created", () => {
            if (router.getCurrentRoute?.() === "events") renderEvents({ eventId: state.selectedEventId });
        });
        eventUpdatedUnsubscribe = eventBus.on("event:updated", () => {
            if (router.getCurrentRoute?.() === "events") renderEvents({ eventId: state.selectedEventId });
        });
        eventDeletedUnsubscribe = eventBus.on("event:deleted", () => {
            if (router.getCurrentRoute?.() === "events") renderEvents({ eventId: null });
        });
    }

    if (!eventLifecycleTimer) {
        eventLifecycleTimer = window.setInterval(async () => {
            if (router.getCurrentRoute?.() !== "events") {
                window.clearInterval(eventLifecycleTimer);
                eventLifecycleTimer = null;
                return;
            }
            try {
                await getEvents();
            } catch (error) {
                console.warn("[EVENTS VIEW] Falha ao atualizar ciclo de vida dos eventos:", error);
            }
        }, 1000);
    }
}

export function initializeEvents(data = {}) {
    renderEvents(data);
}
