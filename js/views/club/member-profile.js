/**
 * Motoclube — Perfil público de membro
 * Visual alinhado ao perfil do próprio usuário.
 */
import { router } from "../../core/router.js";
import { getUser } from "../../services/users.js";
import { getPosts } from "../../services/posts.js";
import { createAvatar } from "../../components/avatar.js";
import { createStatusRing } from "../../components/status-ring.js";
import { hydrateIcons, icon } from "../../icons/icons.js";
import { openBottomSheet } from "../../components/bottom-sheet.js";

function escapeHTML(value = "") {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function normalizeStatus(status) {
    const value = String(status || "off").toLowerCase();
    return ["on", "off", "ride", "sos"].includes(value) ? value : "off";
}

function statusLabel(status) {
    return ({ on: "ON", off: "OFF", ride: "RIDE", sos: "SOS" })[status] || "OFF";
}

function statusClass(status) {
    return `profile-status--${status}`;
}

function vehicleLabel(vehicle) {
    if (!vehicle || vehicle.type === "on_foot") return "A pé";
    return vehicle.model || (vehicle.type === "motorcycle" ? "Motocicleta" : "Carro");
}

function vehicleIcon(vehicle) {
    if (vehicle?.type === "motorcycle") return "motorcycle";
    if (vehicle?.type === "car") return "car";
    return "walk";
}

function renderPost(post, index) {
    const media = Array.isArray(post.media) ? post.media[0] : null;
    const src = typeof media === "string" ? media : media?.url || media?.src || null;
    const mediaType = typeof media === "object" ? media.type : "image";
    const preview = String(post.caption || "").trim();
    return `
        <button type="button" class="profile-post member-profile-post" data-post-id="${escapeHTML(post.id || index)}" aria-label="Abrir publicação">
            ${src ? (mediaType === "video" ? `<video class="member-profile-post__media" src="${escapeHTML(src)}" muted playsinline preload="metadata"></video>` : `<img class="member-profile-post__media" src="${escapeHTML(src)}" alt="" loading="lazy">`) : `<span class="profile-post__text">${escapeHTML(preview || "Sem texto").slice(0, 120)}</span>`}
            ${Array.isArray(post.media) && post.media.length > 1 ? `<span class="member-profile-post__multiple"><span data-icon="layers"></span></span>` : ""}
        </button>
    `;
}

function renderGarageSheet(member) {
    const vehicles = Array.isArray(member.vehicles) ? member.vehicles : [];
    const currentId = member.currentVehicle?.id || null;
    const cards = vehicles.filter(vehicle => vehicle && vehicle.type !== "on_foot").map(vehicle => {
        const current = vehicle.id === currentId;
        return `
            <article class="member-garage-card ${current ? "is-current" : ""}">
                <span class="member-garage-card__icon"><span data-icon="${vehicleIcon(vehicle)}"></span></span>
                <div>
                    <strong>${escapeHTML(vehicle.model || "Veículo")}</strong>
                    <small>${escapeHTML(vehicle.brand || "Marca não informada") + (vehicle.year ? ` • ${escapeHTML(vehicle.year)}` : "")}</small>
                </div>
                ${current ? `<span class="member-garage-card__current">Atual</span>` : ""}
            </article>
        `;
    }).join("");

    const content = document.createElement("section");
    content.className = "member-garage-sheet";
    content.innerHTML = `
        <div class="member-garage-sheet__intro">
            <span class="member-garage-sheet__mark">${icon("motorcycle", { size: 19, decorative: true })}</span>
            <div>
                <strong>Garagem de ${escapeHTML(member.username || "Membro")}</strong>
                <span>${vehicles.length} ${vehicles.length === 1 ? "veículo cadastrado" : "veículos cadastrados"}</span>
            </div>
        </div>
        <div class="member-garage-grid">${cards}</div>
    `;
    hydrateIcons(content);

    return openBottomSheet({
        title: "Garagem",
        className: "bottom-sheet--member-garage",
        content
    });
}

export async function renderMemberProfile(data = {}) {
    const appView = document.getElementById("app-view");
    if (!appView) return;

    const userId = data.userId || data.id || data.memberId;
    if (!userId) { renderNotFound(appView); return; }

    appView.innerHTML = `
        <section class="profile-view member-profile-view is-loading-view" aria-busy="true">
            <header class="member-profile-view__toolbar">
                <button type="button" class="icon-button" data-action="back" aria-label="Voltar"><span data-icon="arrow-left"></span></button>
                <span>PERFIL DO MEMBRO</span>
            </header>
            <section class="profile-card member-profile-card">
                <div class="profile-card__identity">
                    <div class="profile-card__avatar"><div class="avatar avatar--xl is-loading" aria-hidden="true"></div></div>
                    <div class="profile-card__info"><div class="skeleton-line skeleton-line--title"></div><div class="skeleton-line skeleton-line--small"></div></div>
                </div>
            </section>
            <section class="profile-posts member-profile-posts"><div class="profile-posts__header"><h2>Publicações</h2></div></section>
        </section>
    `;
    hydrateIcons(appView);
    appView.querySelector("[data-action='back']")?.addEventListener("click", () => router.back());

    let member = null;
    let posts = [];
    try {
        [member, posts] = await Promise.all([getUser(userId), getPosts()]);
        posts = (posts || []).filter(post => String(post.author?.id || post.userId || "") === String(userId));
    } catch (error) {
        console.error("[MEMBER PROFILE] Falha ao carregar perfil:", error);
    }

    if (document.getElementById("app-view") !== appView || !appView.querySelector(".member-profile-view")) return;
    if (!member) { renderNotFound(appView); return; }

    const status = normalizeStatus(member.status);
    const vehicle = member.currentVehicle || member.vehicle || { type: "on_foot" };
    const avatar = createAvatar({ src: member.avatar || member.avatarUrl || "", username: member.username || "Membro", status, size: "xl" });
    const ring = createStatusRing(status);

    appView.innerHTML = `
        <section class="profile-view member-profile-view">
            <header class="member-profile-view__toolbar">
                <button type="button" class="icon-button" data-action="back" aria-label="Voltar"><span data-icon="arrow-left"></span></button>
                <span>PERFIL DO MEMBRO</span>
            </header>
            <section class="profile-card member-profile-card">
                <button type="button" class="profile-card__menu-button" data-action="member-menu" aria-label="Abrir menu do perfil"><span data-icon="more"></span></button>
                <div class="profile-card__identity"><div class="profile-card__avatar">${avatar.outerHTML}</div><div class="profile-card__info"><h1>${escapeHTML(member.username || "Membro")}</h1><div class="profile-card__status ${statusClass(status)}">${ring.outerHTML}<span>${statusLabel(status)}</span></div></div></div>
                <div class="profile-card__vehicle"><span class="profile-card__vehicle-icon" data-icon="${vehicleIcon(vehicle)}"></span><div><span>Veículo atual</span><strong>${escapeHTML(vehicleLabel(vehicle))}</strong></div></div>
                <div class="profile-menu member-profile-menu" id="member-profile-menu" aria-hidden="true"><button type="button" data-member-action="garage"><span data-icon="motorcycle"></span><span>Ver garagem</span></button></div>
            </section>
            <section class="profile-posts member-profile-posts">
                <div class="profile-posts__header"><h2>Publicações</h2><span>${posts.length}</span></div>
                ${posts.length ? `<div class="profile-posts__grid member-profile-posts__grid">${posts.map(renderPost).join("")}</div>` : `<div class="empty-state empty-state--compact"><span class="empty-state__icon" data-icon="post"></span><strong>Nenhuma publicação</strong><span>Este membro ainda não publicou nada.</span></div>`}
            </section>
        </section>
    `;

    hydrateIcons(appView);
    appView.querySelector("[data-action='back']")?.addEventListener("click", () => router.back());
    const memberMenu = appView.querySelector("#member-profile-menu");
    const memberMenuButton = appView.querySelector("[data-action='member-menu']");
    const closeMemberMenu = () => { memberMenu?.classList.remove("profile-menu--open"); memberMenu?.setAttribute("aria-hidden", "true"); memberMenuButton?.setAttribute("aria-expanded", "false"); };
    memberMenuButton?.addEventListener("click", event => { event.stopPropagation(); const open = !memberMenu?.classList.contains("profile-menu--open"); memberMenu?.classList.toggle("profile-menu--open", open); memberMenu?.setAttribute("aria-hidden", open ? "false" : "true"); memberMenuButton?.setAttribute("aria-expanded", open ? "true" : "false"); });
    appView.querySelector("[data-member-action='garage']")?.addEventListener("click", () => { closeMemberMenu(); renderGarageSheet(member); });
    appView.querySelectorAll("[data-post-id]").forEach(button => button.addEventListener("click", async () => { const postId = button.dataset.postId; if (postId) await router.navigate("home", { focusPostId: postId }); }));
}

function renderNotFound(appView) {
    appView.innerHTML = `
        <section class="member-profile-not-found">
            <div class="member-profile-not-found__icon"><span data-icon="profile"></span></div>
            <h1>Membro não encontrado</h1>
            <p>Não foi possível localizar este perfil.</p>
            <button type="button" class="button button--primary" data-action="back">Voltar</button>
        </section>
    `;
    hydrateIcons(appView);
    appView.querySelector("[data-action='back']")?.addEventListener("click", () => router.back());
}
