// =========================================================
// MOTOCLUBE
// Minha Garagem — Bottom Sheet
// Greaser / Industrial Premium
// =========================================================

import { openBottomSheet } from "../../components/bottom-sheet.js";
import { openVehicleCreateSheet } from "./vehicle-create.js";
import { openVehicleEditSheet } from "./vehicle-edit.js";
import { icon } from "../../icons/icons.js";
import { getVehicles, getCurrentVehicle, selectVehicle } from "../../services/vehicles.js";
import { getCurrentUser } from "../../services/auth.js";
import { events } from "../../core/events.js";
import { showToast } from "../../components/toast.js";
import { createModal } from "../../components/modal.js";

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function vehicleIcon(type, size = 34) {
    return icon(type === "motorcycle" ? "motorcycle" : "car", {
        size,
        decorative: true
    });
}

function vehicleTitle(vehicle) {
    return vehicle?.model ||
        (vehicle?.type === "motorcycle" ? "Motocicleta" : "Carro");
}

function vehicleBrand(vehicle) {
    return vehicle?.brand || "Marca não informada";
}

function vehicleYear(vehicle) {
    return vehicle?.year || "Ano não informado";
}

function createGarageContent(vehicles, currentVehicle) {
    const root = document.createElement("div");
    root.className = "garage-sheet";

    const currentId = currentVehicle?.id || null;
    const currentIsFoot = currentVehicle?.type === "on_foot" || !currentId;

    const footCard = `
        <button
            type="button"
            class="garage-card garage-card--foot ${currentIsFoot ? "is-current" : ""}"
            data-vehicle-type="on_foot"
            aria-pressed="${currentIsFoot ? "true" : "false"}"
        >
            <span class="garage-card__badge">
                ${currentIsFoot ? icon("check", { size: 14, decorative: true }) : ""}
            </span>
            <span class="garage-card__icon">
                ${icon("walk", { size: 42, decorative: true })}
            </span>
            <span class="garage-card__content">
                <strong>A pé</strong>
                <span>Sem veículo</span>
            </span>
            <span class="garage-card__status">
                ${currentIsFoot ? "Atual" : "Disponível"}
            </span>
        </button>
    `;

    const vehicleCards = vehicles.map(vehicle => {
        const isCurrent = String(vehicle.id) === String(currentId);

        return `
            <article
                class="garage-card garage-card--vehicle ${isCurrent ? "is-current" : ""}"
                data-vehicle-id="${escapeHTML(vehicle.id)}"
            >
                <button
                    type="button"
                    class="garage-card__select"
                    data-action="select"
                    data-vehicle-id="${escapeHTML(vehicle.id)}"
                    aria-label="Selecionar ${escapeHTML(vehicleTitle(vehicle))}"
                >
                    <span class="garage-card__badge">
                        ${isCurrent ? icon("check", { size: 14, decorative: true }) : ""}
                    </span>
                    <span class="garage-card__icon">
                        ${vehicleIcon(vehicle.type, 42)}
                    </span>
                    <span class="garage-card__content">
                        <strong>${escapeHTML(vehicleBrand(vehicle))}</strong>
                        <span>${escapeHTML(vehicleTitle(vehicle))}</span>
                        <small>${escapeHTML(vehicleYear(vehicle))}</small>
                    </span>
                    <span class="garage-card__status">
                        ${isCurrent ? "Atual" : "Selecionar"}
                    </span>
                </button>

                <button
                    type="button"
                    class="garage-card__edit"
                    data-action="edit"
                    data-vehicle-id="${escapeHTML(vehicle.id)}"
                    aria-label="Editar ${escapeHTML(vehicleTitle(vehicle))}"
                >
                    ${icon("edit", { size: 16, decorative: true })}
                </button>
            </article>
        `;
    }).join("");

    root.innerHTML = `
        <div class="garage-sheet__intro">
            <div class="garage-sheet__mark">
                ${icon("vehicle", { size: 20, decorative: true })}
            </div>
            <div>
                <strong>Escolha seu veículo atual</strong>
                <span>Ele será usado no perfil, Ride e SOS.</span>
            </div>
        </div>

        <div class="garage-sheet__grid">
            ${footCard}
            ${vehicleCards}

            <button
                type="button"
                class="garage-card garage-card--add"
                data-action="create"
            >
                <span class="garage-card__add-icon">
                    ${icon("plus", { size: 34, decorative: true })}
                </span>
                <span class="garage-card__content">
                    <strong>Cadastrar veículo</strong>
                    <span>Adicionar moto ou carro</span>
                </span>
            </button>
        </div>
    `;

    return root;
}

function confirmVehicleChange({ vehicle, toFoot = false, onConfirm }) {
    const title = toFoot
        ? "Trocar veículo atual?"
        : "Trocar veículo atual?";

    const targetName = toFoot
        ? "A pé"
        : vehicleTitle(vehicle);

    const modal = createModal({
        title,
        size: "small",
        closeButton: true,
        closeOnOverlay: true,
        className: "modal--vehicle-confirm",
        content: `
            <div class="vehicle-confirm">
                <div class="vehicle-confirm__icon">
                    ${icon(toFoot ? "walk" : (vehicle?.type === "motorcycle" ? "motorcycle" : "car"), { size: 28, decorative: true })}
                </div>

                <div class="vehicle-confirm__copy">
                    <strong>Usar ${escapeHTML(targetName)} como veículo atual?</strong>
                    <span>Essa escolha será usada no seu perfil, Ride, SOS e novas publicações.</span>
                </div>

                <div class="vehicle-confirm__actions">
                    <button type="button" class="button button--secondary" data-confirm-cancel>Cancelar</button>
                    <button type="button" class="button button--primary" data-confirm-vehicle>Confirmar</button>
                </div>
            </div>
        `
    });

    if (!modal) return;

    modal.element.querySelector("[data-confirm-cancel]")?.addEventListener("click", () => {
        modal.close();
    });

    modal.element.querySelector("[data-confirm-vehicle]")?.addEventListener("click", async () => {
        const button = modal.element.querySelector("[data-confirm-vehicle]");
        button.disabled = true;
        button.classList.add("is-loading");

        try {
            await onConfirm();
            modal.close();
        } catch (error) {
            button.disabled = false;
            button.classList.remove("is-loading");
            throw error;
        }
    });

    return modal;
}

export async function openGarageSheet() {
    try {
        const [vehicles, currentVehicle, user] = await Promise.all([
            getVehicles(),
            getCurrentVehicle(),
            getCurrentUser()
        ]);

        const initialVehicles = Array.isArray(vehicles) ? vehicles : [];
        const initialCurrent = currentVehicle || user?.currentVehicle || { type: "on_foot" };

        const sheet = openBottomSheet({
            title: "Minha garagem",
            subtitle: `${initialVehicles.length} ${initialVehicles.length === 1 ? "veículo cadastrado" : "veículos cadastrados"}`,
            content: document.createElement("div"),
            className: "bottom-sheet--garage"
        });

        if (!sheet) return null;

        let currentVehicles = initialVehicles;
        let currentSelection = initialCurrent;
        let creating = false;

        async function refreshGarage() {
            const [nextVehicles, nextCurrent, nextUser] = await Promise.all([
                getVehicles(),
                getCurrentVehicle(),
                getCurrentUser()
            ]);

            currentVehicles = Array.isArray(nextVehicles) ? nextVehicles : [];
            currentSelection = nextCurrent || nextUser?.currentVehicle || { type: "on_foot" };

            sheet.body.innerHTML = "";
            const content = createGarageContent(currentVehicles, currentSelection);
            sheet.body.appendChild(content);
            bindContent(content);
        }

        async function bindContent(content) {
            content.querySelector('[data-vehicle-type="on_foot"]')?.addEventListener("click", () => {
                if (currentSelection?.type === "on_foot") return;

                confirmVehicleChange({
                    toFoot: true,
                    onConfirm: async () => {
                        try {
                            await selectVehicle({ type: "on_foot" });
                            const updatedUser = await getCurrentUser();
                            events.emit("user:updated", { user: updatedUser });
                            events.emit("vehicle:changed", {
                                vehicle: updatedUser?.currentVehicle || { type: "on_foot" }
                            });
                            showToast({ type: "success", message: "Veículo atual: A pé." });
                            await refreshGarage();
                        } catch (error) {
                            console.error("[GARAGE] Falha ao selecionar A pé:", error);
                            showToast({ type: "error", message: error.message || "Não foi possível alterar o veículo atual." });
                            throw error;
                        }
                    }
                });
            });

            content.querySelectorAll('[data-action="select"]').forEach(button => {
                button.addEventListener("click", async event => {
                    event.preventDefault();
                    event.stopPropagation();

                    const vehicleId = button.dataset.vehicleId;
                    const vehicle = currentVehicles.find(item => String(item.id) === String(vehicleId));
                    if (!vehicle) return;

                    if (String(vehicle.id) === String(currentSelection?.id)) return;

                    confirmVehicleChange({
                        vehicle,
                        onConfirm: async () => {
                            try {
                                await selectVehicle(vehicle);
                                const updatedUser = await getCurrentUser();
                                events.emit("user:updated", { user: updatedUser });
                                events.emit("vehicle:changed", {
                                    vehicle: updatedUser?.currentVehicle || vehicle
                                });
                                showToast({
                                    type: "success",
                                    message: `${vehicleTitle(vehicle)} agora é seu veículo atual.`
                                });
                                await refreshGarage();
                            } catch (error) {
                                console.error("[GARAGE] Falha ao selecionar veículo:", error);
                                showToast({ type: "error", message: error.message || "Não foi possível selecionar o veículo." });
                                throw error;
                            }
                        }
                    });
                });
            });

            content.querySelectorAll('[data-action="edit"]').forEach(button => {
                button.addEventListener("click", event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const vehicleId = button.dataset.vehicleId;
                    openVehicleEditSheet({
                        vehicleId,
                        onSaved: async () => {
                            await refreshGarage();
                        },
                        onDeleted: async () => {
                            await refreshGarage();
                        }
                    });
                });
            });

            content.querySelector('[data-action="create"]')?.addEventListener("click", () => {
                if (creating) return;
                creating = true;

                openVehicleCreateSheet({
                    onCreated: async () => {
                        await refreshGarage();
                    }
                });

                window.setTimeout(() => {
                    creating = false;
                }, 350);
            });
        }

        // Primeiro conteúdo.
        await refreshGarage();

        return sheet;
    } catch (error) {
        console.error("[GARAGE] Falha ao abrir garagem:", error);
        showToast({
            type: "error",
            message: error.message || "Não foi possível carregar sua garagem."
        });
        return null;
    }
}
