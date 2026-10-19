import { router } from "../../core/router.js";
import { createStatusRing } from "../../components/status-ring.js";
import { openVehicleEditSheet } from "./vehicle-edit.js";
import { openVehicleCreateSheet } from "./vehicle-create.js";
import { getVehicles, getCurrentVehicle } from "../../services/vehicles.js";

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getVehicleName(vehicle) {
    if (vehicle.type === "motorcycle") {
        return vehicle.model ||
            "Motocicleta";
    }

    if (vehicle.type === "car") {
        return vehicle.model ||
            "Carro";
    }

    return "A pé";
}

function getVehicleType(vehicle) {
    if (vehicle.type === "motorcycle") {
        return "Motocicleta";
    }

    if (vehicle.type === "car") {
        return "Carro";
    }

    return "A pé";
}

function getIcon(vehicle) {
    if (vehicle.type === "motorcycle") {
        return "motorcycle";
    }

    if (vehicle.type === "car") {
        return "car";
    }

    return "walk";
}

export async function renderVehicles(data = {}) {
    const root = document.querySelector("#app-view");

    if (!root) return;

    // A rota do router chama renderVehicles(data) sem carregar os dados.
    // Buscar os veículos aqui evita mostrar a garagem vazia por padrão.
    if (!Array.isArray(data.vehicles)) {
        root.innerHTML = `
            <section class="vehicles-view">
                <header class="vehicles-view__header">
                    <button type="button" class="icon-button" data-action="back" aria-label="Voltar">
                        <span data-icon="arrow-left"></span>
                    </button>
                    <div><span class="vehicles-view__eyebrow">MOTOCLUBE</span><h1>Minha garagem</h1></div>
                </header>
                <div class="empty-state"><p>Carregando seus veículos…</p></div>
            </section>
        `;
        root.querySelector('[data-action="back"]')?.addEventListener("click", () => router.back());
        try {
            const [loadedVehicles, loadedCurrentVehicle] = await Promise.all([
                getVehicles(),
                getCurrentVehicle()
            ]);
            data = {
                ...data,
                vehicles: Array.isArray(loadedVehicles) ? loadedVehicles : [],
                currentVehicle: loadedCurrentVehicle || data.currentVehicle || null
            };
        } catch (error) {
            console.error("[VEHICLES] Falha ao carregar garagem:", error);
            root.innerHTML = `
                <section class="vehicles-view">
                    <header class="vehicles-view__header">
                        <button type="button" class="icon-button" data-action="back" aria-label="Voltar">
                            <span data-icon="arrow-left"></span>
                        </button>
                        <div><span class="vehicles-view__eyebrow">MOTOCLUBE</span><h1>Minha garagem</h1></div>
                    </header>
                    <div class="empty-state">
                        <h2>Não foi possível carregar os veículos</h2>
                        <p>Verifique sua conexão e tente novamente.</p>
                        <button type="button" class="button button--primary" data-action="retry">Tentar novamente</button>
                    </div>
                </section>
            `;
            root.querySelector('[data-action="back"]')?.addEventListener("click", () => router.back());
            root.querySelector('[data-action="retry"]')?.addEventListener("click", () => renderVehicles({}));
            return;
        }
    }

    const vehicles = Array.isArray(data.vehicles)
        ? data.vehicles
        : [];

    const currentVehicleId =
        data.currentVehicleId ||
        data.currentVehicle?.id ||
        null;

    root.innerHTML = `
        <section class="vehicles-view">

            <header class="vehicles-view__header">

                <button
                    type="button"
                    class="icon-button"
                    data-action="back"
                    aria-label="Voltar"
                >
                    <span data-icon="arrow-left"></span>
                </button>

                <div>
                    <span class="vehicles-view__eyebrow">
                        MOTOCLUBE
                    </span>

                    <h1>Minha garagem</h1>
                </div>

                <button
                    type="button"
                    class="icon-button"
                    data-action="create"
                    aria-label="Adicionar veículo"
                >
                    <span data-icon="plus"></span>
                </button>

            </header>

            <div class="vehicles-view__notice">
                <span data-icon="info"></span>

                <p>
                    O veículo atual é usado no seu perfil,
                    status, Ride e SOS. A opção "A pé" está
                    sempre disponível e não precisa ser cadastrada.
                </p>
            </div>

            <div class="vehicles-list">

                ${
                    vehicles.length
                        ? vehicles.map((vehicle) => {
                            const isCurrent =
                                String(vehicle.id) ===
                                String(currentVehicleId);

                            const status =
                                isCurrent
                                    ? "on"
                                    : "off";

                            return `
                                <article
                                    class="vehicle-card ${
                                        isCurrent
                                            ? "vehicle-card--current"
                                            : ""
                                    }"
                                    data-vehicle-id="${escapeHTML(
                                        vehicle.id
                                    )}"
                                >

                                    <div class="vehicle-card__icon">
                                        <span
                                            data-icon="${getIcon(
                                                vehicle
                                            )}"
                                        ></span>
                                    </div>

                                    <div class="vehicle-card__info">

                                        <span>
                                            ${getVehicleType(
                                                vehicle
                                            )}
                                        </span>

                                        <h2>
                                            ${escapeHTML(
                                                getVehicleName(
                                                    vehicle
                                                )
                                            )}
                                        </h2>

                                        ${
                                            vehicle.plate
                                                ? `
                                                    <small>
                                                        ${escapeHTML(
                                                            vehicle.plate
                                                        )}
                                                    </small>
                                                `
                                                : ""
                                        }

                                    </div>

                                    ${
                                        isCurrent
                                            ? `
                                                <div class="vehicle-card__current">
                                                    <span
                                                        class="vehicle-card__current-dot"
                                                    ></span>
                                                    Atual
                                                </div>
                                            `
                                            : ""
                                    }

                                    <button
                                        type="button"
                                        class="icon-button icon-button--small"
                                        data-action="edit"
                                        data-vehicle-id="${escapeHTML(
                                            vehicle.id
                                        )}"
                                        aria-label="Editar veículo"
                                    >
                                        <span data-icon="edit"></span>
                                    </button>

                                </article>
                            `;
                        }).join("")
                        : `
                            <div class="empty-state">
                                <span
                                    class="empty-state__icon"
                                    data-icon="vehicle"
                                ></span>

                                <h2>
                                    Nenhum veículo cadastrado
                                </h2>

                                <p>
                                    Cadastre sua primeira moto ou carro.
                                </p>

                                <button
                                    type="button"
                                    class="button button--primary"
                                    data-action="create"
                                >
                                    Cadastrar veículo
                                </button>
                            </div>
                        `
                }

            </div>

            <section class="vehicles-view__on_foot">

                <div class="vehicles-view__on_foot-icon">
                    <span data-icon="walk"></span>
                </div>

                <div>
                    <strong>A pé</strong>
                    <span>
                        Opção permanente do Motoclube
                    </span>
                </div>

                <span class="vehicles-view__permanent">
                    Permanente
                </span>

            </section>

        </section>
    `;

    root.querySelector(
        "[data-action='back']"
    )?.addEventListener(
        "click",
        () => router.back()
    );

    root.querySelectorAll(
        "[data-action='create']"
    ).forEach((button) => {
        button.addEventListener(
            "click",
            () => openVehicleCreateSheet({
                onCreated: async () => {
                    const nextVehicles = await getVehicles();
                    const nextCurrent = await getCurrentVehicle();
                    renderVehicles({
                        vehicles: nextVehicles,
                        currentVehicle: nextCurrent
                    });
                }
            })
        );
    });

    root.querySelectorAll(
        "[data-action='edit']"
    ).forEach((button) => {
        button.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();

                openVehicleEditSheet({
                    vehicleId: button.dataset.vehicleId,
                    onSaved: async () => {
                        const nextVehicles = await getVehicles();
                        const nextCurrent = await getCurrentVehicle();
                        renderVehicles({
                            vehicles: nextVehicles,
                            currentVehicle: nextCurrent
                        });
                    },
                    onDeleted: async () => {
                        const nextVehicles = await getVehicles();
                        const nextCurrent = await getCurrentVehicle();
                        renderVehicles({
                            vehicles: nextVehicles,
                            currentVehicle: nextCurrent
                        });
                    }
                });
            }
        );
    });

    root.querySelectorAll(
        ".vehicle-card"
    ).forEach((card) => {
        card.addEventListener(
            "click",
            () => {
                const vehicleId =
                    card.dataset.vehicleId;

                root.dispatchEvent(
                    new CustomEvent(
                        "vehicle:select",
                        {
                            bubbles: true,
                            detail: {
                                vehicleId
                            }
                        }
                    )
                );
            }
        );
    });
}

export function initializeVehicles(data = {}) {
    renderVehicles(data);
}