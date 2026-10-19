import { router } from "../../core/router.js";
import { showToast } from "../../components/toast.js";
import { initDropdowns } from "../../components/dropdown.js";
import { getEvent, updateEvent } from "../../services/events.js";
import { getCurrentUser } from "../../services/auth.js";

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getDateParts(event) {
    const value =
        event?.dateTime ||
        event?.startAt ||
        event?.startDate ||
        event?.date;

    if (!value) {
        return {
            date: "",
            time: ""
        };
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return {
            date: "",
            time: ""
        };
    }

    const year = parsed.getFullYear();
    const month = String(
        parsed.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        parsed.getDate()
    ).padStart(2, "0");

    const hours = String(
        parsed.getHours()
    ).padStart(2, "0");

    const minutes = String(
        parsed.getMinutes()
    ).padStart(2, "0");

    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`
    };
}

export async function renderEventEdit(data = {}) {
    const root = document.querySelector("#app-view");

    if (!root) return;

    let event = data.event || null;
    if (!event && data.eventId) {
        event = await getEvent(data.eventId);
    }

    if (!event) {
        showToast({
            type: "error",
            message: "Evento não encontrado."
        });

        router.back();
        return;
    }

    const currentUser = await getCurrentUser();
    const currentUserId = data.currentUserId || currentUser?.id;

    const creatorId =
        event.creatorId ||
        event.createdBy?.id ||
        event.createdBy;

    const canEdit =
        currentUserId &&
        creatorId &&
        String(currentUserId) === String(creatorId);

    if (!canEdit) {
        showToast({
            type: "error",
            message: "Somente o criador pode editar este evento."
        });

        router.back();
        return;
    }

    const dateParts = getDateParts(event);

    root.innerHTML = `
        <section class="event-form-view">

            <header class="event-form-view__header">

                <button
                    type="button"
                    class="icon-button"
                    data-action="back"
                    aria-label="Voltar"
                >
                    <span data-icon="arrow-left"></span>
                </button>

                <div>
                    <span class="event-form-view__eyebrow">
                        MOTOCLUBE
                    </span>

                    <h1>Editar evento</h1>
                </div>

            </header>

            <form
                id="event-edit-form"
                class="event-form"
                novalidate
            >

                <div class="form-field">
                    <label for="event-title">
                        Nome do evento
                    </label>

                    <input
                        id="event-title"
                        name="title"
                        type="text"
                        maxlength="100"
                        autocomplete="off"
                        value="${escapeHTML(
                            event.title ||
                            event.name ||
                            ""
                        )}"
                        required
                    >
                </div>

                <div class="form-row">

                    <div class="form-field">
                        <label for="event-date">
                            Data
                        </label>

                        <input
                            id="event-date"
                            name="date"
                            type="date"
                            value="${escapeHTML(
                                dateParts.date
                            )}"
                            required
                        >
                    </div>

                    <div class="form-field">
                        <label for="event-time">
                            Horário
                        </label>

                        <input
                            id="event-time"
                            name="time"
                            type="time"
                            value="${escapeHTML(
                                dateParts.time
                            )}"
                            required
                        >
                    </div>

                </div>

                <div class="form-field">
                    <label for="event-location">
                        Local
                    </label>

                    <input
                        id="event-location"
                        name="location"
                        type="text"
                        maxlength="160"
                        autocomplete="off"
                        value="${escapeHTML(
                            event.location || ""
                        )}"
                    >
                </div>

                <div class="form-field">
                    <label for="event-description">
                        Descrição
                    </label>

                    <textarea
                        id="event-description"
                        name="description"
                        maxlength="2000"
                        rows="6"
                    >${escapeHTML(
                        event.description || ""
                    )}</textarea>
                </div>

                <div class="form-field">
                    <label for="event-status">
                        Status
                    </label>

                    <select
                        id="event-status"
                        name="status"
                    >
                        <option
                            value="planning"
                            ${
                                String(event.status).toLowerCase() ===
                                    "planning"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Em planejamento
                        </option>

                        <option
                            value="confirmed"
                            ${
                                String(event.status).toLowerCase() ===
                                    "confirmed"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Confirmado
                        </option>
                    </select>
                </div>

                <div class="event-form__notice">
                    <span data-icon="info"></span>

                    <p>
                        A edição do evento não altera o veículo
                        escolhido individualmente por cada participante.
                    </p>
                </div>

                <div class="event-form__actions">

                    <button
                        type="button"
                        class="button button--secondary"
                        data-action="cancel"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="button button--primary"
                    >
                        Salvar alterações
                    </button>

                </div>

            </form>

        </section>
    `;

    initDropdowns(root);

    root.querySelector("[data-action='back']")
        ?.addEventListener("click", () => {
            router.back();
        });

    root.querySelector("[data-action='cancel']")
        ?.addEventListener("click", () => {
            router.back();
        });

    const form = root.querySelector("#event-edit-form");

    form?.addEventListener("submit", async (submitEvent) => {
        submitEvent.preventDefault();

        const formData = new FormData(form);

        const title =
            String(formData.get("title") || "").trim();

        const date =
            String(formData.get("date") || "");

        const time =
            String(formData.get("time") || "");

        const location =
            String(formData.get("location") || "").trim();

        const description =
            String(formData.get("description") || "").trim();

        const status =
            String(formData.get("status") || "planning");

        if (!title) {
            showToast({
                type: "error",
                message: "Informe o nome do evento."
            });

            return;
        }

        if (!date || !time) {
            showToast({
                type: "error",
                message: "Informe a data e o horário."
            });

            return;
        }

        const dateTime = `${date}T${time}:00`;

        const timestamp =
            new Date(dateTime).getTime();

        if (Number.isNaN(timestamp)) {
            showToast({
                type: "error",
                message: "Data ou horário inválido."
            });

            return;
        }

        if (timestamp <= Date.now()) {
            showToast({
                type: "error",
                message: "O evento precisa continuar no futuro."
            });

            return;
        }

        try {
            await updateEvent(
                event.id,
                { title, dateTime, startAt: dateTime, location, description, status },
                currentUserId
            );
            showToast({ type: "success", message: "Evento atualizado." });
            await router.navigate("events", { eventId: event.id, replace: true });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível atualizar o evento." });
        }
    });
}

export function initializeEventEdit(data = {}) {
    return renderEventEdit(data);
}