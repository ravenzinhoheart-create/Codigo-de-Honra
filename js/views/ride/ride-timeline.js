// =========================================================
// MOTOCLUBE — Ride Timeline
// Linha do tempo exclusiva de uma Ride.
// =========================================================

import { openBottomSheet } from "../../components/bottom-sheet.js";
import { createAvatar } from "../../components/avatar.js";
import { icon, hydrateIcons } from "../../icons/icons.js";
import { getPosts } from "../../services/posts.js";
import { router } from "../../core/router.js";

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    const date = new Date(value || 0);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function formatDuration(seconds = 0) {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;
    if (hours) return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
    return `${String(minutes).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

function ridePhaseLabel(phase) {
    return ({
        outbound: "Saindo para Ride",
        arrived: "Cheguei ao destino",
        returning: "Voltando da Ride",
        finished: "Ride encerrada"
    })[phase] || "Ride";
}

function renderPostItem(post) {
    const author = post.author || {};
    const avatar = createAvatar({
        src: author.avatar || author.avatarUrl || "",
        username: author.username || "Membro",
        status: author.status || "off",
        size: "small"
    });
    const activity = post.activity;

    let body = "";
    let glyph = "post";
    let title = author.username || "Membro";

    if (activity?.sosId) {
        glyph = activity.sosTypeIcon || "alert";
        title = `SOS · ${activity.sosTypeLabel || "Outro"}`;
        body = `${activity.status === "active" ? "Chamado ativo" : "Chamado encerrado"} · ${formatDuration(activity.durationSeconds || 0)}`;
    } else if (activity?.rideId) {
        glyph = activity.phase === "arrived" ? "flag" : activity.phase === "returning" ? "route" : activity.status === "finished" ? "check" : "navigation";
        title = activity.title || "Ride";
        body = `${ridePhaseLabel(activity.phase)}${activity.destination ? ` · ${activity.destination}` : ""}`;
    } else {
        body = post.caption || "Publicação durante a Ride.";
    }

    return `
        <button type="button" class="ride-timeline__item" data-action="open-post" data-post-id="${escapeHtml(post.id || "")}">
            <span class="ride-timeline__item-icon">${icon(glyph, { size: 16, decorative: true })}</span>
            <span class="ride-timeline__item-avatar">${avatar.outerHTML}</span>
            <span class="ride-timeline__item-copy">
                <strong>${escapeHtml(title)}</strong>
                <small>${escapeHtml(body)}</small>
                <em>${escapeHtml(formatDate(post.createdAt))}</em>
            </span>
            <span class="ride-timeline__item-arrow">${icon("arrow-right", { size: 15, decorative: true })}</span>
        </button>
    `;
}

export async function openRideTimelineSheet(rideId) {
    if (!rideId) return null;

    const posts = await getPosts();
    const linked = posts
        .filter(post => {
            const activity = post.activity || {};
            const rideLinks = Array.isArray(activity.rideLinks) ? activity.rideLinks : [];
            return String(activity.rideId || "") === String(rideId)
                || String(post.rideContext?.rideId || "") === String(rideId)
                || rideLinks.some(link => String(link.rideId || "") === String(rideId));
        })
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    const ridePost = linked.find(post => String(post.activity?.rideId || "") === String(rideId));
    const activity = ridePost?.activity || {};
    const container = document.createElement("section");
    container.className = "ride-timeline-view";

    container.innerHTML = `
        <header class="ride-timeline__header">
            <div>
                <span>RIDE · LINHA DO TEMPO</span>
                <h2>${escapeHtml(activity.destination ? `Destino · ${activity.destination}` : "Ride")}</h2>
            </div>
            <span class="ride-timeline__status">${activity.status === "active" ? "AO VIVO" : "ENCERRADA"}</span>
        </header>
        <div class="ride-timeline__list">
            ${linked.length ? linked.map(renderPostItem).join("") : `
                <div class="ride-timeline__empty">
                    ${icon("route", { size: 24, decorative: true })}
                    <strong>Nenhum acontecimento registrado ainda.</strong>
                    <small>Publicações, SOS e atualizações desta Ride aparecerão aqui.</small>
                </div>
            `}
        </div>
    `;

    hydrateIcons(container);

    const sheet = openBottomSheet({
        title: "",
        className: "bottom-sheet--ride-timeline",
        content: container
    });

    container.addEventListener("click", async event => {
        const button = event.target.closest('[data-action="open-post"]');
        if (!button) return;
        const postId = button.dataset.postId;
        if (!postId) return;
        sheet?.close?.();
        await router.navigate("home", { focusPostId: postId });
    });

    return sheet;
}
