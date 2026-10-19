 // =========================================================
// MOTOCLUBE
// View: Clube
// =========================================================

import { router } from "../../core/router.js";
import { createAvatar } from "../../components/avatar.js";
import { getMembers } from "../../services/users.js";
import { USER_STATUS } from "../../core/constants.js";
import { getActiveRides } from "../../services/rides.js";
import { getActiveSOSList } from "../../services/sos.js";
import { events as eventBus } from "../../core/events.js";

let currentMembers = [];
let searchTerm = "";
let statusFilter = "all";

let activeRidesByUser = new Map();
let activeSOSByUser = new Map();

let rideTimer = null;
let clubLiveBound = false;

const STATUS_LABELS = Object.freeze({
    all: "Todos",
    [USER_STATUS.ON]: "ON",
    [USER_STATUS.OFF]: "OFF",
    [USER_STATUS.RIDE]: "RIDE",
    [USER_STATUS.SOS]: "SOS"
});

export async function renderClub(data = {}) {
    const appView = document.getElementById("app-view");

    if (!appView) return;

    const supplied = Array.isArray(data)
        ? data
        : Array.isArray(data.members)
            ? data.members
            : null;

    searchTerm = "";
    statusFilter = "all";

    currentMembers = supplied || [];

    activeRidesByUser = new Map();
    activeSOSByUser = new Map();

    // A view shell is painted immediately.
    render();

    bindClubLiveRideUpdates();

    const token = Symbol("club-load");

    renderClub._loadToken = token;

    if (supplied) return;

    const [
        membersResult,
        ridesResult,
        sosResult
    ] = await Promise.allSettled([
        getMembers(),
        getActiveRides(),
        getActiveSOSList()
    ]);

    if (renderClub._loadToken !== token) return;

    if (membersResult.status === "fulfilled") {
        currentMembers =
            membersResult.value || [];
    } else {
        console.error(
            "[CLUB] Falha ao carregar membros:",
            membersResult.reason
        );
    }

    if (ridesResult.status === "fulfilled") {
        activeRidesByUser =
            new Map(
                (ridesResult.value || [])
                    .map(ride => [
                        String(ride.userId),
                        ride
                    ])
            );
    } else {
        console.warn(
            "[CLUB] Falha ao carregar Rides ativas:",
            ridesResult.reason
        );
    }

    if (sosResult.status === "fulfilled") {
        activeSOSByUser =
            new Map(
                (sosResult.value || [])
                    .map(sos => [
                        String(sos.userId),
                        sos
                    ])
            );
    } else {
        console.warn(
            "[CLUB] Falha ao carregar SOS ativos:",
            sosResult.reason
        );
    }

    if (
        document.getElementById("app-view") === appView &&
        appView.querySelector(".club-view")
    ) {
        render();
    }
}

function render() {
    const appView =
        document.getElementById("app-view");

    if (!appView) return;

    const members =
        getFilteredMembers();

    appView.innerHTML = `
        <section
            class="club-view"
            aria-label="Clube"
        >
            <div class="club-toolbar">
                <div class="club-search">
                    <span
                        class="club-search__icon"
                        aria-hidden="true"
                    >
                        <span data-icon="search"></span>
                    </span>

                    <input
                        id="club-search-input"
                        type="search"
                        inputmode="search"
                        autocomplete="off"
                        placeholder="Buscar membro"
                        aria-label="Buscar membro"
                        value="${escapeAttribute(searchTerm)}"
                    >

                    <button
                        type="button"
                        class="club-search__clear"
                        data-action="clear-search"
                        aria-label="Limpar busca"
                        ${searchTerm ? "" : "hidden"}
                    >
                        <span data-icon="close"></span>
                    </button>
                </div>

                <button
                    type="button"
                    class="club-filter-button ${statusFilter !== "all" ? "is-active" : ""}"
                    data-action="toggle-filter"
                    aria-expanded="false"
                    aria-haspopup="true"
                    aria-label="Filtrar membros por status"
                >
                    <span data-icon="filter"></span>

                    <span class="club-filter-button__label">
                        ${escapeHtml(
                            STATUS_LABELS[
                                statusFilter
                            ]
                        )}
                    </span>
                </button>

                <div
                    class="club-filter-menu"
                    data-filter-menu
                    hidden
                >
                    ${
                        Object.entries(
                            STATUS_LABELS
                        )
                            .map(
                                ([
                                    value,
                                    label
                                ]) => `
                                    <button
                                        type="button"
                                        class="club-filter-option ${
                                            statusFilter === value
                                                ? "is-selected"
                                                : ""
                                        }"
                                        data-status-filter="${value}"
                                    >
                                        <span
                                            class="club-filter-option__dot club-filter-option__dot--${value}"
                                        ></span>

                                        <span>
                                            ${escapeHtml(
                                                label
                                            )}
                                        </span>

                                        ${
                                            statusFilter === value
                                                ? '<span class="club-filter-option__check" data-icon="check"></span>'
                                                : ""
                                        }
                                    </button>
                                `
                            )
                            .join("")
                    }
                </div>
            </div>

            <div
                class="club-results"
                aria-live="polite"
            >
                <span>${members.length}</span>
                <span>
                    ${
                        members.length === 1
                            ? "membro"
                            : "membros"
                    }
                </span>
            </div>

            <main
                class="club-member-list"
                role="list"
            >
                ${
                    members.length
                        ? members
                            .map(renderMember)
                            .join("")
                        : renderEmptyState()
                }
            </main>
        </section>
    `;

    initializeClub();
}

function renderMember(member) {
    const username =
        member.username || "Membro";

    const status =
        normalizeStatus(
            member.status
        );

    const vehicle =
        member.currentVehicle ||
        member.vehicle ||
        null;

    const activeRide =
        activeRidesByUser.get(
            String(member.id)
        );

    const activeSOS =
        activeSOSByUser.get(
            String(member.id)
        );

    /*
     * SOS tem prioridade visual sobre RIDE.
     */
    let activityMarkup = "";

    if (activeSOS) {
        activityMarkup =
            renderSOSActivity(
                activeSOS,
                member.id
            );
    } else if (activeRide) {
        activityMarkup =
            renderRideActivity(
                activeRide,
                member.id
            );
    }

    return `
        <button
            type="button"
            class="club-member"
            data-action="open-member"
            data-user-id="${escapeAttribute(
                member.id || ""
            )}"
            role="listitem"
        >
            <span
                class="club-member__avatar"
                data-avatar
            ></span>

            <span class="club-member__body">

                <strong
                    class="club-member__username"
                >
                    ${escapeHtml(username)}
                </strong>

                <span
                    class="club-member__vehicle"
                >
                    ${renderVehicle(vehicle)}
                </span>

                ${activityMarkup}

            </span>

            <span
                class="club-member__arrow"
                aria-hidden="true"
            >
                <span data-icon="arrow-right"></span>
            </span>
        </button>
    `;
}

function renderRideActivity(
    ride,
    memberId
) {
    return `
        <span
            class="club-member__ride"
        >
            <span data-icon="route"></span>

            <b>RIDE</b>

            <span
                data-ride-elapsed-user="${escapeAttribute(
                    memberId
                )}"
            >
                ${formatRideElapsed(
                    ride.startedAt
                )}
            </span>

            ${
                ride.destination
                    ? `
                        <em>
                            ${escapeHtml(
                                ride.destination
                            )}
                        </em>
                    `
                    : ""
            }
        </span>
    `;
}

function renderSOSActivity(
    sos,
    memberId
) {
    const typeLabel =
        sos.typeLabel ||
        "Outro";

    return `
        <span
            class="club-member__sos"
        >
            <span
                data-icon="${
                    escapeAttribute(
                        sos.typeIcon ||
                        "alert"
                    )
                }"
            ></span>

            <b>SOS</b>

            <span class="club-member__sos-type">
                ${escapeHtml(
                    typeLabel
                )}
            </span>

            <span
                data-sos-elapsed-user="${escapeAttribute(
                    memberId
                )}"
            >
                ${formatSOSElapsed(
                    sos.createdAt
                )}
            </span>
        </span>
    `;
}

function initializeClub() {
    const view =
        document.querySelector(
            ".club-view"
        );

    if (!view) return;

    view
        .querySelectorAll(
            "[data-avatar]"
        )
        .forEach(container => {
            const memberId =
                container
                    .closest(
                        "[data-user-id]"
                    )
                    ?.dataset.userId;

            const member =
                currentMembers.find(
                    item =>
                        String(item.id) ===
                        String(memberId)
                );

            if (!member) return;

            container.appendChild(
                createAvatar({
                    src:
                        member.avatar ||
                        member.avatarUrl ||
                        "",

                    username:
                        member.username ||
                        "Membro",

                    status:
                        normalizeStatus(
                            member.status
                        ),

                    size: "medium"
                })
            );
        });

    const input =
        view.querySelector(
            "#club-search-input"
        );

    input?.addEventListener(
        "input",
        event => {
            searchTerm =
                event.target.value;

            render();

            requestAnimationFrame(
                () => {
                    const nextInput =
                        document.querySelector(
                            "#club-search-input"
                        );

                    nextInput?.focus();

                    nextInput?.setSelectionRange(
                        searchTerm.length,
                        searchTerm.length
                    );
                }
            );
        }
    );

    view.addEventListener(
        "click",
        handleClubClick
    );
}

function handleClubClick(event) {
    const clear =
        event.target.closest(
            "[data-action='clear-search']"
        );

    if (clear) {
        searchTerm = "";
        render();
        return;
    }

    const filterButton =
        event.target.closest(
            "[data-action='toggle-filter']"
        );

    if (filterButton) {
        const menu =
            document.querySelector(
                "[data-filter-menu]"
            );

        if (!menu) return;

        const open =
            !menu.hidden;

        menu.hidden = open;

        filterButton.setAttribute(
            "aria-expanded",
            String(!open)
        );

        return;
    }

    const filterOption =
        event.target.closest(
            "[data-status-filter]"
        );

    if (filterOption) {
        statusFilter =
            filterOption.dataset
                .statusFilter ||
            "all";

        render();
        return;
    }

    const memberButton =
        event.target.closest(
            "[data-action='open-member']"
        );

    if (memberButton) {
        const userId =
            memberButton.dataset.userId;

        if (userId) {
            router.navigate(
                "member-profile",
                {
                    userId
                }
            );
        }
    }
}

/* =========================================================
   CRONÔMETROS
========================================================= */

function formatRideElapsed(
    startedAt
) {
    return formatElapsed(
        startedAt
    );
}

function formatSOSElapsed(
    createdAt
) {
    return formatElapsed(
        createdAt
    );
}

function formatElapsed(
    startedAt
) {
    const start =
        new Date(
            startedAt || 0
        ).getTime();

    const seconds =
        Number.isFinite(start)
            ? Math.max(
                0,
                Math.floor(
                    (
                        Date.now() -
                        start
                    ) / 1000
                )
            )
            : 0;

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        seconds % 60;

    return [
        String(hours)
            .padStart(2, "0"),

        String(minutes)
            .padStart(2, "0"),

        String(secs)
            .padStart(2, "0")
    ].join(":");
}

function refreshActivityClocks() {
    document
        .querySelectorAll(
            "[data-ride-elapsed-user]"
        )
        .forEach(element => {
            const ride =
                activeRidesByUser.get(
                    String(
                        element.dataset
                            .rideElapsedUser
                    )
                );

            if (ride) {
                element.textContent =
                    formatRideElapsed(
                        ride.startedAt
                    );
            }
        });

    document
        .querySelectorAll(
            "[data-sos-elapsed-user]"
        )
        .forEach(element => {
            const sos =
                activeSOSByUser.get(
                    String(
                        element.dataset
                            .sosElapsedUser
                    )
                );

            if (sos) {
                element.textContent =
                    formatSOSElapsed(
                        sos.createdAt
                    );
            }
        });
}

function bindClubLiveRideUpdates() {
    if (!rideTimer) {
        rideTimer =
            window.setInterval(
                refreshActivityClocks,
                1000
            );
    }

    if (clubLiveBound) return;

    clubLiveBound = true;

    eventBus.on(
        "ride:updated",
        async () => {
            try {
                const rides =
                    await getActiveRides();

                activeRidesByUser =
                    new Map(
                        (rides || [])
                            .map(ride => [
                                String(
                                    ride.userId
                                ),
                                ride
                            ])
                    );

                if (
                    document.querySelector(
                        ".club-view"
                    )
                ) {
                    render();
                }
            } catch {}
        }
    );

    eventBus.on(
        "sos:created",
        async () => {
            await refreshClubSOS();
        }
    );

    eventBus.on(
        "sos:updated",
        async () => {
            await refreshClubSOS();
        }
    );

    eventBus.on(
        "sos:resolved",
        async () => {
            await refreshClubSOS();
        }
    );

    eventBus.on(
        "user:updated",
        async () => {
            if (
                !document.querySelector(
                    ".club-view"
                )
            ) {
                return;
            }

            try {
                currentMembers =
                    await getMembers();

                render();
            } catch {}
        }
    );
}

async function refreshClubSOS() {
    if (
        !document.querySelector(
            ".club-view"
        )
    ) {
        return;
    }

    try {
        const sos =
            await getActiveSOSList();

        activeSOSByUser =
            new Map(
                (sos || [])
                    .map(item => [
                        String(
                            item.userId
                        ),
                        item
                    ])
            );

        render();
    } catch (error) {
        console.warn(
            "[CLUB] Falha ao atualizar SOS:",
            error
        );
    }
}

/* =========================================================
   FILTROS
========================================================= */

function getFilteredMembers() {
    const query =
        searchTerm
            .trim()
            .toLowerCase();

    return currentMembers.filter(
        member => {
            const status =
                normalizeStatus(
                    member.status
                );

            if (
                statusFilter !== "all" &&
                status !== statusFilter
            ) {
                return false;
            }

            if (!query) {
                return true;
            }

            const vehicle =
                member.currentVehicle ||
                member.vehicle ||
                {};

            const haystack = [
                member.username,
                vehicle.brand,
                vehicle.model,
                getVehicleTypeLabel(
                    vehicle.type
                )
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(
                query
            );
        }
    );
}

/* =========================================================
   EMPTY / VEÍCULO / STATUS
========================================================= */

function renderEmptyState() {
    const filtered =
        searchTerm ||
        statusFilter !== "all";

    return `
        <div class="club-empty">
            <div class="club-empty__icon">
                <span data-icon="club"></span>
            </div>

            <h2>
                ${
                    filtered
                        ? "Nenhum membro encontrado"
                        : "Nenhum membro cadastrado"
                }
            </h2>

            <p>
                ${
                    filtered
                        ? "Tente alterar a busca ou o filtro de status."
                        : "Os membros do Motoclube aparecerão aqui."
                }
            </p>
        </div>
    `;
}

function renderVehicle(vehicle) {
    if (!vehicle) {
        return "A pé";
    }

    if (
        [
            "on_foot",
            "a-pe",
            "walking"
        ].includes(
            String(
                vehicle.type || ""
            ).toLowerCase()
        )
    ) {
        return "A pé";
    }

    const type =
        getVehicleTypeLabel(
            vehicle.type
        );

    const name =
        `${vehicle.brand || ""} ${vehicle.model || ""}`
            .trim();

    return name
        ? `${type} • ${name}`
        : type;
}

function normalizeStatus(status) {
    const value =
        String(
            status || ""
        ).toLowerCase();

    if (
        value === USER_STATUS.ON ||
        value === "online"
    ) {
        return USER_STATUS.ON;
    }

    if (
        value === USER_STATUS.RIDE ||
        value === "riding"
    ) {
        return USER_STATUS.RIDE;
    }

    if (
        value === USER_STATUS.SOS
    ) {
        return USER_STATUS.SOS;
    }

    return USER_STATUS.OFF;
}

function getVehicleTypeLabel(type) {
    switch (
        String(
            type || ""
        ).toLowerCase()
    ) {
        case "motorcycle":
        case "moto":
            return "Moto";

        case "car":
        case "carro":
            return "Carro";

        case "on_foot":
        case "a-pe":
        case "walking":
            return "A pé";

        default:
            return "Veículo";
    }
}

/* =========================================================
   API PÚBLICA
========================================================= */

export function updateClub(
    members = []
) {
    currentMembers =
        Array.isArray(members)
            ? members
            : [];

    render();
}

/* =========================================================
   ESCAPES
========================================================= */

function escapeHtml(value) {
    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}

function escapeAttribute(value) {
    return escapeHtml(value);
}