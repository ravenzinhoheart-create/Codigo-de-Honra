import { router } from "../../core/router.js";
import { createAvatar } from "../../components/avatar.js";
import { createStatusRing, STATUS } from "../../components/status-ring.js";
import { session } from "../../core/session.js";
import { getActiveSOSList, getActiveSOS } from "../../services/sos.js";
import { openSosDetailSheet } from "./sos-detail.js";

function vehicleLabel(vehicle) {
    if (!vehicle || vehicle.type === "on_foot") return "A pé";

    if (vehicle.type === "motorcycle") {
        return vehicle.model || "Motocicleta";
    }

    if (vehicle.type === "car") {
        return vehicle.model || "Carro";
    }

    return vehicle.model || "Veículo";
}

function statusLabel(status) {
    if (status === STATUS.SOS) return "SOS ATIVO";
    if (status === STATUS.RIDE) return "RIDE";
    if (status === STATUS.ON) return "ONLINE";
    return "OFFLINE";
}

export async function renderSos(data = {}) {
    const container = document.createElement("section");
    container.className = "sos-view";

    const currentUser = data.user || session.getUser?.() || {};
    let activeSos = Array.isArray(data.activeSos) ? data.activeSos : [];

    if (!activeSos.length && currentUser.status !== STATUS.OFF) {
        try { activeSos = await getActiveSOSList(); } catch { activeSos = []; }
    }

    const mySos = data.mySos || (currentUser.id ? await getActiveSOS(currentUser.id).catch(() => null) : null);
    const canCreate = currentUser.status === STATUS.ON || currentUser.status === STATUS.RIDE;

    container.innerHTML = `
        <header class="sos-view__header">
            <button
                type="button"
                class="icon-button"
                data-action="back"
                aria-label="Voltar"
            >
                <span data-icon="arrow-left"></span>
            </button>

            <div>
                <span class="sos-view__eyebrow">CENTRAL</span>
                <h1>SOS</h1>
            </div>

            ${
                canCreate
                    ? `
                        <button
                            type="button"
                            class="icon-button icon-button--danger"
                            data-action="create"
                            aria-label="Novo SOS"
                        >
                            <span data-icon="sos"></span>
                        </button>
                    `
                    : `<span class="sos-view__header-spacer"></span>`
            }
        </header>

        <div class="sos-view__content">

            ${
                currentUser.status === STATUS.SOS
                    ? `
                        <article class="sos-current-card">
                            <div class="sos-current-card__signal">
                                <span data-icon="sos"></span>
                            </div>

                            <div>
                                <span class="sos-current-card__eyebrow">
                                    SEU SOS
                                </span>

                                <h2>Pedido de ajuda ativo</h2>

                                <p>
                                    Sua localização está sendo compartilhada
                                    com os membros elegíveis.
                                </p>
                            </div>

                            <button
                                type="button"
                                class="button button--dark"
                                data-action="my-sos"
                            >
                                Ver SOS
                            </button>
                        </article>
                    `
                    : ""
            }

            <section class="sos-section">
                <div class="sos-section__heading">
                    <div>
                        <span class="sos-section__eyebrow">EM TEMPO REAL</span>
                        <h2>SOS ativos</h2>
                    </div>

                    <span class="sos-section__count">
                        ${activeSos.length}
                    </span>
                </div>

                ${
                    activeSos.length
                        ? `
                            <div class="sos-list">
                                ${activeSos.map(renderSosCard).join("")}
                            </div>
                        `
                        : `
                            <div class="sos-empty">
                                <div class="sos-empty__icon" data-icon="shield"></div>
                                <strong>Nenhum SOS ativo</strong>
                                <span>
                                    Quando houver um pedido de ajuda,
                                    ele aparecerá aqui.
                                </span>
                            </div>
                        `
                }
            </section>

            ${
                !canCreate && currentUser.status !== STATUS.SOS
                    ? `
                        <section class="sos-info">
                            <span data-icon="info"></span>
                            <div>
                                <strong>Como funciona</strong>
                                <p>
                                    Para emitir um SOS, seu status precisa
                                    estar em ON ou RIDE.
                                </p>
                            </div>
                        </section>
                    `
                    : ""
            }

        </div>
    `;

    bindEvents(container, { ...data, mySos });

    return container;
}

function renderSosCard(sos) {
    const issuer = sos.emitter || sos.user || sos.issuer || {};
    const vehicle = sos.vehicle || {};

    return `
        <button
            type="button"
            class="sos-card"
            data-sos-id="${sos.id || ""}"
        >
            <div class="sos-card__top">

                <div class="sos-card__avatar">
                    ${createAvatar({
                        src: issuer.avatar,
                        alt: issuer.username || "Membro",
                        size: "medium",
                        status: STATUS.SOS
                    }).outerHTML}
                </div>

                <div class="sos-card__identity">
                    <strong>${issuer.username || "Membro"}</strong>

                    <span>
                        ${statusLabel(STATUS.SOS)}
                    </span>
                </div>

                <span class="sos-card__signal" data-icon="sos"></span>

            </div>

            <div class="sos-card__body">

                <span class="sos-card__category">
                    ${({ conflict: "Conflito", motorcycle_breakdown: "Pane na moto", accident: "Acidente", natural_cause: "Causa natural", other: "Outro" }[sos.type] || sos.categoryLabel || sos.category || "Pedido de ajuda")}
                </span>

                <p>
                    ${sos.description || "Solicitação de assistência."}
                </p>

                <div class="sos-card__vehicle">
                    <span data-icon="${
                        vehicle.type === "car"
                            ? "car"
                            : vehicle.type === "motorcycle"
                                ? "motorcycle"
                                : "walk"
                    }"></span>

                    ${vehicleLabel(vehicle)}
                </div>

            </div>

            <div class="sos-card__footer">
                <span>
                    ${Array.isArray(sos.responders)
                        ? `${sos.responders.length} respondendo`
                        : "Nenhum respondente"}
                </span>

                <span data-icon="arrow-right"></span>
            </div>
        </button>
    `;
}

function bindEvents(container, data) {
    container.querySelector('[data-action="back"]')
        ?.addEventListener("click", () => router.back());

    container.querySelector('[data-action="create"]')
        ?.addEventListener("click", () => {
            router.navigate("sos", {
                create: true
            });
        });

    container.querySelector('[data-action="my-sos"]')
        ?.addEventListener("click", () => {
            if (data.mySos?.id) {
                openSosDetailSheet(data.mySos.id);
            }
        });

    container.querySelectorAll("[data-sos-id]")
        .forEach(card => {
            card.addEventListener("click", () => {
                const sosId = card.dataset.sosId;
                if (sosId) openSosDetailSheet(sosId);
            });
        });
}