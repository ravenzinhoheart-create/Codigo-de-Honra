import { router } from "../../core/router.js";
import { createAvatar } from "../../components/avatar.js";
import { createStatusRing } from "../../components/status-ring.js";
import { session } from "../../core/session.js";
import { events as eventBus } from "../../core/events.js";
import { confirmAttendance, cancelAttendance, deleteEvent, finishEvent } from "../../services/events.js";
import { createModal } from "../../components/modal.js";
import { showToast } from "../../components/toast.js";
import { supabase } from "../../services/supabase.js";

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
    if (["finished", "finalizado"].includes(value)) return "Finalizado";
    if (["in_progress", "started", "andamento"].includes(value)) return "Em andamento";
    if (["confirmed", "confirmado"].includes(value)) return "Confirmado";
    return "Em planejamento";
}

function hasStarted(event) {
    const value = event?.dateTime || event?.startAt || event?.startDate || event?.date;
    const time = value ? new Date(value).getTime() : NaN;
    return event?.status === "in_progress" || (Number.isFinite(time) && time <= Date.now() && event?.status !== "finished" && event?.status !== "cancelled");
}

function getVehicleLabel(vehicle) {
    if (!vehicle || vehicle.type === "on_foot") return "A pé";
    return vehicle.model || (vehicle.type === "car" ? "Carro" : "Motocicleta");
}

async function refreshEventMemberAvatars(container, members) {
    const ids = [...new Set((members || [])
        .map(member => member?.id || member?.userId)
        .filter(Boolean)
        .map(String))];
    if (!ids.length || !container?.isConnected) return;

    try {
        // A presença no evento guarda um snapshot do avatar. Use o perfil atual
        // como fonte de verdade para corrigir snapshots antigos ou desatualizados.
        const { data, error } = await supabase
            .from("profiles")
            .select("id,username,nickname,avatar_url,status")
            .in("id", ids);
        if (error) throw error;

        const profiles = new Map((data || []).map(profile => [String(profile.id), profile]));
        for (const member of members || []) {
            const id = String(member?.id || member?.userId || "");
            const profile = profiles.get(id);
            const card = [...container.querySelectorAll(".event-member-card")]
                .find(node => String(node.dataset.memberId || "") === id);
            const slot = card?.querySelector(".event-member-card__avatar");
            if (!profile || !slot) continue;

            const username = profile.username || profile.nickname || member.username || member.name || "Membro";
            const avatar = createAvatar({
                src: profile.avatar_url || member.avatar || "",
                username,
                status: profile.status || member.status || "off",
                size: "sm"
            });
            slot.replaceChildren(avatar);
        }
    } catch (error) {
        // A grade continua utilizável com os snapshots já carregados.
        console.warn("[EVENTS] Não foi possível atualizar os avatares dos participantes:", error);
    }
}

function renderMembers(members) {
    if (!members.length) {
        return `<div class="event-members-empty"><span data-icon="users"></span><p>Ninguém confirmou presença ainda.</p><small>Seja o primeiro a entrar nessa.</small></div>`;
    }

    return `<div class="event-members-grid">${members.map(member => {
        const user = typeof member === "object" ? member : { id: member };
        const username = user.username || user.name || "Membro";
        const avatar = createAvatar({ src: user.avatar, username, status: user.status || "off", size: "sm" });
        const ring = createStatusRing(user.status || "off");
        return `
            <button type="button" class="event-member-card" data-member-id="${escapeHTML(user.id || "")}">
                <span class="event-member-card__avatar">${avatar.outerHTML}</span>
                <span class="event-member-card__name">${escapeHTML(username)}</span>
                <span class="event-member-card__vehicle">${escapeHTML(getVehicleLabel(user.vehicle || user.attendanceVehicle))}</span>
                <span class="event-member-card__ring">${ring.outerHTML}</span>
            </button>
        `;
    }).join("")}</div>`;
}

function renderVehicleSelector(vehicles = [], selectedVehicle = null) {
    const allVehicles = [{ id: "on_foot", type: "on_foot", name: "A pé" }, ...vehicles];
    const selectedId = selectedVehicle?.id || selectedVehicle || "on_foot";
    return `
        <div class="event-vehicle-selector">
            ${allVehicles.map(vehicle => `
                <button type="button" class="event-vehicle-option ${String(vehicle.id) === String(selectedId) ? "is-selected" : ""}" data-vehicle-id="${escapeHTML(vehicle.id)}">
                    <span data-icon="${vehicle.type === "motorcycle" ? "motorcycle" : vehicle.type === "car" ? "car" : "walk"}"></span>
                    <span>${escapeHTML(getVehicleLabel(vehicle))}</span>
                </button>
            `).join("")}
        </div>
    `;
}

export function renderEventDetail(container, data = {}) {
    if (!container || !data.event) return;

    const event = data.event;
    const currentUserId = data.currentUserId;
    const members = Array.isArray(event.confirmedMembers) ? event.confirmedMembers : [];
    const attendance = members.find(member => String(member.id || member.userId) === String(currentUserId));
    const date = getDate(event);
    const creatorId = event.creatorId || event.createdBy?.id || event.createdBy;
    const canEdit = currentUserId && creatorId && String(currentUserId) === String(creatorId);
    const started = hasStarted(event);
    const canPostToEvent = started && event.status !== "finished" && event.status !== "cancelled";

    container.innerHTML = `
        <article class="event-detail">
            <div class="event-detail__status-row">
                <span class="event-detail__status">${statusLabel(event.status)}</span>
                ${canEdit ? `<div class="event-detail__owner-actions"><button type="button" class="event-detail__edit" data-action="edit-event"><span data-icon="edit"></span> Editar</button>${canPostToEvent ? `<button type="button" class="event-detail__edit" data-action="finish-event"><span data-icon="flag"></span> Encerrar</button>` : ""}<button type="button" class="event-detail__delete" data-action="delete-event"><span data-icon="trash"></span> Excluir</button></div>` : ""}
            </div>

            <div class="event-detail__title-row">
                <div>
                    <span class="event-detail__eyebrow">EVENTO DO CLUBE</span>
                    <h2>${escapeHTML(event.title || event.name || "Evento")}</h2>
                </div>
                <span class="event-detail__calendar" data-icon="calendar"></span>
            </div>

            <div class="event-detail__info-grid">
                <div><span data-icon="calendar"></span><small>DATA</small><strong>${date ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "Não definida"}</strong></div>
                <div><span data-icon="clock"></span><small>HORÁRIO</small><strong>${date ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</strong></div>
                <div class="event-detail__info-wide"><span data-icon="location"></span><small>LOCAL</small><strong>${escapeHTML(event.location || "Local a definir")}</strong></div>
            </div>

            ${event.description ? `<div class="event-detail__description"><span>DESCRIÇÃO</span><p>${escapeHTML(event.description)}</p></div>` : ""}

            <section class="event-detail__participation">
                <div class="event-detail__section-heading">
                    <div><span>SUA PARTICIPAÇÃO</span><h3>${attendance ? "Você está confirmado" : "Você vai participar?"}</h3></div>
                    <span class="event-detail__member-count"><span data-icon="users"></span>${members.length}</span>
                </div>
                ${attendance ? `
                    <div class="event-attendance-card is-confirmed">
                        <div><strong>Presença confirmada</strong><small>${escapeHTML(getVehicleLabel(attendance.vehicle || attendance.attendanceVehicle))}</small></div>
                        <button type="button" class="button button--danger button--small" data-action="cancel-attendance">Cancelar</button>
                    </div>
                ` : `
                    <div class="event-attendance-card">
                        <div><strong>Confirme sua presença</strong><small>Escolha o veículo que estará com você.</small></div>
                        <button type="button" class="button button--primary button--small" data-action="confirm-attendance">Confirmar</button>
                    </div>
                `}
                <div class="event-detail__vehicle-block">
                    <span>COMO VOCÊ VAI?</span>
                    ${renderVehicleSelector(data.vehicles || [], attendance?.vehicle || data.currentUserVehicle)}
                </div>
            </section>

            <section class="event-detail__members">
                <div class="event-detail__section-heading"><div><span>QUEM VAI</span><h3>Membros confirmados</h3></div><strong>${members.length}</strong></div>
                ${renderMembers(members)}
            </section>
        </article>
    `;

    void refreshEventMemberAvatars(container, members);

    container.querySelector("[data-action='finish-event']")?.addEventListener("click", () => {
        const modal = createModal({
            title: "Encerrar evento?",
            content: `<div class="event-delete-confirm"><p>O evento <strong>${escapeHTML(event.title)}</strong> será marcado como encerrado e ficará registrado na timeline.</p><div class="event-delete-confirm__actions"><button type="button" class="button button--secondary" data-cancel>Cancelar</button><button type="button" class="button button--primary" data-confirm>Encerrar evento</button></div></div>`
        });
        modal?.element?.querySelector("[data-cancel]")?.addEventListener("click", () => modal.close());
        modal?.element?.querySelector("[data-confirm]")?.addEventListener("click", async () => {
            try {
                const user = session.getUser?.() || session.getCurrentUser?.();
                const updated = await finishEvent(event.id, user?.id || currentUserId);
                modal.close();
                eventBus.emit("event:updated", updated);
                showToast({ type: "success", message: "Evento encerrado e registrado na timeline." });
                if (router.getCurrentRoute?.() === "events") router.navigate("events", { eventId: event.id, replace: true });
            } catch (error) { showToast({ type: "error", message: error.message || "Não foi possível encerrar o evento." }); }
        });
    });

    container.querySelector("[data-action='edit-event']")?.addEventListener("click", () => router.navigate("event-edit", { eventId: event.id }));

    container.querySelector("[data-action='delete-event']")?.addEventListener("click", () => {
        const modal = createModal({
            title: "Excluir evento?",
            content: `
                <div class="event-delete-confirm">
                    <p>O evento <strong>${escapeHTML(event.title || event.name || "Evento")}</strong> será removido do clube. Essa ação não pode ser desfeita.</p>
                    <div class="event-delete-confirm__actions">
                        <button type="button" class="button button--secondary" data-cancel>Cancelar</button>
                        <button type="button" class="button button--danger" data-confirm>Excluir evento</button>
                    </div>
                </div>`
        });
        modal?.element?.querySelector("[data-cancel]")?.addEventListener("click", () => modal.close());
        modal?.element?.querySelector("[data-confirm]")?.addEventListener("click", async () => {
            try {
                const user = session.getUser?.() || session.getCurrentUser?.();
                await deleteEvent(event.id, user?.id || currentUserId);
                modal.close();
                eventBus.emit("event:deleted", { id: event.id });
                showToast({ type: "success", message: "Evento excluído." });
                router.navigate("events", { replace: true });
            } catch (error) {
                showToast({ type: "error", message: error.message || "Não foi possível excluir o evento." });
            }
        });
    });

    container.querySelector("[data-action='confirm-attendance']")?.addEventListener("click", async () => {
        try {
            const user = session.getUser?.() || session.getCurrentUser?.();
            const selectedId = container.querySelector(".event-vehicle-option.is-selected")?.dataset.vehicleId || "on_foot";
            const vehicle = selectedId === "on_foot"
                ? { id: "on_foot", type: "on_foot", name: "A pé" }
                : (data.vehicles || []).find(item => String(item.id) === String(selectedId)) || data.currentUserVehicle;
            const updated = await confirmAttendance(event.id, user, vehicle);
            eventBus.emit("event:updated", updated);
            showToast({ type: "success", message: "Presença confirmada." });
            if (router.getCurrentRoute?.() === "events") router.navigate("events", { eventId: event.id, replace: true });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível confirmar." });
        }
    });

    container.querySelector("[data-action='cancel-attendance']")?.addEventListener("click", async () => {
        try {
            const user = session.getUser?.() || session.getCurrentUser?.();
            await cancelAttendance(event.id, user?.id);
            eventBus.emit("event:updated", { id: event.id });
            showToast({ type: "success", message: "Presença removida." });
            if (router.getCurrentRoute?.() === "events") router.navigate("events", { eventId: event.id, replace: true });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível cancelar." });
        }
    });

    container.querySelectorAll("[data-vehicle-id]").forEach(button => {
        button.addEventListener("click", () => {
            container.querySelectorAll("[data-vehicle-id]").forEach(item => item.classList.remove("is-selected"));
            button.classList.add("is-selected");
        });
    });

    container.querySelectorAll("[data-member-id]").forEach(button => {
        button.addEventListener("click", () => router.navigate("member-profile", { userId: button.dataset.memberId }));
    });
}
