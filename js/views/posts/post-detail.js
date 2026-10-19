import { router } from "../../core/router.js";
import { createAvatar } from "../../components/avatar.js";
import { createMediaCarousel } from "../../components/media-carousel.js";
import { STATUS } from "../../components/status-ring.js";
import { showToast } from "../../components/toast.js";
import { session } from "../../core/session.js";
import { events as eventBus } from "../../core/events.js";
import { toggleLike, addComment, getPost } from "../../services/posts.js";
import { openBottomSheet } from "../../components/bottom-sheet.js";

export async function renderPostDetail(data = {}) {
    const container = document.createElement("article");
    container.className = "post-detail-view";

    let post = data.post || null;

    if (!post && data.postId) {
        post = await getPost(String(data.postId));
    }

    if (!post) {
        container.innerHTML = `
            <section class="post-detail-view__empty">
                <button type="button" class="icon-button" data-action="back" aria-label="Voltar">
                    <span data-icon="arrow-left"></span>
                </button>
                <div>
                    <strong>Publicação não encontrada</strong>
                    <span>Esta publicação pode ter sido removida.</span>
                </div>
            </section>
        `;

        container.querySelector('[data-action="back"]')?.addEventListener("click", () => router.back());
        return container;
    }

    const author = post.author || post.user || {};

    const media = Array.isArray(post.media)
        ? post.media.slice(0, 10)
        : [];

    const vehicle = post.vehicleSnapshot || post.vehicle || {
        type: "on_foot"
    };

    const user = session.getUser?.() || session.getCurrentUser?.();
    const liked = Boolean(user?.id && Array.isArray(post.likedBy) && post.likedBy.includes(user.id));
    const likes = Array.isArray(post.likedBy) ? post.likedBy.length : Number(post.likes || 0);
    const comments = Array.isArray(post.comments)
        ? post.comments
        : [];

    container.innerHTML = `
        <header class="post-detail-view__header">

            <button
                type="button"
                class="icon-button"
                data-action="back"
                aria-label="Voltar"
            >
                <span data-icon="arrow-left"></span>
            </button>

            <span>PUBLICAÇÃO</span>

            <span class="post-detail-view__spacer"></span>

        </header>

        <section class="post-detail-view__post">

            <header class="post-detail-author">

                ${createAvatar({
                    src: author.avatar,
                    alt: author.username || "Membro",
                    size: "medium",
                    status: author.status || STATUS.OFF
                }).outerHTML}

                <div>
                    <strong>${author.username || "Membro"}</strong>
                    <span>${formatDate(post.createdAt)}</span>
                </div>

            </header>

            ${
                media.length
                    ? `
                        <div class="post-detail-media">
                            ${createMediaCarousel(media)}
                        </div>
                    `
                    : ""
            }

            <div class="post-detail-actions">

                <button
                    type="button"
                    class="post-action ${liked ? "is-liked" : ""}"
                    data-action="like"
                    aria-label="Curtir"
                >
                    <span data-icon="heart"></span>
                    <strong id="post-likes">${likes}</strong>
                </button>

                <button
                    type="button"
                    class="post-action"
                    data-action="comment-focus"
                    aria-label="Comentários"
                >
                    <span data-icon="comment"></span>
                    <strong>${comments.length}</strong>
                </button>

            </div>

            <section class="post-detail-caption">

                ${
                    post.caption
                        ? `
                            <p>
                                <strong>${author.username || "Membro"}</strong>
                                ${escapeHtml(post.caption)}
                            </p>
                        `
                        : ""
                }

                <div class="post-detail-vehicle">
                    <span data-icon="${
                        vehicle.type === "motorcycle"
                            ? "motorcycle"
                            : vehicle.type === "car"
                                ? "car"
                                : "walk"
                    }"></span>

                    <div>
                        <span>VEÍCULO NA PUBLICAÇÃO</span>
                        <strong>${vehicleName(vehicle)}</strong>
                    </div>
                </div>

            </section>

            <section
                id="post-comments"
                class="post-comments"
            >
                <div class="post-comments__heading">
                    <span>COMENTÁRIOS</span>
                    <strong>${comments.length}</strong>
                </div>

                <div class="post-comments__list">
                    ${
                        comments.length
                            ? comments.map(renderComment).join("")
                            : `
                                <div class="post-comments__empty">
                                    Ainda não há comentários.
                                </div>
                            `
                    }
                </div>

                <form class="post-comment-form" id="post-comment-form">
                    <input
                        type="text"
                        id="post-comment-input"
                        maxlength="500"
                        placeholder="Escreva um comentário..."
                        autocomplete="off"
                    >

                    <button
                        type="submit"
                        class="icon-button"
                        aria-label="Enviar comentário"
                    >
                        <span data-icon="send"></span>
                    </button>
                </form>
            </section>

        </section>
    `;

    bindEvents(container, data, post);

    return container;
}

function renderComment(comment) {
    const source = comment.author || comment.user || {};
    const author = {
        ...source,
        username: source.username || comment.username || comment.nickname || "Membro",
        avatar: source.avatar || comment.avatar || comment.avatarUrl || null,
        status: source.status || comment.status || STATUS.OFF
    };

    return `
        <article class="post-comment">

            ${createAvatar({
                src: author.avatar,
                alt: author.username || "Membro",
                size: "small",
                status: author.status || STATUS.OFF
            }).outerHTML}

            <div class="post-comment__body">
                <strong>${author.username || "Membro"}</strong>

                <p>
                    ${escapeHtml(comment.text || "")}
                </p>

                <small>
                    ${formatDate(comment.createdAt)}
                </small>
            </div>

        </article>
    `;
}

function bindEvents(container, data, post) {
    container.querySelector('[data-action="back"]')
        ?.addEventListener("click", () => router.back());

    const likeButton = container.querySelector('[data-action="like"]');

    likeButton?.addEventListener("click", async () => {
        const user = session.getUser?.() || session.getCurrentUser?.();
        if (!user?.id) return;

        try {
            const result = await toggleLike(post.id, user.id);
            likeButton.classList.toggle("is-liked", result.liked);
            container.querySelector("#post-likes").textContent = String(result.likes);
            eventBus.emit("post:interaction", { postId: post.id, type: "like", ...result });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível curtir." });
        }
    });

    const commentForm = container.querySelector("#post-comment-form");
    const commentInput = container.querySelector("#post-comment-input");

    container.querySelector('[data-action="comment-focus"]')
        ?.addEventListener("click", async () => {
            const fresh = await getPost(post.id);
            const sheetContent = document.createElement("section");
            sheetContent.className = "post-comments-sheet";

            const draw = current => {
                const comments = (Array.isArray(current?.comments) ? [...current.comments] : []).sort((a, b) => {
                    const ta = new Date(a?.createdAt || 0).getTime();
                    const tb = new Date(b?.createdAt || 0).getTime();
                    return tb - ta;
                });
                sheetContent.innerHTML = `
                    <div class="post-comments-sheet__list">
                        ${comments.length ? comments.map(renderComment).join("") : '<div class="post-comments-sheet__empty">Ainda não há comentários.</div>'}
                    </div>
                    <form class="post-comments-sheet__form">
                        <input type="text" maxlength="500" placeholder="Escreva um comentário..." autocomplete="off">
                        <button type="submit" aria-label="Enviar comentário"><span data-icon="arrowRight"></span></button>
                    </form>`;
            };

            draw(fresh || post);
            const sheet = openBottomSheet({ title: "Comentários", className: "bottom-sheet--comments", content: sheetContent });
            sheetContent.addEventListener("submit", async event => {
                event.preventDefault();
                const user = session.getUser?.() || session.getCurrentUser?.();
                const input = event.target.querySelector("input");
                const text = input?.value.trim();
                if (!user?.id || !text) return;
                try {
                    await addComment(post.id, user, text);
                    const current = await getPost(post.id);
                    draw(current);
                    eventBus.emit("post:interaction", { postId: post.id, type: "comment" });
                } catch (error) {
                    showToast({ type: "error", message: error.message || "Não foi possível comentar." });
                }
            });
        });

    commentForm?.addEventListener("submit", async event => {
        event.preventDefault();

        const text = commentInput.value.trim();

        if (!text) {
            showToast({
                type: "warning",
                message: "Digite um comentário."
            });
            return;
        }

        const user = session.getUser?.() || session.getCurrentUser?.();
        if (!user?.id) return;
        try {
            await addComment(post.id, user, text);
            commentInput.value = "";
            eventBus.emit("post:interaction", { postId: post.id, type: "comment" });
            showToast({ type: "success", message: "Comentário enviado." });
        } catch (error) {
            showToast({ type: "error", message: error.message || "Não foi possível comentar." });
        }
    });
}

function vehicleName(vehicle) {
    if (!vehicle || vehicle.type === "on_foot") {
        return "A pé";
    }

    if (vehicle.type === "motorcycle") {
        return vehicle.model || "Motocicleta";
    }

    if (vehicle.type === "car") {
        return vehicle.model || "Carro";
    }

    return vehicle.model || "Veículo";
}

function formatDate(value) {
    if (!value) return "Agora";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Agora";
    }

    return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}