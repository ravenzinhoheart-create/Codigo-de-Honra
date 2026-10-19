/**
 * Motoclube — Feed
 * Persistência local + interações reais do protótipo.
 */

import { createAvatar } from "../../components/avatar.js";
import { createMediaCarousel } from "../../components/media-carousel.js";
import { openBottomSheet } from "../../components/bottom-sheet.js";
import { createModal } from "../../components/modal.js";
import { showToast } from "../../components/toast.js";
import { icon, hydrateIcons } from "../../icons/icons.js";
import { session } from "../../core/session.js";
import { events as eventBus } from "../../core/events.js";
import {
    getPost,
    toggleLike,
    addComment,
    updateComment,
    deleteComment,
    updatePost,
    deletePost
} from "../../services/posts.js";

let activityTimer = null;

function currentUser() {
    return session.getUser?.() || session.getCurrentUser?.() || null;
}

export function renderFeed(posts = []) {
    if (!Array.isArray(posts)) posts = [];

    if (!posts.length) {
        return `
            <section class="home-feed">
                <div class="home-feed__empty">
                    <div class="home-feed__empty-icon">
                        <span data-icon="post"></span>
                    </div>
                    <h3>Ainda não há publicações</h3>
                    <p>As publicações dos membros aparecerão aqui.</p>
                </div>
            </section>
        `;
    }

    const feedBlocks = buildFeedBlocks(posts);

    let previousDateKey = null;
    const renderedBlocks = feedBlocks.map(block => {
        const dateKey = feedDateKey(block.latestAt);
        const showDate = dateKey !== previousDateKey;
        previousDateKey = dateKey;
        return renderFeedBlock(block, showDate);
    });

    return `
        <section class="home-feed">
            <div class="home-feed__list">
                ${renderedBlocks.join("")}
            </div>
        </section>
    `;
}

/* =========================================================
   FEED AGRUPADO POR RIDE

   Uma Ride funciona como um "bloco vivo" da timeline:
   - a publicação da Ride fica sempre em primeiro;
   - publicações, SOS e outros acontecimentos vinculados
     ficam imediatamente abaixo dela;
   - quando qualquer item vinculado é criado/atualizado,
     o bloco inteiro sobe na timeline;
   - dentro do bloco, os acontecimentos mais recentes
     aparecem primeiro.
========================================================= */

function postTimestamp(post) {
    const value = post?.updatedAt || post?.createdAt || post?.created_at || 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
}

function getLinkedRideIds(post) {
    const ids = [];
    const activity = post?.activity || {};
    const user = currentUser();

    // Quando um SOS envolve mais de uma Ride (emissor + atendente),
    // priorizamos a Ride do usuário que está visualizando a timeline.
    // Assim, o chamado aparece dentro da Ride em que ele participou,
    // sem precisar duplicar o mesmo post na timeline principal.
    if (Array.isArray(activity?.rideLinks) && user?.id) {
        activity.rideLinks.forEach(link => {
            if (String(link?.userId || "") === String(user.id) && link?.rideId) {
                ids.push(String(link.rideId));
            }
        });
    }

    if (post?.rideContext?.rideId) ids.push(String(post.rideContext.rideId));
    if (post?.activityContext?.rideId) ids.push(String(post.activityContext.rideId));
    if (activity?.rideId) ids.push(String(activity.rideId));

    if (Array.isArray(activity?.rideLinks)) {
        activity.rideLinks.forEach(link => {
            if (link?.rideId) ids.push(String(link.rideId));
        });
    }

    return [...new Set(ids.filter(Boolean))];
}

function isRideActivityPost(post) {
    return String(post?.activity?.type || "") === "ride"
        && Boolean(post?.activity?.rideId);
}

function getLinkedEventIds(post) {
    const ids = [];
    const activity = post?.activity || {};
    if (post?.eventContext?.eventId) ids.push(String(post.eventContext.eventId));
    if (activity?.eventId) ids.push(String(activity.eventId));
    return [...new Set(ids.filter(Boolean))];
}

function isEventActivityPost(post) {
    return (String(post?.activity?.type || "") === "event" || Boolean(post?.activity?.eventSummary))
        && Boolean(post?.activity?.eventId);
}

function isSosActivityPost(post) {
    return String(post?.activity?.type || "") === "sos"
        && Boolean(post?.activity?.sosId);
}

function buildFeedBlocks(posts) {
    const normalized = Array.isArray(posts)
        ? posts.slice().sort((a,b) => postTimestamp(b) - postTimestamp(a))
        : [];

    const rideGroups = new Map();
    const sosGroups = new Map();
    const eventGroups = new Map();
    const assigned = new Set();
    const standalone = [];

    const timeOf = value => {
        const time = new Date(value || 0).getTime();
        return Number.isFinite(time) ? time : 0;
    };

    const addRide = rideId => {
        if (!rideGroups.has(rideId)) {
            rideGroups.set(rideId, {
                type: "ride",
                rideId,
                ridePost: null,
                posts: [],
                sosGroups: new Map(),
                timeline: [],
                latestAt: 0
            });
        }

        return rideGroups.get(rideId);
    };

    const addSos = sosId => {
        if (!sosGroups.has(sosId)) {
            sosGroups.set(sosId, {
                type: "sos",
                sosId,
                sosPost: null,
                posts: [],
                rideId: null,
                anchorAt: 0,
                latestAt: 0
            });
        }

        return sosGroups.get(sosId);
    };

    const addEvent = eventId => {
        if (!eventGroups.has(eventId)) {
            eventGroups.set(eventId, {
                type: "event",
                eventId,
                eventPost: null,
                posts: [],
                latestAt: 0
            });
        }

        return eventGroups.get(eventId);
    };

    normalized.forEach(post => {
        const activity = post?.activity || {};
        const postId = String(post?.id || "");

        if (isRideActivityPost(post)) {
            const rideId = String(activity.rideId);
            const group = addRide(rideId);

            group.ridePost = post;
            group.latestAt = Math.max(
                group.latestAt,
                timeOf(
                    activity.finishedAt ||
                    activity.startedAt ||
                    post.createdAt
                )
            );

            assigned.add(postId);
            return;
        }

        if (isSosActivityPost(post)) {
            const sosId = String(activity.sosId);
            const group = addSos(sosId);

            group.sosPost = post;
            group.rideId = activity.rideId
                ? String(activity.rideId)
                : null;

            group.anchorAt = timeOf(
                activity.createdAt ||
                post.createdAt
            );

            group.latestAt = Math.max(
                group.latestAt,
                group.anchorAt,
                timeOf(activity.resolvedAt)
            );

            assigned.add(postId);
            return;
        }

        if (isEventActivityPost(post)) {
            const eventId = String(activity.eventId);
            const group = addEvent(eventId);

            group.eventPost = post;
            group.latestAt = Math.max(
                group.latestAt,
                timeOf(
                    activity.endedAt ||
                    activity.startedAt ||
                    activity.startAt ||
                    post.createdAt
                )
            );

            assigned.add(postId);
        }
    });

    /*
     * Liga cada SOS a sua Ride quando existir.
     */
    sosGroups.forEach(sos => {
        if (sos.rideId && rideGroups.has(sos.rideId)) {
            rideGroups.get(sos.rideId).sosGroups.set(
                sos.sosId,
                sos
            );
        }
    });

    /*
     * Distribui os posts comuns.
     *
     * SOS tem prioridade sobre Ride porque um post dentro
     * do SOS tambem pode carregar o rideId.
     */
    normalized.forEach(post => {
        const postId = String(post?.id || "");

        if (assigned.has(postId)) return;

        const activityContext = post?.activityContext || {};
        const activity = post?.activity || {};

        const sosId = String(
            activityContext.sosId ||
            activity.sosId ||
            ""
        ).trim();

        if (sosId && sosGroups.has(sosId)) {
            const group = sosGroups.get(sosId);

            group.posts.push(post);
            group.latestAt = Math.max(
                group.latestAt,
                postTimestamp(post)
            );

            assigned.add(postId);
            return;
        }

        const rideIds = getLinkedRideIds(post);

        if (rideIds.length && rideGroups.has(rideIds[0])) {
            const group = rideGroups.get(rideIds[0]);

            group.posts.push(post);
            group.latestAt = Math.max(
                group.latestAt,
                postTimestamp(post)
            );

            assigned.add(postId);
            return;
        }

        const eventIds = getLinkedEventIds(post);

        if (eventIds.length && eventGroups.has(eventIds[0])) {
            const group = eventGroups.get(eventIds[0]);

            group.posts.push(post);
            group.latestAt = Math.max(
                group.latestAt,
                postTimestamp(post)
            );

            assigned.add(postId);
            return;
        }

        /*
         * Post sem contexto continua independente.
         */
        standalone.push({
            type: "post",
            post,
            latestAt: postTimestamp(post)
        });

        assigned.add(postId);
    });

    /*
     * Organiza os posts internos.
     */
    sosGroups.forEach(group => {
        group.posts.sort(
            (a,b) => postTimestamp(b) - postTimestamp(a)
        );
    });

    rideGroups.forEach(group => {
        group.posts.sort(
            (a,b) => postTimestamp(b) - postTimestamp(a)
        );

        /*
         * Monta uma unica linha do tempo para a Ride.
         * Assim o SOS fica entre os posts exatamente pela hora.
         */
        group.timeline = [
            ...group.posts.map(post => ({
                type: "post",
                post,
                timestamp: postTimestamp(post)
            })),

            ...[...group.sosGroups.values()].map(sos => ({
                type: "sos",
                sos,
                timestamp: sos.anchorAt
            }))
        ].sort(
            (a,b) => b.timestamp - a.timestamp
        );
    });

    eventGroups.forEach(group => {
        group.posts.sort(
            (a,b) => postTimestamp(b) - postTimestamp(a)
        );
    });

    /*
     * SOS sem Ride continua como bloco independente.
     */
    const standaloneSos = [...sosGroups.values()]
        .filter(sos =>
            !sos.rideId ||
            !rideGroups.has(sos.rideId)
        )
        .map(sos => ({
            type: "sos",
            sosId: sos.sosId,
            sosPost: sos.sosPost,
            posts: sos.posts,
            latestAt: sos.latestAt
        }));

    const blocks = [
        ...standalone,
        ...rideGroups.values(),
        ...eventGroups.values(),
        ...standaloneSos
    ];

    return blocks.sort(
        (a,b) => b.latestAt - a.latestAt
    );
}
function renderFeedBlock(block, showDate = true) {
    const date = showDate && block.latestAt
        ? renderFeedDate(block.latestAt)
        : "";

    const renderTreeChild = (post, options = {}) => `
        <div class="feed-tree__child">
            ${renderPost(post, options)}
        </div>
    `;

    const renderSosTree = sos => {
        if (!sos) return "";

        const sosPost = sos.sosPost || null;

        return `
            <div
                class="feed-tree__nested feed-tree__nested--sos"
                data-sos-group="${escapeAttribute(sos.sosId || "")}"
            >
                ${sosPost
                    ? renderTreeChild(sosPost, { inSosGroup: true })
                    : ""
                }

                <div class="feed-tree__children">
                    ${(sos.posts || [])
                        .map(post =>
                            renderTreeChild(post, {
                                inSosGroup: true
                            })
                        )
                        .join("")
                    }
                </div>

                <span class="feed-tree__nested-end"></span>
            </div>
        `;
    };

    if (block.type === "ride") {
        const ridePost = block.ridePost || null;
        const timeline = Array.isArray(block.timeline)
            ? block.timeline
            : [];

        return `
            <section
                class="feed-block feed-block--tree feed-block--ride"
                data-ride-group="${escapeAttribute(block.rideId || "")}"
            >
                ${date}

                <div class="feed-tree">

                    ${
                        ridePost
                            ? renderTreeChild(ridePost, {
                                inRideGroup: true
                            })
                            : ""
                    }

                    <div class="feed-tree__children">

                        ${timeline
                            .map(item => {
                                if (item.type === "sos") {
                                    return renderSosTree(item.sos);
                                }

                                if (item.type === "post") {
                                    return renderTreeChild(
                                        item.post,
                                        {
                                            inRideGroup: true
                                        }
                                    );
                                }

                                return "";
                            })
                            .join("")
                        }

                    </div>

                    <span class="feed-tree__end"></span>
                </div>
            </section>
        `;
    }

    if (block.type === "sos") {
        const sosPost = block.sosPost || null;

        return `
            <section
                class="feed-block feed-block--tree feed-block--sos"
                data-sos-group="${escapeAttribute(block.sosId || "")}"
            >
                ${date}

                <div class="feed-tree">

                    ${
                        sosPost
                            ? renderTreeChild(
                                sosPost,
                                { inSosGroup: true }
                            )
                            : ""
                    }

                    <div class="feed-tree__children">
                        ${(block.posts || [])
                            .map(post =>
                                renderTreeChild(
                                    post,
                                    { inSosGroup: true }
                                )
                            )
                            .join("")
                        }
                    </div>

                    <span class="feed-tree__end"></span>
                </div>
            </section>
        `;
    }

    if (block.type === "event") {
        const eventPost = block.eventPost || null;

        return `
            <section
                class="feed-block feed-block--tree feed-block--event"
                data-event-group="${escapeAttribute(block.eventId || "")}"
            >
                ${date}

                <div class="feed-tree">

                    ${
                        eventPost
                            ? renderTreeChild(
                                eventPost,
                                { inEventGroup: true }
                            )
                            : ""
                    }

                    <div class="feed-tree__children">
                        ${(block.posts || [])
                            .map(post =>
                                renderTreeChild(
                                    post,
                                    { inEventGroup: true }
                                )
                            )
                            .join("")
                        }
                    </div>

                    <span class="feed-tree__end"></span>
                </div>
            </section>
        `;
    }

    return `
        <section class="feed-block feed-block--standalone">
            ${date}
            ${renderPost(block.post)}
        </section>
    `;
}
function feedDateKey(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "unknown";
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function renderFeedDate(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a, b) =>
        a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();

    let label;
    if (sameDay(date, today)) label = "Hoje";
    else if (sameDay(date, yesterday)) label = "Ontem";
    else {
        label = new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "long",
            year: date.getFullYear() === today.getFullYear() ? undefined : "numeric"
        }).format(date);
    }

    return `<div class="feed-date-divider"><span>${escapeHtml(label)}</span></div>`;
}
function renderPost(post) {
    const author = post.author || post.user || {};
    const username = author.username || post.username || "Membro";
    const vehicle = post.vehicleSnapshot || post.vehicle || null;
    const media = Array.isArray(post.media) ? post.media.slice(0, 10) : [];
    const createdAt = post.createdAt || post.created_at || Date.now();
    const likes = Array.isArray(post.likedBy) ? post.likedBy.length : Number(post.likesCount ?? post.likes ?? 0);
    const comments = Array.isArray(post.comments) ? post.comments.length : Number(post.commentsCount ?? post.comments ?? 0);
    const user = currentUser();
    const liked = Boolean(user?.id && Array.isArray(post.likedBy) && post.likedBy.includes(user.id));
    const isOwner = Boolean(!post.activity && user?.id && author?.id && String(user.id) === String(author.id));

    return `
        <article class="feed-post" data-post-id="${escapeAttribute(post.id || "")}">
            <header class="feed-post__header">
                <button type="button" class="feed-post__author" data-action="open-member" data-user-id="${escapeAttribute(author.id || "")}">
                    <span class="feed-post__avatar" data-avatar-container></span>
                    <span class="feed-post__author-info">
                        <strong>${escapeHtml(username)}</strong>
                        ${vehicle ? `<span class="feed-post__vehicle">${renderVehicle(vehicle)}</span>` : ""}
                    </span>
                </button>

                <div class="feed-post__header-actions">
                    <span class="feed-post__time">${formatRelativeDate(createdAt)}</span>
                    ${isOwner ? `
                        <button type="button" class="feed-post__more" data-action="post-menu" data-post-id="${escapeAttribute(post.id || "")}" aria-label="Opções da publicação">
                            ${icon("more", { size: 18, decorative: true })}
                        </button>
                    ` : ""}
                </div>

                ${isOwner ? `
                    <div class="feed-post__owner-menu" data-owner-menu hidden>
                        <button type="button" data-owner-action="edit" data-post-id="${escapeAttribute(post.id || "")}">
                            ${icon("edit", { size: 15, decorative: true })}
                            <span>Editar</span>
                        </button>
                        <button type="button" data-owner-action="delete" data-post-id="${escapeAttribute(post.id || "")}">
                            ${icon("trash", { size: 15, decorative: true })}
                            <span>Excluir</span>
                        </button>
                    </div>
                ` : ""}
            </header>

            ${post.activity ? renderActivityBlock(post.activity) : ""}

            ${post.rideContext ? `
                <div class="feed-post__ride-context">
                    <span class="feed-post__ride-context-icon">${icon("navigation", { size: 14, decorative: true })}</span>
                    <div>
                        <strong>Durante a Ride</strong>
                        <small>${post.rideContext.destination ? `Destino · ${escapeHtml(post.rideContext.destination)}` : "Ride em andamento"}${post.rideContext.phase ? ` · ${escapeHtml(ridePhaseLabel(post.rideContext.phase))}` : ""}</small>
                    </div>
                </div>
            ` : ""}

            ${post.eventContext ? `
                <div class="feed-post__event-context">
                    <span>${icon("calendar", { size: 14, decorative: true })}</span>
                    <div>
                        <strong>Durante o evento</strong>
                        <small>${escapeHtml(post.eventContext.eventTitle || "Evento")}</small>
                    </div>
                </div>
            ` : ""}

            ${media.length ? `<div class="feed-post__media" data-media-container></div>` : ""}

            ${post.caption ? `
                <div class="feed-post__content">
                    <p>${escapeHtml(post.caption)}</p>
                </div>
            ` : ""}

            <footer class="feed-post__footer">
                <div class="feed-post__actions">
                    <button type="button" class="feed-post__action ${liked ? "is-active" : ""}" data-action="like" data-post-id="${escapeAttribute(post.id || "")}" aria-label="${liked ? "Descurtir" : "Curtir"}" aria-pressed="${liked}">
                        <span data-icon="heart"></span>
                        <span class="feed-post__action-count">${likes}</span>
                    </button>
                    <button type="button" class="feed-post__action" data-action="comment" data-post-id="${escapeAttribute(post.id || "")}" aria-label="Comentários">
                        <span data-icon="comment"></span>
                        <span class="feed-post__action-count">${comments}</span>
                    </button>
                </div>
            </footer>
        </article>
    `;
}

export function initializeFeed(container, posts = []) {
    if (!container) return;

    container.querySelectorAll("[data-post-id]").forEach(postElement => {
        const post = posts.find(item => String(item.id) === String(postElement.dataset.postId));
        if (!post) return;

        const author = post.author || post.user || {};
        const avatarContainer = postElement.querySelector("[data-avatar-container]");
        if (avatarContainer) {
            avatarContainer.appendChild(createAvatar({
                src: author.avatar || author.avatarUrl || post.avatar || null,
                username: author.username || post.username || "Membro",
                status: author.status || post.status || "off",
                size: "small"
            }));
        }

        const mediaContainer = postElement.querySelector("[data-media-container]");
        if (mediaContainer && Array.isArray(post.media)) {
            mediaContainer.appendChild(createMediaCarousel(post.media.slice(0, 10)));
        }
    });

    container.addEventListener("click", handleFeedAction);
    hydrateIcons(container);
    bindActivityTimers();
}

async function handleFeedAction(event) {
    const ownerAction = event.target.closest("[data-owner-action]");
    if (ownerAction) {
        event.preventDefault();
        event.stopPropagation();
        const action = ownerAction.dataset.ownerAction;
        const postId = ownerAction.dataset.postId;
        closeAllOwnerMenus();
        if (action === "edit") await editPost(postId);
        if (action === "delete") await confirmDeletePost(postId);
        return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const postId = button.dataset.postId;

    if (action === "post-menu") {
        event.preventDefault();
        event.stopPropagation();
        const post = button.closest(".feed-post");
        const menu = post?.querySelector("[data-owner-menu]");
        const shouldOpen = Boolean(menu?.hidden);
        closeAllOwnerMenus();
        if (menu) menu.hidden = !shouldOpen;
        return;
    }

    if (action === "open-sos") {
        const sosId = button.dataset.sosId;
        if (sosId) {
            const { openSosDetailSheet } = await import("../sos/sos-detail.js");
            await openSosDetailSheet(sosId);
        }
        return;
    }

    if (action === "like") {
        const user = currentUser();
        if (!user?.id || !postId) return;

        try {
            const result = await toggleLike(postId, user.id);
            button.classList.toggle("is-active", result.liked);
            button.setAttribute("aria-pressed", String(result.liked));
            button.setAttribute("aria-label", result.liked ? "Descurtir" : "Curtir");
            const count = button.querySelector(".feed-post__action-count");
            if (count) count.textContent = String(result.likes);
            eventBus.emit("post:interaction", { postId, type: "like", ...result });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível curtir." });
        }
        return;
    }

    if (action === "comment") {
        await openCommentsSheet(postId);
        return;
    }

    if (action === "open-member") {
        const userId = button.dataset.userId;
        if (!userId) return;
        const { router } = await import("../../core/router.js");
        router.navigate("member-profile", { userId });
    }
}

function closeAllOwnerMenus() {
    document.querySelectorAll("[data-owner-menu]").forEach(menu => {
        menu.hidden = true;
    });
}

async function editPost(postId) {
    const post = await getPost(postId);
    const user = currentUser();
    if (!post || !user?.id) return;

    const modal = createModal({
        title: "Editar publicação",
        className: "post-edit-modal",
        content: `
            <form class="post-edit-form">
                <textarea id="post-edit-caption" maxlength="2200" rows="6">${escapeHtml(post.caption || "")}</textarea>
                <div class="post-edit-form__actions">
                    <button type="button" class="button button--secondary" data-edit-cancel>Cancelar</button>
                    <button type="submit" class="button button--primary">Salvar</button>
                </div>
            </form>
        `
    });

    if (!modal?.element) return;

    const form = modal.element.querySelector(".post-edit-form");
    const textarea = modal.element.querySelector("#post-edit-caption");

    form?.addEventListener("submit", async event => {
        event.preventDefault();
        try {
            const updated = await updatePost(postId, { caption: textarea.value.trim() }, user.id);
            modal.close();
            eventBus.emit("post:updated", updated);
            showToast({ type: "success", message: "Publicação atualizada." });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível editar." });
        }
    });

    modal.element.querySelector("[data-edit-cancel]")?.addEventListener("click", () => modal.close());
}

async function confirmDeletePost(postId) {
    const user = currentUser();
    if (!user?.id) return;

    const modal = createModal({
        title: "Excluir publicação?",
        content: `
            <div class="post-edit-form">
                <p>Essa publicação será removida do feed.</p>
                <div class="post-edit-form__actions">
                    <button type="button" class="button button--secondary" data-delete-cancel>Cancelar</button>
                    <button type="button" class="button button--danger" data-delete-confirm>Excluir</button>
                </div>
            </div>
        `
    });

    modal?.element?.querySelector("[data-delete-cancel]")?.addEventListener("click", () => modal.close());
    modal?.element?.querySelector("[data-delete-confirm]")?.addEventListener("click", async () => {
        try {
            await deletePost(postId, user.id);
            modal.close();
            eventBus.emit("post:deleted", { id: postId });
            showToast({ type: "success", message: "Publicação excluída." });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível excluir." });
        }
    });
}

async function openCommentsSheet(postId) {
    const post = await getPost(postId);
    if (!post) return;

    const content = document.createElement("section");
    content.className = "post-comments-sheet";

    const render = freshPost => {
        const comments = (Array.isArray(freshPost.comments) ? [...freshPost.comments] : []).sort((a, b) => {
            const ta = new Date(a?.createdAt || 0).getTime();
            const tb = new Date(b?.createdAt || 0).getTime();
            return tb - ta;
        });
        content.innerHTML = `
            <div class="post-comments-sheet__list">
                ${comments.length ? comments.map(renderComment).join("") : `
                    <div class="post-comments-sheet__empty">Ainda não há comentários.</div>
                `}
            </div>
            <form class="post-comments-sheet__form">
                <input type="text" maxlength="500" placeholder="Escreva um comentário..." autocomplete="off">
                <button type="submit" aria-label="Enviar comentário">${icon("arrowRight", { size: 18, decorative: true })}</button>
            </form>
        `;
        hydrateIcons(content);
    };

    render(post);

    const sheet = openBottomSheet({
        title: "Comentários",
        className: "bottom-sheet--comments",
        content
    });

    content.addEventListener("click", async event => {
        const menu = event.target.closest("[data-comment-menu]");
        if (!menu) return;
        const item = menu.closest("[data-comment-id]");
        const commentId = item?.dataset.commentId;
        const fresh = await getPost(postId);
        const comment = fresh?.comments?.find(c => c.id === commentId);
        const user = currentUser();
        if (!comment || !user?.id) return;

        const modal = createModal({
            title: "Comentário",
            content: `
                <div class="post-comment-actions">
                    <button type="button" class="button button--secondary" data-comment-edit>Editar comentário</button>
                    <button type="button" class="button button--danger" data-comment-delete>Excluir comentário</button>
                </div>`
        });
        modal?.element?.querySelector("[data-comment-edit]")?.addEventListener("click", () => {
            modal.close();
            const editor = createModal({
                title: "Editar comentário",
                content: `<div class="post-edit-form"><textarea class="post-comment-edit-input" maxlength="500">${escapeHtml(comment.text)}</textarea><div class="post-edit-form__actions"><button type="button" class="button button--secondary" data-cancel>Cancelar</button><button type="button" class="button button--primary" data-save>Salvar</button></div></div>`
            });
            editor?.element?.querySelector("[data-cancel]")?.addEventListener("click", () => editor.close());
            editor?.element?.querySelector("[data-save]")?.addEventListener("click", async () => {
                try {
                    const value = editor.element.querySelector("textarea")?.value.trim();
                    await updateComment(postId, commentId, value, user.id);
                    editor.close();
                    render(await getPost(postId));
                    showToast({ type: "success", message: "Comentário atualizado." });
                } catch (error) { showToast({ type: "error", message: error.message || "Não foi possível editar." }); }
            });
        });
        modal?.element?.querySelector("[data-comment-delete]")?.addEventListener("click", async () => {
            try {
                await deleteComment(postId, commentId, user.id);
                modal.close();
                render(await getPost(postId));
                showToast({ type: "success", message: "Comentário excluído." });
            } catch (error) { showToast({ type: "error", message: error.message || "Não foi possível excluir." }); }
        });
    });

    content.addEventListener("submit", async event => {
        if (!event.target.matches(".post-comments-sheet__form")) return;
        event.preventDefault();
        const user = currentUser();
        const input = event.target.querySelector("input");
        const text = input?.value.trim();
        if (!user?.id || !text) return;

        try {
            await addComment(postId, user, text);
            const fresh = await getPost(postId);
            render(fresh);
            eventBus.emit("post:interaction", { postId, type: "comment" });
            showToast({ type: "success", message: "Comentário enviado." });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível comentar." });
        }
    });

    return sheet;
}

function renderComment(comment) {
    const author = comment.author || comment.user || {};
    const avatar = createAvatar({
        src: author.avatar,
        username: author.username || "Membro",
        status: author.status || "off",
        size: "small"
    });

    const user = currentUser();
    const mine = Boolean(user?.id && author?.id && String(user.id) === String(author.id));
    return `
        <article class="post-comments-sheet__item" data-comment-id="${escapeAttribute(comment.id || "")}">
            <div class="post-comments-sheet__avatar">${avatar.outerHTML}</div>
            <div class="post-comments-sheet__content">
                <div class="post-comments-sheet__topline">
                    <strong>${escapeHtml(author.username || "Membro")}</strong>
                    ${mine ? `<button type="button" class="post-comments-sheet__menu" data-comment-menu aria-label="Opções do comentário">${icon("more", { size: 16, decorative: true })}</button>` : ""}
                </div>
                <p>${escapeHtml(comment.text || "")}</p>
                <small>${formatRelativeDate(comment.createdAt)}${comment.updatedAt ? " · editado" : ""}</small>
            </div>
        </article>
    `;
}

function ridePhaseLabel(phase) {
    return ({
        outbound: "Saindo para Ride",
        arrived: "Cheguei ao destino",
        returning: "Voltando da Ride"
    })[phase] || "Ride";
}

function formatRideDuration(seconds = 0) {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = Math.floor(value % 60);
    if (hours) return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
    return `${String(minutes).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

function renderActivityBlock(activity = {}) {
    if (activity.type === "sos" || activity.sosId) return renderSosActivity(activity);
    if (activity.type === "event" || activity.eventId) {
        return `
            <div class="feed-post__activity feed-post__activity--event">
                <span class="feed-post__activity-icon">${icon("calendar", { size: 18, decorative: true })}</span>
                <div>
                    <strong>${escapeHtml(activity.eventTitle || activity.title || "Evento")}</strong>
                    <small>${activity.status === "in_progress" ? "Evento em andamento" : "Evento encerrado"}</small>
                </div>
                <span class="feed-post__activity-status ${activity.status === "in_progress" ? "is-live" : ""}">${activity.status === "in_progress" ? "AO VIVO" : "ENCERRADO"}</span>
            </div>
            ${renderEventSummary(activity)}`;
    }
    if (activity.type === "ride" || activity.rideId) {
        return `
            <div class="feed-post__activity feed-post__activity--ride">
                <span class="feed-post__activity-icon">${icon(activityIcon(activity.type, activity), { size: 18, decorative: true })}</span>
                <div>
                    <strong>${escapeHtml(activity.title || "Ride")}</strong>
                    ${activity.destination ? `<small>Destino · ${escapeHtml(activity.destination)}</small>` : ""}
                </div>
                <span class="feed-post__activity-status ${activity.status === "active" ? "is-live" : ""}">${activity.status === "active" ? "AO VIVO" : "ENCERRADA"}</span>
            </div>
            ${renderRideSummary(activity)}`;
    }

    return `
        <div class="feed-post__activity">
            <span class="feed-post__activity-icon">${icon(activityIcon(activity.type, activity), { size: 16, decorative: true })}</span>
            <div><strong>${escapeHtml(activity.title || "Atividade do clube")}</strong>${activity.destination ? `<small>Destino · ${escapeHtml(activity.destination)}</small>` : ""}</div>
        </div>`;
}

function renderEventSummary(activity = {}) {
    const start = new Date(activity.startedAt || 0).getTime();
    const end = activity.endedAt ? new Date(activity.endedAt).getTime() : Date.now();
    const duration = Number(activity.totalDurationSeconds) || (Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.floor((end - start) / 1000)) : 0);
    const participants = Array.isArray(activity.participants) ? activity.participants : [];
    const durationLabel = formatRideDuration(duration);
    return `
        <div class="feed-event-summary" aria-label="Resumo do evento">
            <div class="feed-event-summary__head">
                <span>${activity.status === "in_progress" ? "EVENTO EM ANDAMENTO" : "RESUMO DO EVENTO"}</span>
                <strong data-activity-timer data-start-at="${escapeAttribute(activity.startedAt || "")}" data-end-at="${escapeAttribute(activity.endedAt || "")}">${escapeHtml(durationLabel)}</strong>
            </div>
            <div class="feed-event-summary__meta">
                <span>${icon("clock", { size: 12, decorative: true })}<b>${activity.startedAt ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(activity.startedAt)) : "--:--"}</b></span>
                <span>${icon("users", { size: 12, decorative: true })}<b>${participants.length}</b><small>${participants.length === 1 ? "participante" : "participantes"}</small></span>
            </div>
            ${participants.length ? `
                <div class="feed-event-summary__participants">
                    ${participants.map(renderActivityResponder).join("")}
                </div>` : ""}
        </div>`;
}

function renderSosActivity(activity = {}) {
    const responders = Array.isArray(activity.responders) ? activity.responders : [];
    const active = activity.status === "active";
    const label = activity.sosTypeLabel || "Outro";
    const iconName = activity.sosTypeIcon || "alert";
    return `
        <div class="feed-sos-activity ${active ? "is-active" : "is-resolved"}">
            <div class="feed-sos-activity__head">
                <div class="feed-sos-activity__type">
                    <span class="feed-sos-activity__icon">${icon(iconName, { size: 20, decorative: true })}</span>
                    <div><span>SOS</span><strong>${escapeHtml(label)}</strong></div>
                </div>
                <span class="feed-sos-activity__status">${active ? "ATIVO" : (activity.status === "cancelled" ? "CANCELADO" : "ENCERRADO")}</span>
            </div>
            <div class="feed-sos-activity__meta">
                <span><b data-activity-timer data-start-at="${escapeAttribute(activity.createdAt || "")}" data-end-at="${escapeAttribute(activity.resolvedAt || "")}">${formatLiveActivityDuration(activity)}</b></span>
                <span>${responders.length} ${responders.length === 1 ? "membro atendendo" : "membros atendendo"}</span>
            </div>
            ${responders.length ? `<div class="feed-sos-activity__responders">${responders.map(renderActivityResponder).join("")}</div>` : `<div class="feed-sos-activity__empty">Aguardando apoio do clube.</div>`}
            <button type="button" class="feed-activity__timeline-button" data-action="open-sos" data-sos-id="${escapeAttribute(activity.sosId || "")}">${icon("alert", { size: 14, decorative: true })}<span>Ver detalhes do chamado</span></button>
        </div>`;
}

function renderActivityResponder(responder = {}) {
    const avatar = createAvatar({ src: responder.avatar || responder.avatarUrl || "", username: responder.username || "Membro", status: responder.status || "on", size: "small" });
    return `<span class="feed-sos-activity__responder" title="${escapeAttribute(responder.username || "Membro")}">${avatar.outerHTML}<small>${escapeHtml(responder.username || "Membro")}</small></span>`;
}

function formatLiveActivityDuration(activity = {}) {
    const start = new Date(activity.createdAt || 0).getTime();
    const end = activity.resolvedAt ? new Date(activity.resolvedAt).getTime() : Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return "00:00";
    return formatRideDuration(Math.max(0, Math.floor((end - start) / 1000)));
}

function bindActivityTimers() {
    if (activityTimer) clearInterval(activityTimer);
    const tick = () => {
        document.querySelectorAll("[data-activity-timer]").forEach(el => {
            const start = new Date(el.dataset.startAt || 0).getTime();
            const end = el.dataset.endAt ? new Date(el.dataset.endAt).getTime() : Date.now();
            if (!Number.isFinite(start) || !Number.isFinite(end)) return;
            el.textContent = formatRideDuration(Math.max(0, Math.floor((end - start) / 1000)));
        });
    };
    tick();
    activityTimer = window.setInterval(tick, 1000);
}

function renderRideSummary(activity = {}) {
    const durations = { ...(activity.phaseDurations || {}) };
    const active = activity.status === "active";
    const currentPhase = activity.phase || "outbound";
    if (active) {
        const phaseStart = new Date(activity.phaseStartedAt || activity.startedAt || 0).getTime();
        if (Number.isFinite(phaseStart)) {
            const live = Math.max(0, Math.floor((Date.now() - phaseStart) / 1000));
            durations[currentPhase] = Math.max(Number(durations[currentPhase] || 0), live);
        }
    }
    const total = active
        ? Math.max(1, Object.values(durations).reduce((sum, value) => sum + (Number(value) || 0), 0))
        : Math.max(0, Number(activity.totalDurationSeconds) || Object.values(durations).reduce((sum, value) => sum + (Number(value) || 0), 0));
    const phases = [
        { key: "outbound", label: "Saindo", icon: "navigation" },
        { key: "arrived", label: "No destino", icon: "flag" },
        { key: "returning", label: "Voltando", icon: "route" }
    ];
    const phaseSeconds = phases.map(phase => Math.max(0, Number(durations[phase.key]) || 0));
    const phaseWidths = phaseSeconds.map((seconds, index) => {
        if (index === phases.length - 1) {
            const used = phaseSeconds.slice(0, -1).reduce((sum, value) => sum + value, 0);
            return total > 0 ? Math.max(0, 100 - (used / total * 100)) : 0;
        }
        return total > 0 ? Math.max(0, (seconds / total) * 100) : 0;
    });
    return `
        <div class="feed-ride-summary" aria-label="Resumo gráfico da Ride">
            <div class="feed-ride-summary__head">
                <span>${active ? "RIDE EM ANDAMENTO" : "RESUMO DA RIDE"}</span>
                <strong data-activity-timer data-start-at="${escapeAttribute(activity.startedAt || "")}" data-end-at="${escapeAttribute(activity.finishedAt || "")}">${active ? formatLiveActivityDuration(activity) : formatRideDuration(total)}</strong>
            </div>
            <div class="feed-ride-summary__bar">
                ${phases.map(phase => {
                    const index = phases.indexOf(phase);
                    const seconds = phaseSeconds[index];
                    const width = phaseWidths[index];
                    return `<span class="feed-ride-summary__segment feed-ride-summary__segment--${phase.key} ${active && currentPhase === phase.key ? "is-current" : ""}" style="flex:0 0 ${width}%" title="${escapeHtml(phase.label)} · ${escapeHtml(formatRideDuration(seconds))}"></span>`;
                }).join("")}
            </div>
            <div class="feed-ride-summary__legend">
                ${phases.map(phase => {
                    const seconds = Math.max(0, Number(durations[phase.key]) || 0);
                    const current = active && currentPhase === phase.key;
                    return `<span class="${current ? "is-current" : ""}"><i>${icon(phase.icon, { size: 12, decorative: true })}</i><b>${escapeHtml(phase.label)}</b><small>${escapeHtml(formatRideDuration(seconds))}</small></span>`;
                }).join("")}
            </div>
        </div>`;
}

function activityIcon(type, activity = {}) {
    if (activity.sosTypeIcon) return activity.sosTypeIcon;
    return ({
        ride: "navigation", ride_started: "navigation", ride_arrived: "flag", ride_returning: "route", ride_finished: "check",
        event_created: "calendar", event_started: "navigation", event_finished: "flag", sos: "alert", sos_created: "alert", sos_resolved: "check"
    })[type] || "info";
}

function renderVehicle(vehicle) {
    if (!vehicle) return "";
    if (vehicle.type === "on_foot" || vehicle.type === "a-pe" || vehicle.type === "walking") return "A pé";
    return `${vehicle.brand || ""} ${vehicle.model || ""}`.trim();
}

function formatRelativeDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "agora";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} d`;
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}














