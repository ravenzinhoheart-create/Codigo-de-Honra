import { router } from "../../core/router.js";
import { getCurrentUser, logout } from "../../services/auth.js";
import { updateStatus } from "../../services/users.js";
import { getPosts } from "../../services/posts.js";
import { createAvatar } from "../../components/avatar.js";
import { createStatusRing } from "../../components/status-ring.js";
import { openRideModal } from "../ride/ride.js";
import { events } from "../../core/events.js";
import { openGarageSheet } from "./garage.js";

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function vehicleLabel(vehicle) {
    if (!vehicle) return "A pé";

    if (typeof vehicle === "string") return vehicle;

    if (vehicle.type === "motorcycle") {
        return vehicle.model || "Moto";
    }

    if (vehicle.type === "car") {
        return vehicle.model || "Carro";
    }

    return vehicle.model || "A pé";
}

function getPostImage(post) {
    if (Array.isArray(post.media) && post.media.length) {
        const media = post.media[0];
        return typeof media === "string" ? media : media.url;
    }

    if (Array.isArray(post.images) && post.images.length) {
        return post.images[0];
    }

    return post.image || null;
}

function renderPost(post) {
    const image = getPostImage(post);

    return `
        <button
            type="button"
            class="profile-post"
            data-post-id="${escapeHTML(post.id)}"
        >
            ${image
                ? `
                    <img
                        src="${escapeHTML(image)}"
                        alt=""
                        loading="lazy"
                    >
                `
                : `
                    <span class="profile-post__text">${escapeHTML((post.caption || "Sem texto").trim().slice(0, 92))}</span>
                `}
        </button>
    `;
}

function statusLabel(status) {
    if (status === "on") return "ON";
    if (status === "ride") return "RIDE";
    if (status === "sos") return "SOS";
    return "OFF";
}

function statusClass(status) {
    if (status === "on") return "profile-status--on";
    if (status === "ride") return "profile-status--ride";
    if (status === "sos") return "profile-status--sos";
    return "profile-status--off";
}

function isMenuOpen(menu) {
    return menu?.classList.contains("profile-menu--open");
}

export async function renderProfile(data = {}) {
    const root = document.querySelector("#app-view");
    if (!root) return;

    // Evita listeners duplicados quando a view é renderizada novamente.
    root.__profileCleanup?.();
    root.__profileCleanup = null;

    /*
     * O perfil é sempre do membro autenticado.
     * Assim como o Clube, a fonte de verdade é o serviço
     * de usuários/sessão, e não dados estáticos enviados pela rota.
     */
    const authenticatedUser = await getCurrentUser();

    if (!authenticatedUser) {
        await router.navigate("login");
        return;
    }

    const user = authenticatedUser;

    /*
     * As publicações também pertencem ao usuário autenticado.
     * Não usamos posts enviados pela rota, porque a rota /profile
     * não representa outro membro: ela sempre representa a sessão atual.
     */
    let posts = [];

    try {
        const allPosts = await getPosts();

        posts = allPosts.filter(
            post =>
                String(post.author?.id || "") ===
                String(user.id || "")
        );
    } catch (error) {
        console.error(
            "[PROFILE] Falha ao carregar publicações do usuário autenticado:",
            error
        );
    }

    let status = user.status || "off";

    const renderIdentity = () => {
        const avatar = createAvatar({
            src: user.avatar,
            alt: user.username || "Perfil",
            status,
            size: "xl"
        });

        const statusRing = createStatusRing(status);

        const identity = root.querySelector(".profile-card__identity");
        if (!identity) return;

        identity.innerHTML = `
            <div class="profile-card__avatar">
                ${avatar.outerHTML}
            </div>

            <div class="profile-card__info">
                <h1>${escapeHTML(user.username || "Usuário")}</h1>

                <div class="profile-card__status ${statusClass(status)}">
                    ${statusRing.outerHTML}
                    <span>${statusLabel(status)}</span>
                </div>
            </div>
        `;
    };

    const syncLiveStatus = payload => {
        const nextUser = payload?.user || payload;
        const nextStatus = nextUser?.status;

        if (!nextStatus || !root.querySelector(".profile-view")) {
            return;
        }

        status = nextStatus;
        user.status = nextStatus;
        renderIdentity();

        const rideAction = root.querySelector('[data-profile-action="ride"] span:last-child');
        if (rideAction) {
            rideAction.textContent = nextStatus === "ride"
                ? "Ride em andamento"
                : "Iniciar Ride";
        }
    };

    const unsubscribeSession = events.on("session:changed", syncLiveStatus);
    const unsubscribeUser = events.on("user:updated", syncLiveStatus);

    root.__profileCleanup = () => {
        unsubscribeSession?.();
        unsubscribeUser?.();
        root.__profileCleanup = null;
    };

    root.innerHTML = `
        <section class="profile-view">

            <section class="profile-card">

                <button
                    type="button"
                    class="profile-card__menu-button"
                    data-action="menu"
                    aria-label="Abrir menu do perfil"
                    aria-expanded="false"
                >
                    <span data-icon="menu"></span>
                </button>

                <div class="profile-card__identity"></div>

                <div class="profile-card__vehicle">
                    <span
                        class="profile-card__vehicle-icon"
                        data-icon="${
                            user.currentVehicle?.type === "car"
                                ? "car"
                                : user.currentVehicle?.type === "motorcycle"
                                    ? "motorcycle"
                                    : "walk"
                        }"
                    ></span>

                    <div>
                        <span>Veículo atual</span>
                        <strong>
                            ${escapeHTML(vehicleLabel(user.currentVehicle))}
                        </strong>
                    </div>
                </div>

                <div
                    id="profile-menu"
                    class="profile-menu"
                    aria-hidden="true"
                >
                    <button type="button" data-profile-action="toggle-status">
                        <span data-icon="power"></span>
                        <span>ON/OFF</span>
                    </button>

                    <button type="button" data-profile-action="settings">
                        <span data-icon="settings"></span>
                        <span>Configurações</span>
                    </button>

                    <button type="button" data-profile-action="vehicles">
                        <span data-icon="vehicle"></span>
                        <span>Minha Garagem</span>
                    </button>

                    <button type="button" data-profile-action="ride">
                        <span data-icon="ride"></span>
                        <span>${user.status === "ride" ? "Ride em andamento" : "Iniciar Ride"}</span>
                    </button>

                    <button type="button" data-profile-action="logout">
                        <span data-icon="logout"></span>
                        <span>Logout</span>
                    </button>
                </div>

            </section>

            <section class="profile-posts">
                <div class="profile-posts__header">
                    <h2>Publicações</h2>
                    <span>${posts.length}</span>
                </div>

                ${posts.length
                    ? `
                        <div class="profile-posts__grid">
                            ${posts.map(renderPost).join("")}
                        </div>
                    `
                    : `
                        <div class="empty-state empty-state--compact">
                            <span
                                class="empty-state__icon"
                                data-icon="post"
                            ></span>

                            <strong>Nenhuma publicação</strong>
                            <span>Suas publicações aparecerão aqui.</span>
                        </div>
                    `}
            </section>

        </section>
    `;

    renderIdentity();

    const menu = root.querySelector("#profile-menu");
    const menuButton = root.querySelector("[data-action='menu']");

    const closeMenu = () => {
        menu?.classList.remove("profile-menu--open");
        menu?.setAttribute("aria-hidden", "true");
        menuButton?.setAttribute("aria-expanded", "false");
    };

    const toggleMenu = () => {
        const open = !isMenuOpen(menu);

        menu?.classList.toggle("profile-menu--open", open);
        menu?.setAttribute("aria-hidden", open ? "false" : "true");
        menuButton?.setAttribute("aria-expanded", open ? "true" : "false");
    };

    menuButton?.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleMenu();
    });

    root.querySelectorAll("[data-profile-action]").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.stopPropagation();

            const action = button.dataset.profileAction;

            if (action === "toggle-status") {
                // ON/OFF alterna apenas entre os estados básicos.
                // Ride/SOS permanecem sob controle das respectivas features.
                const nextStatus =
                    status === "on"
                        ? "off"
                        : "on";

                try {
                    const updatedUser = await updateStatus(nextStatus);

                    status = updatedUser.status || nextStatus;
                    user.status = status;
                    user.currentVehicle = updatedUser.currentVehicle || user.currentVehicle;
                    user.avatar = updatedUser.avatar ?? user.avatar;

                    renderIdentity();
                    closeMenu();
                } catch (error) {
                    console.error("[PROFILE] Falha ao atualizar status:", error);
                }

                return;
            }

            closeMenu();

            if (action === "settings") {
                await router.navigate("settings");
                return;
            }

            if (action === "vehicles") {
                await openGarageSheet();
                return;
            }

            if (action === "ride") {
                openRideModal();
                return;
            }

            if (action === "logout") { console.info("[PROFILE] CLIQUE NO LOGOUT");
                try {
                    await logout();
                } catch (error) {
                    console.error("[PROFILE] Falha ao encerrar sessão:", error);
                    return;
                }

                await router.navigate("login", {
                    replace: true
                });
            }
        });
    });

    root.querySelectorAll(".profile-post[data-post-id]").forEach((post) => {
        post.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const postId = post.dataset.postId;
            if (!postId) return;

            await router.navigate("home", {
                focusPostId: postId
            });
        });
    });
}

export function initializeProfile(data = {}) {
    renderProfile(data);
}


