import { hydrateIcons } from "../../icons/icons.js";

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getDate(event) {
    const value = event?.dateTime || event?.startAt || event?.startDate || event?.date;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function statusLabel(status) {
    const value = String(status || "").toLowerCase();
    if (["finished", "finalizado"].includes(value)) return "ENCERRADO";
    if (["in_progress", "started", "andamento"].includes(value)) return "AO VIVO";
    if (["confirmed", "confirmado"].includes(value)) return "CONFIRMADO";
    return "PLANEJAMENTO";
}

export function renderEventList(container, data = {}) {
    if (!container) return;
    const events = Array.isArray(data.events) ? data.events : [];
    const selectedId = data.selectedEventId;

    if (!events.length) {
        container.innerHTML = `
            <div class="events-list-empty">
                <span data-icon="calendar"></span>
                <strong>Nenhum próximo evento</strong>
                <small>A agenda está livre por enquanto.</small>
            </div>
        `;
        hydrateIcons(container);
        return;
    }

    container.innerHTML = `
        <div class="events-list">
            ${events.map(event => {
                const date = getDate(event);
                const members = Array.isArray(event.confirmedMembers) ? event.confirmedMembers.length : 0;
                const selected = String(event.id) === String(selectedId);
                return `
                    <button type="button" class="event-list-card ${selected ? "is-selected" : ""}" data-event-list-id="${escapeHTML(event.id)}">
                        <span class="event-list-card__date">
                            <strong>${date ? date.toLocaleDateString("pt-BR", { day: "2-digit" }) : "--"}</strong>
                            <small>${date ? date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase() : "---"}</small>
                        </span>
                        <span class="event-list-card__main">
                            <span class="event-list-card__status">${statusLabel(event.status)}</span>
                            <strong>${escapeHTML(event.title || event.name || "Evento")}</strong>
                            <span class="event-list-card__meta">
                                <span><span data-icon="clock"></span>${date ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</span>
                                ${event.location ? `<span><span data-icon="location"></span>${escapeHTML(event.location)}</span>` : ""}
                                <span><span data-icon="users"></span>${members}</span>
                            </span>
                        </span>
                        <span class="event-list-card__arrow" data-icon="arrow-right"></span>
                    </button>
                `;
            }).join("")}
        </div>
    `;

    hydrateIcons(container);
}
