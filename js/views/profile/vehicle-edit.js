import { router } from "../../core/router.js";
import { showToast } from "../../components/toast.js";
import { createModal } from "../../components/modal.js";
import { openBottomSheet } from "../../components/bottom-sheet.js";
import { initDropdowns } from "../../components/dropdown.js";
import { getVehicles, updateVehicle, deleteVehicle } from "../../services/vehicles.js";
import { getCurrentUser } from "../../services/auth.js";
import { getEvents, updateEvent } from "../../services/events.js";

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export async function renderVehicleEdit(data = {}) {
    const root = document.querySelector("#app-view");

    if (!root) return;

    let vehicle = data.vehicle || null;
    if (!vehicle && data.vehicleId) {
        const vehicles = await getVehicles();
        vehicle = vehicles.find(item => String(item.id) === String(data.vehicleId)) || null;
    }

    if (!vehicle) {
        showToast({
            type: "error",
            message: "Veículo não encontrado."
        });

        router.back();
        return;
    }

    root.innerHTML = `
        <section class="vehicle-form-view">

            <header class="vehicle-form-view__header">

                <button
                    type="button"
                    class="icon-button"
                    data-action="back"
                    aria-label="Voltar"
                >
                    <span data-icon="arrow-left"></span>
                </button>

                <div>
                    <span class="vehicle-form-view__eyebrow">
                        MOTOCLUBE
                    </span>

                    <h1>Editar veículo</h1>
                </div>

            </header>

            <form
                id="vehicle-edit-form"
                class="vehicle-form"
                novalidate
            >

                <div class="form-field">
                    <label>Tipo</label>
                    <div class="vehicle-edit-static-field">
                        <span data-icon="${vehicle.type === "motorcycle" ? "motorcycle" : "car"}"></span>
                        <strong>${vehicle.type === "motorcycle" ? "Motocicleta" : "Carro"}</strong>
                    </div>
                </div>

                <div class="form-field">
                    <label for="vehicle-model">
                        Modelo
                    </label>

                    <input
                        id="vehicle-model"
                        name="model"
                        type="text"
                        maxlength="100"
                        autocomplete="off"
                        value="${escapeHTML(
                            vehicle.model ||
                            ""
                        )}"
                    >
                </div>

                <div class="form-row">

                    <div class="form-field">
                        <label for="vehicle-year">
                            Ano
                        </label>

                        <input
                            id="vehicle-year"
                            name="year"
                            type="number"
                            min="1900"
                            max="2100"
                            inputmode="numeric"
                            value="${
                                vehicle.year ||
                                ""
                            }"
                        >
                    </div>

                    <div class="form-field">
                        <label for="vehicle-color">
                            Cor
                        </label>

                        <input
                            id="vehicle-color"
                            name="color"
                            type="text"
                            maxlength="40"
                            autocomplete="off"
                            value="${escapeHTML(
                                vehicle.color ||
                                ""
                            )}"
                        >
                    </div>

                </div>

                <div class="form-field">
                    <label for="vehicle-plate">
                        Placa
                    </label>

                    <input
                        id="vehicle-plate"
                        name="plate"
                        type="text"
                        maxlength="10"
                        autocomplete="off"
                        autocapitalize="characters"
                        value="${escapeHTML(
                            vehicle.plate ||
                            ""
                        )}"
                    >
                </div>

                <div class="vehicle-form__actions">

                    <button
                        type="button"
                        class="button button--danger"
                        data-action="delete"
                    >
                        Excluir veículo
                    </button>

                    <div class="vehicle-form__actions-main">

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
                            Salvar
                        </button>

                    </div>

                </div>

            </form>

        </section>
    `;

    initDropdowns(root);

    root.querySelector(
        "[data-action='back']"
    )?.addEventListener(
        "click",
        () => router.back()
    );

    root.querySelector(
        "[data-action='cancel']"
    )?.addEventListener(
        "click",
        () => router.back()
    );

    root.querySelector(
        "#vehicle-edit-form"
    )?.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const formData =
                new FormData(
                    event.currentTarget
                );

            const model =
                String(
                    formData.get("model") || ""
                ).trim();

            const yearRaw =
                String(
                    formData.get("year") || ""
                ).trim();

            const color =
                String(
                    formData.get("color") || ""
                ).trim();

            const plate =
                String(
                    formData.get("plate") || ""
                )
                    .trim()
                    .toUpperCase();

            let year = null;

            if (yearRaw) {
                year = Number(yearRaw);

                if (
                    !Number.isInteger(year) ||
                    year < 1900 ||
                    year > 2100
                ) {
                    showToast({
                        type: "error",
                        message:
                            "Informe um ano válido."
                    });

                    return;
                }
            }

            if (!model) {
                showToast({ type: "error", message: "Informe o modelo do veículo." });
                return;
            }

            try {
                const updated = await updateVehicle(vehicle.id, {
                    name: "",
                    model,
                    year,
                    color,
                    plate
                });
                showToast({ type: "success", message: `${updated.model} atualizado.` });
                await router.navigate("vehicles", { replace: true });
            } catch (error) {
                showToast({ type: "error", message: error.message || "Não foi possível salvar o veículo." });
            }
        }
    );

    root.querySelector(
        "[data-action='delete']"
    )?.addEventListener(
        "click",
        async () => {
            /*
             * A exclusão precisa listar todos os eventos
             * que usam este veículo e exigir substituição
             * antes da confirmação.
             *
             * Nenhum confirm() nativo é usado.
             */
            getEvents().then(events => {
                const affectedEvents = (events || []).filter(event =>
                    Array.isArray(event.confirmedMembers) &&
                    event.confirmedMembers.some(member => {
                        const selected = member.vehicle || member.attendanceVehicle;
                        return String(selected?.id || "") === String(vehicle.id);
                    })
                );

                return getVehicles().then(vehicles => ({ affectedEvents, vehicles }));
            }).then(({ affectedEvents, vehicles }) => {
                openDeleteModal(root, vehicle, affectedEvents, vehicles, async replacements => {
                    const allEvents = await getEvents();
                    for (const event of allEvents) {
                        if (!affectedEvents.some(item => String(item.id) === String(event.id))) continue;
                        const replacementId = replacements[event.id];
                        const updatedMembers = (event.confirmedMembers || []).map(member => {
                            const selected = member.vehicle || member.attendanceVehicle;
                            if (String(selected?.id || "") !== String(vehicle.id)) return member;
                            const replacement = replacementId === "on_foot"
                                ? { id: "on_foot", type: "on_foot", model: "A pé" }
                                : vehicles.find(item => String(item.id) === String(replacementId));
                            return { ...member, vehicle: replacement || { type: "on_foot", id: "on_foot", model: "A pé" } };
                        });
                        await updateEvent(event.id, { confirmedMembers: updatedMembers });
                    }
                    await deleteVehicle(vehicle.id);
                    showToast({ type: "success", message: `${vehicle.model || "Veículo"} removido da garagem.` });
                    await router.navigate("vehicles", { replace: true });
                });
            }).catch(error => {
                showToast({ type: "error", message: error.message || "Não foi possível preparar a exclusão." });
            });
        }
    );
}

function openDeleteModal(
    root,
    vehicle,
    affectedEvents,
    vehicles = [],
    onConfirm = null
) {
    const availableVehicles = [
        {
            id: "on_foot",
            type: "on_foot",
            name: "A pé"
        },
        ...vehicles.filter(
            (item) =>
                String(item.id) !==
                String(vehicle.id)
        )
    ];

    const modal = createModal({
        title: "Excluir veículo",
        closeButton: true
    });

    const body = modal.body;

    if (!affectedEvents.length) {
        body.innerHTML = `
            <div class="delete-vehicle-dialog">

                <p>
                    Você está prestes a excluir
                    <strong>
                        ${escapeHTML(
                            vehicle.model ||
                            "este veículo"
                        )}
                    </strong>.
                </p>

                <p>
                    Essa ação não poderá ser desfeita.
                </p>

                <div class="delete-vehicle-dialog__actions">

                    <button
                        type="button"
                        class="button button--secondary"
                        data-delete-action="cancel"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        class="button button--danger"
                        data-delete-action="confirm"
                    >
                        Excluir
                    </button>

                </div>

            </div>
        `;
    } else {
        body.innerHTML = `
            <div class="delete-vehicle-dialog">

                <p>
                    Este veículo está vinculado a
                    <strong>
                        ${affectedEvents.length}
                        evento${
                            affectedEvents.length === 1
                                ? ""
                                : "s"
                        }
                    </strong>.
                </p>

                <p>
                    Escolha o veículo que substituirá
                    este veículo em cada evento.
                </p>

                <div class="delete-vehicle-events">

                    ${affectedEvents.map((event) => `
                        <div
                            class="delete-vehicle-event"
                            data-event-id="${escapeHTML(
                                event.id
                            )}"
                        >
                            <strong>
                                ${escapeHTML(
                                    event.title ||
                                    event.name ||
                                    "Evento"
                                )}
                            </strong>

                            <select
                                data-replacement-event-id="${escapeHTML(
                                    event.id
                                )}"
                            >
                                ${availableVehicles
                                    .map((replacement) => `
                                        <option
                                            value="${escapeHTML(
                                                replacement.id
                                            )}"
                                        >
                                            ${escapeHTML(
                                                replacement.model ||
                                                (
                                                    replacement.type ===
                                                    "on_foot"
                                                        ? "A pé"
                                                        : "Veículo"
                                                )
                                            )}
                                        </option>
                                    `)
                                    .join("")}
                            </select>
                        </div>
                    `).join("")}

                </div>

                <div class="delete-vehicle-dialog__actions">

                    <button
                        type="button"
                        class="button button--secondary"
                        data-delete-action="cancel"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        class="button button--danger"
                        data-delete-action="confirm"
                    >
                        Substituir e excluir
                    </button>

                </div>

            </div>
        `;
    }

    initDropdowns(body);

    body.querySelector(
        "[data-delete-action='cancel']"
    )?.addEventListener(
        "click",
        () => modal.close()
    );

    body.querySelector(
        "[data-delete-action='confirm']"
    )?.addEventListener(
        "click",
        () => {
            const replacements = {};

            body.querySelectorAll(
                "[data-replacement-event-id]"
            ).forEach((select) => {
                replacements[
                    select.dataset
                        .replacementEventId
                ] = select.value;
            });

            const confirmButton = body.querySelector("[data-delete-action='confirm']");
            if (confirmButton) {
                confirmButton.disabled = true;
                confirmButton.classList.add("is-loading");
            }

            Promise.resolve(onConfirm?.(replacements))
                .then(() => modal.close())
                .catch(error => {
                    if (confirmButton) {
                        confirmButton.disabled = false;
                        confirmButton.classList.remove("is-loading");
                    }
                    showToast({ type: "error", message: error.message || "Não foi possível excluir o veículo." });
                });
        }
    );
}



export async function openVehicleEditSheet({ vehicleId, vehicle = null, onSaved = null, onDeleted = null } = {}) {
    let currentVehicle = vehicle;

    if (!currentVehicle && vehicleId) {
        const vehicles = await getVehicles();
        currentVehicle = vehicles.find(item => String(item.id) === String(vehicleId)) || null;
    }

    if (!currentVehicle) {
        showToast({ type: "error", message: "Veículo não encontrado." });
        return null;
    }

    const content = document.createElement("section");
    content.className = "vehicle-edit-sheet";

    const typeLabel = currentVehicle.type === "motorcycle" ? "Motocicleta" : "Carro";
    const typeIcon = currentVehicle.type === "motorcycle" ? "motorcycle" : "car";

    content.innerHTML = `
        <div class="vehicle-edit-sheet__intro">
            <div class="vehicle-edit-sheet__mark">
                <span data-icon="${typeIcon}"></span>
            </div>
            <div class="vehicle-edit-sheet__intro-copy">
                <strong>${escapeHTML(currentVehicle.model || "Veículo")}</strong>
                <span>${escapeHTML(typeLabel)}${currentVehicle.brand ? ` · ${escapeHTML(currentVehicle.brand)}` : ""}</span>
            </div>
        </div>

        <form class="vehicle-form" id="vehicle-edit-sheet-form" novalidate>
            <div class="form-field">
                <label>Tipo</label>
                <div class="vehicle-edit-static-field">
                    <span data-icon="${typeIcon}"></span>
                    <strong>${escapeHTML(typeLabel)}</strong>
                </div>
            </div>

            <div class="form-field">
                <label for="vehicle-edit-sheet-model">Modelo</label>
                <input id="vehicle-edit-sheet-model" name="model" type="text" maxlength="100" autocomplete="off" value="${escapeHTML(currentVehicle.model || "")}" required>
            </div>

            <div class="form-row">
                <div class="form-field">
                    <label for="vehicle-edit-sheet-year">Ano</label>
                    <input id="vehicle-edit-sheet-year" name="year" type="number" min="1900" max="2100" inputmode="numeric" value="${escapeHTML(currentVehicle.year || "")}">
                </div>

                <div class="form-field">
                    <label for="vehicle-edit-sheet-color">Cor</label>
                    <input id="vehicle-edit-sheet-color" name="color" type="text" maxlength="40" autocomplete="off" value="${escapeHTML(currentVehicle.color || "")}">
                </div>
            </div>

            <div class="form-field">
                <label for="vehicle-edit-sheet-plate">Placa</label>
                <input id="vehicle-edit-sheet-plate" name="plate" type="text" maxlength="10" autocomplete="off" autocapitalize="characters" value="${escapeHTML(currentVehicle.plate || "")}">
            </div>

            <div class="vehicle-edit-sheet__actions">
                <button type="button" class="button button--secondary" data-edit-sheet-cancel>Cancelar</button>
                <button type="submit" class="button button--primary" data-edit-sheet-save>Salvar alterações</button>
            </div>

            <div class="vehicle-edit-sheet__danger">
                <button type="button" data-edit-sheet-delete>Excluir veículo</button>
            </div>
        </form>
    `;

    const sheet = openBottomSheet({
        title: "Editar veículo",
        subtitle: "Atualize os dados da sua garagem.",
        content,
        className: "bottom-sheet--vehicle-edit",
        stack: true
    });

    if (!sheet) return null;

    const form = content.querySelector("#vehicle-edit-sheet-form");

    content.querySelector("[data-edit-sheet-cancel]")?.addEventListener("click", () => sheet.close());

    form?.addEventListener("submit", async event => {
        event.preventDefault();
        const saveButton = content.querySelector("[data-edit-sheet-save]");
        const formData = new FormData(form);
        const model = String(formData.get("model") || "").trim();
        const yearRaw = String(formData.get("year") || "").trim();
        const color = String(formData.get("color") || "").trim();
        const plate = String(formData.get("plate") || "").trim().toUpperCase();

        if (!model) {
            showToast({ type: "error", message: "Informe o modelo do veículo." });
            return;
        }

        const year = yearRaw ? Number(yearRaw) : null;
        if (yearRaw && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
            showToast({ type: "error", message: "Informe um ano válido." });
            return;
        }

        saveButton.disabled = true;
        saveButton.classList.add("is-loading");

        try {
            const updated = await updateVehicle(currentVehicle.id, {
                name: "",
                model,
                year,
                color,
                plate
            });

            showToast({ type: "success", message: `${updated.model || model} atualizado.` });
            sheet.close();
            await onSaved?.(updated);
        } catch (error) {
            saveButton.disabled = false;
            saveButton.classList.remove("is-loading");
            showToast({ type: "error", message: error.message || "Não foi possível salvar o veículo." });
        }
    });

    content.querySelector("[data-edit-sheet-delete]")?.addEventListener("click", async () => {
        try {
            const [allEvents, allVehicles] = await Promise.all([getEvents(), getVehicles()]);
            const affectedEvents = (allEvents || []).filter(event =>
                Array.isArray(event.confirmedMembers) &&
                event.confirmedMembers.some(member => {
                    const selected = member.vehicle || member.attendanceVehicle;
                    return String(selected?.id || "") === String(currentVehicle.id);
                })
            );

            openDeleteModal(content, currentVehicle, affectedEvents, allVehicles, async replacements => {
                for (const event of affectedEvents) {
                    const replacementId = replacements[event.id];
                    const updatedMembers = (event.confirmedMembers || []).map(member => {
                        const selected = member.vehicle || member.attendanceVehicle;
                        if (String(selected?.id || "") !== String(currentVehicle.id)) return member;
                        const replacement = replacementId === "on_foot"
                            ? { id: "on_foot", type: "on_foot", model: "A pé" }
                            : allVehicles.find(item => String(item.id) === String(replacementId));
                        return { ...member, vehicle: replacement || { id: "on_foot", type: "on_foot", model: "A pé" } };
                    });
                    await updateEvent(event.id, { confirmedMembers: updatedMembers });
                }

                await deleteVehicle(currentVehicle.id);
                sheet.close();
                await onDeleted?.(currentVehicle);
                await onSaved?.(null);
            });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível preparar a exclusão." });
        }
    });

    return sheet;
}

export function initializeVehicleEdit(data = {}) {
    return renderVehicleEdit(data);
}