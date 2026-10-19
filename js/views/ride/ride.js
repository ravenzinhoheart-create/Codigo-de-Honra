// =========================================================
// MOTOCLUBE — RIDE
// Fluxo premium: destino → saída → chegada → retorno → fim
// =========================================================

import { router } from "../../core/router.js";
import { session } from "../../core/session.js";
import { store } from "../../core/store.js";
import { events as eventBus } from "../../core/events.js";
import { USER_STATUS, VEHICLE_TYPE } from "../../core/constants.js";
import { updateStatus } from "../../services/users.js";
import {
    startRide as createRide,
    endRide,
    getCurrentRide,
    updateRideFlow
} from "../../services/rides.js";
import { getCurrentVehicle } from "../../services/vehicles.js";
import { getMembers } from "../../services/users.js";
import { sendPushToUsers } from "../../services/notifications.js";
import { showToast } from "../../components/toast.js";
import { icon } from "../../icons/icons.js";
import { openBottomSheet } from "../../components/bottom-sheet.js";

let activeTimer = null;

const RIDE_PHASES = Object.freeze({
    OUTBOUND: "outbound",
    ARRIVED: "arrived",
    RETURNING: "returning",
    FINISHED: "finished"
});

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getUsername(user = {}) {
    return (
        user.username ||
        user.nickname ||
        user.displayName ||
        "Membro"
    );
}

function vehicleIconName(vehicle) {
    switch (vehicle?.type) {
        case VEHICLE_TYPE.MOTORCYCLE:
            return "motorcycle";
        case VEHICLE_TYPE.CAR:
            return "car";
        default:
            return "walk";
    }
}

function vehicleLabel(vehicle) {
    if (!vehicle || vehicle.type === VEHICLE_TYPE.ON_FOOT) {
        return "A pé";
    }

    return (
        vehicle.model ||
        (vehicle.type === VEHICLE_TYPE.MOTORCYCLE
            ? "Motocicleta"
            : "Carro")
    );
}

function vehicleTypeLabel(vehicle) {
    if (!vehicle || vehicle.type === VEHICLE_TYPE.ON_FOOT) {
        return "Deslocamento a pé";
    }

    if (vehicle.type === VEHICLE_TYPE.MOTORCYCLE) {
        return "Motocicleta";
    }

    if (vehicle.type === VEHICLE_TYPE.CAR) {
        return "Carro";
    }

    return "Veículo atual";
}

function formatElapsed(seconds = 0) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;

    return hours > 0
        ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function phaseFromRide(ride) {
    const phase = ride?.phase;

    if (Object.values(RIDE_PHASES).includes(phase)) {
        return phase;
    }

    return RIDE_PHASES.OUTBOUND;
}

function getStartedAt(ride) {
    const date = ride?.startedAt ? new Date(ride.startedAt) : null;

    if (!date || Number.isNaN(date.getTime())) {
        return Date.now();
    }

    return date.getTime();
}

async function notifyMembersOn({ user, destination, phase, reason = "normal" }) {
    try {
        const members = await getMembers();
        const currentUserId = user?.id || user?.uid || null;
        const username = getUsername(user);

        const messages = {
            [RIDE_PHASES.OUTBOUND]: {
                title: "Ride iniciada",
                body: `${username} saiu para Ride${destination ? ` com destino a ${destination}` : ""}.`
            },
            [RIDE_PHASES.ARRIVED]: {
                title: "Chegada na Ride",
                body: `${username} chegou ao destino${destination ? `: ${destination}` : "."}`
            },
            [RIDE_PHASES.RETURNING]: {
                title: "Retorno da Ride",
                body: `${username} está voltando da Ride${destination ? ` — ${destination}` : "."}`
            },
            [RIDE_PHASES.FINISHED]: reason === "manual"
                ? {
                    title: "Ride encerrada",
                    body: `${username} encerrou a Ride antes de concluir o percurso.`
                }
                : {
                    title: "Chegou em casa",
                    body: `${username} chegou em casa e encerrou a Ride.`
                }
        };

        const message = messages[phase];
        if (!message) return;

        const recipients = members.filter(member =>
            (!currentUserId || member.id !== currentUserId)
        );

        await sendPushToUsers(
            recipients.map(member => member.id),
            {
                type: "ride",
                ridePhase: phase,
                title: message.title,
                body: message.body,
                data: {
                    route: "ride",
                    username,
                    destination: destination || "",
                    phase
                }
            }
        );
    } catch (error) {
        // A Ride não deve ser bloqueada porque a camada de notificação falhou.
        console.warn("[RIDE] Falha ao notificar membros On:", error);
    }
}

function stopTimer() {
    if (activeTimer) {
        clearInterval(activeTimer);
        activeTimer = null;
    }
}

function startTimer(container, startedAt) {
    stopTimer();

    const update = () => {
        const elapsed = Math.max(
            0,
            Math.floor((Date.now() - startedAt) / 1000)
        );

        const element = container.querySelector("[data-ride-elapsed]");
        if (element) {
            element.textContent = formatElapsed(elapsed);
        }
    };

    update();
    activeTimer = setInterval(update, 1000);
}

function phaseMeta(phase) {
    return {
        [RIDE_PHASES.OUTBOUND]: {
            eyebrow: "ETAPA 01",
            title: "Saindo para Ride",
            text: "Avise o clube que você está na estrada.",
            icon: "navigation"
        },
        [RIDE_PHASES.ARRIVED]: {
            eyebrow: "ETAPA 02",
            title: "Cheguei ao destino",
            text: "Avise que você chegou. Seu status continua Ride.",
            icon: "flag"
        },
        [RIDE_PHASES.RETURNING]: {
            eyebrow: "ETAPA 03",
            title: "Voltando da Ride",
            text: "Avise que você iniciou o retorno para casa.",
            icon: "route"
        },
        [RIDE_PHASES.FINISHED]: {
            eyebrow: "ENCERRADA",
            title: "Ride finalizada",
            text: "Você está novamente disponível como On.",
            icon: "check"
        }
    }[phase];
}

function primaryActionMeta(active, phase) {
    if (!active) {
        return {
            action: "start",
            icon: "navigation",
            eyebrow: "STATUS SERÁ RIDE",
            title: "Iniciar Ride",
            className: "",
            note: "Ao iniciar, seu veículo atual será usado automaticamente."
        };
    }

    if (phase === RIDE_PHASES.OUTBOUND) {
        return {
            action: "advance",
            icon: "flag",
            eyebrow: "ETAPA 02 · AVISAR O CLUBE",
            title: "Cheguei ao destino",
            className: "",
            note: "Seu status continua RIDE."
        };
    }

    if (phase === RIDE_PHASES.ARRIVED) {
        return {
            action: "advance",
            icon: "route",
            eyebrow: "ETAPA 03 · AVISAR O CLUBE",
            title: "Estou voltando",
            className: "",
            note: "Você continua em RIDE até chegar em casa."
        };
    }

    return {
        action: "finish",
        icon: "check",
        eyebrow: "FINAL DA RIDE · AVISAR O CLUBE",
        title: "Cheguei em casa",
        className: "ride-main-action--finish",
        note: "Ao confirmar, seu status volta para ON."
    };
}


function escapeDestination(value) {
    return escapeHTML(String(value || "").trim());
}

export function openRideModal(data = {}) {
    const existing = document.querySelector(".bottom-sheet--ride");
    existing?._close?.();

    renderRide({
        ...data,
        modal: true
    }).then(container => {
        // O sistema global de Bottom Sheet é responsável pelo overlay,
        // animação e posicionamento. A Ride entra apenas como conteúdo.
        const sheet = openBottomSheet({
            className: "bottom-sheet--ride",
            title: "",
            content: container,
            closeOnBackdrop: true,
            closeOnEscape: true
        });

        if (!sheet) {
            container.remove();
            return;
        }

        // Permite que os próprios botões da Ride fechem o Bottom Sheet.
        container._rideSheetClose = sheet.close;
        container.classList.add("is-mounted");

        // Também permite que a troca de etapa preserve o mesmo Sheet.
        sheet.element._close = sheet.close;
    }).catch(error => {
        console.error("[RIDE] Falha ao abrir Bottom Sheet:", error);
        showToast({
            type: "error",
            message: error?.message || "Não foi possível abrir a Ride."
        });
    });
}

function closeRideContainer(container) {
    stopTimer();

    if (typeof container?._rideSheetClose === "function") {
        container._rideSheetClose();
        return;
    }

    container?.classList.remove("is-mounted");
    setTimeout(() => container?.remove(), 180);
}

async function replaceRideModal(container, data = {}) {
    const next = await renderRide({
        ...data,
        modal: true
    });

    const sheetElement = container.closest(".bottom-sheet");
    const body = sheetElement?.querySelector(".bottom-sheet__body");

    if (body) {
        container._rideSheetClose = container._rideSheetClose || sheetElement._close;
        body.replaceChildren(next);
        next._rideSheetClose = container._rideSheetClose;
        next.classList.add("is-mounted");
    } else {
        container.replaceWith(next);
        next.classList.add("is-mounted");
    }

    return next;
}

export async function renderRide(data = {}) {
    stopTimer();

    const container = document.createElement("section");
    container.className = "ride-view ride-bottom-sheet-overlay";

    let user = data.user || session.getUser?.() || {};
    let vehicle = data.currentVehicle || null;
    let ride = data.activeRide || null;

    try {
        vehicle = vehicle || await getCurrentVehicle();
    } catch (error) {
        console.warn("[RIDE] Não foi possível carregar veículo atual:", error);
    }

    try {
        const userId = user.id || user.uid;
        if (!ride && userId) {
            ride = await getCurrentRide(userId);
        }
    } catch (error) {
        console.warn("[RIDE] Não foi possível consultar a Ride ativa:", error);
    }

    const active = Boolean(
        ride ||
        user.status === USER_STATUS.RIDE
    );

    const initialPhase = active
        ? phaseFromRide(ride)
        : null;

    const destination =
        ride?.destination ||
        data.destination ||
        "";

    const startedAt = getStartedAt(ride);
    const currentPhase = initialPhase || RIDE_PHASES.OUTBOUND;
    const meta = phaseMeta(currentPhase);
    const primaryAction = primaryActionMeta(active, currentPhase);

    // Antes da Ride começar, nenhuma etapa fica destacada.
    // Depois de iniciar, somente a etapa em que o membro realmente está
    // recebe o destaque; as etapas anteriores ficam apenas como concluídas.
    const step1Class = active
        ? (currentPhase === RIDE_PHASES.OUTBOUND ? "is-current" : "is-done")
        : "";

    const step2Class = active
        ? (currentPhase === RIDE_PHASES.ARRIVED ? "is-current" :
            (currentPhase === RIDE_PHASES.RETURNING ? "is-done" : ""))
        : "";

    const step3Class = active && currentPhase === RIDE_PHASES.RETURNING
        ? "is-current"
        : "";

    container.innerHTML = `
        <div class="ride-modal ${active ? "is-active" : "is-planning"}" role="dialog" aria-modal="true" aria-labelledby="ride-modal-title">

            <div class="ride-modal__backdrop" data-action="backdrop"></div>

            <div class="ride-shell">

            <header class="ride-header">
                <button
                    type="button"
                    class="ride-header__back"
                    data-action="back"
                    aria-label="Voltar"
                >
                    ${icon("arrowLeft", { size: 21, decorative: true })}
                </button>

                <div class="ride-header__identity">
                    <span class="ride-header__eyebrow">MODO</span>
                    <h1 id="ride-modal-title">Ride</h1>
                </div>

                <div class="ride-header__status">
                    <span class="ride-header__status-dot"></span>
                    <span>${active ? "RIDE" : "ON"}</span>
                </div>
            </header>

            <div class="ride-content">

                <section class="ride-hero">
                    <div class="ride-hero__grain"></div>
                    <div class="ride-hero__icon">
                        ${icon("motorcycle", { size: 30, decorative: true })}
                    </div>
                    <div class="ride-hero__copy">
                        <span>${active ? "RIDE EM ANDAMENTO" : "PRONTO PARA A ESTRADA"}</span>
                        <strong>${active ? "Seu caminho, seu ritmo." : "Para onde você vai?"}</strong>
                    </div>
                </section>

                <section class="ride-destination">
                    <label for="ride-destination-input">
                        Destino da Ride
                    </label>

                    <div class="ride-destination__input-wrap">
                        <span class="ride-destination__icon">
                            ${icon("pin", { size: 19, decorative: true })}
                        </span>

                        <input
                            id="ride-destination-input"
                            type="text"
                            maxlength="120"
                            autocomplete="off"
                            placeholder="Ex.: Penedo, Petrópolis, casa..."
                            value="${escapeDestination(destination)}"
                            ${active ? "readonly" : ""}
                        >

                        ${active ? `
                            <span class="ride-destination__locked">
                                ${icon("lock", { size: 14, decorative: true })}
                            </span>
                        ` : ""}
                    </div>

                    <div class="ride-destination__hint">
                        <span>${icon("info", { size: 13, decorative: true })}</span>
                        <span>O destino fica registrado na Ride e acompanha as notificações do fluxo.</span>
                    </div>
                </section>

                <section class="ride-vehicle">
                    <div class="ride-vehicle__icon">
                        ${icon(vehicleIconName(vehicle), { size: 21, decorative: true })}
                    </div>
                    <div class="ride-vehicle__copy">
                        <span>VEÍCULO ATUAL</span>
                        <strong>${escapeHTML(vehicleLabel(vehicle))}</strong>
                        <small>${escapeHTML(vehicleTypeLabel(vehicle))}</small>
                    </div>
                    <span class="ride-vehicle__lock">
                        ${icon("lock", { size: 14, decorative: true })}
                    </span>
                </section>

                ${active ? `
                    <section class="ride-live-card">
                        <div class="ride-live-card__top">
                            <div>
                                <span class="ride-live-card__eyebrow">TEMPO DE RIDE</span>
                                <strong data-ride-elapsed>00:00</strong>
                            </div>

                            <div class="ride-live-card__phase">
                                <span class="ride-live-card__phase-dot"></span>
                                <span>ATIVA</span>
                            </div>
                        </div>

                        <div class="ride-live-card__destination">
                            ${icon("route", { size: 16, decorative: true })}
                            <span>${escapeHTML(destination || "Destino não informado")}</span>
                        </div>
                    </section>
                ` : ""}

                <section class="ride-flow" data-phase="${escapeHTML(initialPhase || RIDE_PHASES.OUTBOUND)}">
                    <div class="ride-flow__heading">
                        <span>FLUXO DA RIDE</span>
                        <small>${active ? "Cada etapa dispara uma notificação para membros On." : "Uma sequência simples, sem menus escondidos."}</small>
                    </div>

                    <div class="ride-flow__track">
                        <div class="ride-flow__line"></div>

                        <button type="button" class="ride-step ${step1Class}" disabled aria-current="${active && currentPhase === RIDE_PHASES.OUTBOUND ? "step" : "false"}">
                            <span class="ride-step__number">01</span>
                            <span class="ride-step__icon">${icon("navigation", { size: 17, decorative: true })}</span>
                            <span class="ride-step__copy">
                                <strong>Saindo para Ride</strong>
                                <small>Notificação enviada ao iniciar</small>
                            </span>
                        </button>

                        <button type="button" class="ride-step ${step2Class}" disabled aria-current="${currentPhase === RIDE_PHASES.ARRIVED ? "step" : "false"}">
                            <span class="ride-step__number">02</span>
                            <span class="ride-step__icon">${icon("flag", { size: 17, decorative: true })}</span>
                            <span class="ride-step__copy">
                                <strong>Cheguei ao destino</strong>
                                <small>Manter status Ride</small>
                            </span>
                        </button>

                        <button type="button" class="ride-step ${step3Class}" disabled aria-current="${currentPhase === RIDE_PHASES.RETURNING ? "step" : "false"}">
                            <span class="ride-step__number">03</span>
                            <span class="ride-step__icon">${icon("route", { size: 17, decorative: true })}</span>
                            <span class="ride-step__copy">
                                <strong>Voltando da Ride</strong>
                                <small>Retorno para casa</small>
                            </span>
                        </button>
                    </div>
                </section>

                <section class="ride-action-zone">
                    <button
                        type="button"
                        class="ride-main-action ${primaryAction.className}"
                        data-action="${primaryAction.action}"
                    >
                        <span class="ride-main-action__icon">
                            ${icon(primaryAction.icon, { size: 20, decorative: true })}
                        </span>
                        <span class="ride-main-action__copy">
                            <small>${primaryAction.eyebrow}</small>
                            <strong>${primaryAction.title}</strong>
                        </span>
                        ${icon("arrowRight", { size: 19, decorative: true })}
                    </button>

                    ${active ? `
                        <button
                            type="button"
                            class="ride-secondary-action"
                            data-action="force-finish"
                        >
                            ${icon("power", { size: 16, decorative: true })}
                            <span>Encerrar Ride agora</span>
                        </button>
                    ` : ""}

                    <p class="ride-action-zone__note">
                        ${icon("shield", { size: 13, decorative: true })}
                        ${primaryAction.note}
                    </p>
                </section>

            </div>
            </div>
        </div>
    `;

    const destinationInput = container.querySelector("#ride-destination-input");
    const startButton = container.querySelector('[data-action="start"]');

    if (destinationInput && !active) {
        // Não existe etapa de "validar" por Enter. O texto digitado
        // já é o destino da Ride; basta tocar no botão principal.
        const syncDestination = () => {
            const value = destinationInput.value.trim();
            destinationInput.dataset.destination = value;

            if (startButton) {
                // O botão permanece disponível para que a própria ação
                // informe caso o destino esteja vazio.
                startButton.disabled = false;
            }
        };

        destinationInput.addEventListener("input", syncDestination);
        destinationInput.addEventListener("change", syncDestination);
        destinationInput.addEventListener("blur", syncDestination);
        destinationInput.addEventListener("keyup", syncDestination);

        destinationInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                syncDestination();
            }
        });

        syncDestination();
    }

    container.tabIndex = -1;
    requestAnimationFrame(() => container.focus({ preventScroll: true }));

    bindEvents(container, {
        user,
        vehicle,
        ride,
        destination,
        initialPhase,
        modal: Boolean(data.modal)
    });

    if (active) {
        startTimer(container, startedAt);
    }

    return container;
}

function bindEvents(container, context) {
    const closeRide = () => {
        if (context.modal) {
            closeRideContainer(container);
            return;
        }

        stopTimer();
        router.back();
    };

    container.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            event.preventDefault();
            closeRide();
        }
    });

    container.querySelector('[data-action="back"]')?.addEventListener("click", closeRide);
    container.querySelector('[data-action="backdrop"]')?.addEventListener("click", closeRide);

    container.querySelector('[data-action="start"]')?.addEventListener("click", () => {
        handleStart(container, context);
    });

    container.querySelector('[data-action="advance"]')?.addEventListener("click", () => {
        handlePrimaryAdvance(container, context);
    });

    container.querySelector('[data-action="finish"]')?.addEventListener("click", () => {
        handleFinish(container, context, { reason: "normal" });
    });

    container.querySelector('[data-action="force-finish"]')?.addEventListener("click", () => {
        handleFinish(container, context, { reason: "manual" });
    });
}

async function handleStart(container, context) {
    const input = container.querySelector("#ride-destination-input");
    const destination = input?.value.trim() || "";

    if (!destination) {
        showToast({
            type: "warning",
            message: "Informe o destino antes de iniciar a Ride."
        });
        input?.focus();
        return;
    }

    if (!context.vehicle) {
        showToast({
            type: "warning",
            message: "Não foi possível identificar seu veículo atual."
        });
        return;
    }

    setBusy(container, true);

    try {
        const user = session.getUser?.() || context.user;

        if (user?.status !== USER_STATUS.ON) {
            throw new Error("Você precisa estar On para iniciar uma Ride.");
        }

        const ride = await createRide({
            destination,
            phase: RIDE_PHASES.OUTBOUND
        });

        const rideWithFlow = {
            ...ride,
            destination,
            phase: RIDE_PHASES.OUTBOUND
        };

        try {
            await updateStatus(USER_STATUS.RIDE);
        } catch (error) {
            console.warn("[RIDE] Ride criada, mas o status não foi atualizado:", error);
        }

        store.set("ride.active", true);
        store.set("ride.startedAt", rideWithFlow.startedAt || new Date().toISOString());
        store.set("ride.vehicle", rideWithFlow.vehicle || context.vehicle);
        store.set("ride.current", rideWithFlow);
        eventBus.emit("ride:updated", rideWithFlow);

        // Notificação é secundária: não bloqueia a confirmação visual da Ride.
        void notifyMembersOn({ user, destination, phase: RIDE_PHASES.OUTBOUND });

        showToast({
            type: "success",
            message: "Ride iniciada. Boa estrada."
        });

        if (context.modal) {
            await replaceRideModal(container, {
                activeRide: rideWithFlow,
                user: {
                    ...user,
                    status: USER_STATUS.RIDE
                },
                currentVehicle: rideWithFlow.vehicle || context.vehicle
            });
        } else {
            await router.navigate("ride", {
                activeRide: rideWithFlow,
                user: {
                    ...user,
                    status: USER_STATUS.RIDE
                },
                currentVehicle: rideWithFlow.vehicle || context.vehicle
            });
        }
    } catch (error) {
        console.error("[RIDE] Falha ao iniciar:", error);
        showToast({
            type: "error",
            message: error?.message || "Não foi possível iniciar a Ride."
        });
    } finally {
        setBusy(container, false);
    }
}

async function handlePrimaryAdvance(container, context) {
    if (!context.ride) {
        showToast({
            type: "warning",
            message: "Ride ativa não encontrada."
        });
        return;
    }

    const phase = phaseFromRide(context.ride);

    if (phase === RIDE_PHASES.OUTBOUND) {
        await handlePhase(container, context, RIDE_PHASES.ARRIVED);
        return;
    }

    if (phase === RIDE_PHASES.ARRIVED) {
        await handlePhase(container, context, RIDE_PHASES.RETURNING);
    }
}


async function handlePhase(container, context, phase) {
    if (!context.ride) {
        showToast({
            type: "warning",
            message: "Ride ativa não encontrada."
        });
        return;
    }

    if (
        phase !== RIDE_PHASES.ARRIVED &&
        phase !== RIDE_PHASES.RETURNING
    ) {
        return;
    }

    setBusy(container, true);

    try {
        const user = session.getUser?.() || context.user;
        const destination = context.destination || context.ride.destination || "";

        const persisted = await updateRideFlow(context.ride.id, {
            destination,
            phase
        });

        const nextRide = {
            ...context.ride,
            ...(persisted || {}),
            destination,
            phase
        };

        // O status do membro permanece RIDE em ambas as etapas.
        if (user?.status !== USER_STATUS.RIDE) {
            await updateStatus(USER_STATUS.RIDE);
        }

        store.set("ride.current", nextRide);
        eventBus.emit("ride:updated", nextRide);

        // Notificação é secundária: a mudança de etapa não espera o FCM.
        void notifyMembersOn({ user, destination, phase });

        showToast({
            type: "success",
            message: phase === RIDE_PHASES.ARRIVED
                ? "Chegada registrada e clube avisado."
                : "Retorno iniciado e clube avisado."
        });

        if (context.modal) {
            await replaceRideModal(container, {
                activeRide: nextRide,
                user: {
                    ...user,
                    status: USER_STATUS.RIDE
                },
                currentVehicle: context.vehicle
            });
        } else {
            await router.navigate("ride", {
                activeRide: nextRide,
                user: {
                    ...user,
                    status: USER_STATUS.RIDE
                },
                currentVehicle: context.vehicle
            });
        }
    } catch (error) {
        console.error("[RIDE] Falha ao atualizar etapa:", error);
        showToast({
            type: "error",
            message: error?.message || "Não foi possível atualizar a etapa."
        });
    } finally {
        setBusy(container, false);
    }
}

async function handleFinish(container, context, options = {}) {
    if (!context.ride?.id) {
        showToast({
            type: "error",
            message: "Não foi possível localizar a Ride ativa para encerrá-la."
        });
        return;
    }

    setBusy(container, true);

    try {
        const user = session.getUser?.() || context.user;

        await endRide(context.ride.id);
        await updateStatus(USER_STATUS.ON);

        // Notificação é secundária: encerramento visual acontece sem esperar o FCM.
        void notifyMembersOn({
            user: { ...user, status: USER_STATUS.ON },
            destination: context.destination || context.ride.destination || "",
            phase: RIDE_PHASES.FINISHED,
            reason: options.reason || "normal"
        });

        store.set("ride.active", false);
        store.set("ride.current", null);
        store.set("ride.startedAt", null);
        store.set("ride.vehicle", null);
        eventBus.emit("ride:updated", { ...context.ride, status: "finished", finishedAt: new Date().toISOString() });

        showToast({
            type: "success",
            message: options.reason === "manual"
                ? "Ride encerrada. O clube foi avisado."
                : "Ride encerrada. Você está On e o clube foi avisado."
        });

        stopTimer();

        if (context.modal) {
            closeRideContainer(container);
        } else {
            await router.navigate("ride", {
                user: {
                    ...user,
                    status: USER_STATUS.ON
                },
                currentVehicle: context.vehicle
            });
        }
    } catch (error) {
        console.error("[RIDE] Falha ao encerrar:", error);
        showToast({
            type: "error",
            message: error?.message || "Não foi possível encerrar a Ride."
        });
    } finally {
        setBusy(container, false);
    }
}

function setBusy(container, busy) {
    container.classList.toggle("is-busy", busy);

    const back = container.querySelector('[data-action="back"]');
    if (back) {
        back.disabled = busy;
    }

    container.querySelectorAll('[data-action="start"], [data-action="advance"], [data-action="finish"], [data-action="force-finish"]').forEach(button => {
        button.disabled = busy;
    });
}

export function destroyRide() {
    stopTimer();
}
