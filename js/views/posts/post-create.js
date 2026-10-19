// =========================================================
// MOTOCLUBE
// Bottom Sheet — Criar Postagem
// IG / FB like — Greaser / Industrial Rustic
// =========================================================

import { router } from "../../core/router.js";
import { createMediaCarousel } from "../../components/media-carousel.js";
import { createAvatar } from "../../components/avatar.js";
import { showToast } from "../../components/toast.js";
import { icon } from "../../icons/icons.js";
import { session } from "../../core/session.js";
import { store } from "../../core/store.js";
import { events as eventBus } from "../../core/events.js";
import { createPost } from "../../services/posts.js";
import { getCurrentRide } from "../../services/rides.js";

const MAX_MEDIA = 10;
const MAX_CAPTION = 2200;


// =========================================================
// HELPERS
// =========================================================

function escapeHTML(value = "") {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function getAuthenticatedUser(fallback = {}) {

    try {

        const currentUser =
            session.getUser?.();

        if (
            currentUser &&
            typeof currentUser === "object"
        ) {

            return currentUser;
        }

    } catch (error) {

        console.warn(
            "[POST CREATE] Não foi possível obter o usuário autenticado:",
            error
        );

    }

    return fallback || {};
}


function getCurrentVehicle(fallback = null) {

    try {

        const storedVehicle =
            store.get?.(
                "profile.currentVehicle"
            );

        if (storedVehicle && storedVehicle.type !== "on_foot") {
            return storedVehicle;
        }

        if (fallback && fallback.type !== "on_foot") {
            return fallback;
        }

        if (storedVehicle) {
            return storedVehicle;
        }

    } catch (error) {

        console.warn(
            "[POST CREATE] Não foi possível obter o veículo atual:",
            error
        );

    }

    return fallback || {
        type: "on_foot"
    };
}


// =========================================================
// RENDER
// =========================================================

export function renderPostCreate(data = {}) {

    const container =
        document.createElement("section");

    container.className =
        "post-create-sheet";


    // =====================================================
    // AUTHENTICATED USER
    // =====================================================

    /*
     * IMPORTANTE:
     *
     * Não fazemos importação direta do Firebase aqui.
     *
     * A view usa a mesma sessão que o restante da aplicação
     * já utiliza.
     */

    const user =
        getAuthenticatedUser(
            data.user || {}
        );


    // =====================================================
    // CURRENT VEHICLE
    // =====================================================

    const vehicle =
        getCurrentVehicle(
            data.currentVehicle || user.currentVehicle
        );

    const activeRide = store.get?.("ride.current") || null;
    let rideContext = activeRide?.status === "active" || store.get?.("ride.active")
        ? activeRide
        : null;
    let eventContext = data.eventId
        ? { eventId: data.eventId, eventTitle: data.eventTitle || "Evento" }
        : null;

    const media = [];


    // =====================================================
    // MEMBER DATA
    // =====================================================

    const username =
        user.username ||
        user.nickname ||
        user.displayName ||
        user.name ||
        "Membro";


    const avatarSource =
        user.avatarDataUrl ||
        user.avatar ||
        user.photoURL ||
        user.photoUrl ||
        "";


    const avatarAlt =
        `Avatar de ${username}`;


    const avatarMarkup = "";


    // =====================================================
    // HTML
    // =====================================================

    container.innerHTML = `

        <form
            class="post-create-sheet__form"
            id="post-create-sheet-form"
            novalidate
        >

            <!-- =============================================
                 AUTHOR
                 ============================================= -->

            <section
                class="post-create-sheet__author"
            >

                <div
                    class="post-create-sheet__avatar"
                    id="post-create-author-avatar"
                ></div>


                <div
                    class="post-create-sheet__author-info"
                >

                    <strong
                        id="post-create-author-name"
                    >
                        ${escapeHTML(username)}
                    </strong>


                    <span
                        class="post-create-sheet__context"
                    >

                        ${icon(
                            "globe",
                            {
                                size: 13,
                                decorative: true
                            }
                        )}

                        Clube

                    </span>

                </div>

            </section>


            ${rideContext ? `
                <section class="post-create-sheet__context-banner">
                    ${icon("route", { size: 15, decorative: true })}
                    <span>PUBLICAÇÃO DURANTE RIDE</span>
                    <strong>${escapeHTML(rideContext.destination || "Destino não informado")}</strong>
                </section>
            ` : ""}

            ${eventContext ? `
                <section class="post-create-sheet__context-banner">
                    ${icon("calendar", { size: 15, decorative: true })}
                    <span>PUBLICAÇÃO NO EVENTO</span>
                    <strong>${escapeHTML(eventContext.eventTitle)}</strong>
                </section>
            ` : ""}

            <!-- =============================================
                 COMPOSER
                 ============================================= -->

            <section
                class="post-create-sheet__composer"
            >

                <label
                    class="sr-only"
                    for="post-caption-input"
                >
                    Legenda da publicação
                </label>


                <textarea
                    id="post-caption-input"
                    name="caption"
                    maxlength="${MAX_CAPTION}"
                    rows="4"
                    placeholder="Conta para a gente como foi o rolê, ${escapeHTML(username)}?"
                    autocomplete="off"
                ></textarea>


                <div
                    class="post-create-sheet__caption-meta"
                >

                    <span>
                        Compartilhe algo com o clube.
                    </span>


                    <span>
                        <b id="caption-counter">0</b>/${MAX_CAPTION}
                    </span>

                </div>

            </section>


            <!-- =============================================
                 MEDIA
                 ============================================= -->

            <section
                class="post-create-sheet__media-section"
            >

                <div
                    class="post-create-sheet__section-heading"
                >

                    <div>

                        <strong>
                            Adicionar à publicação
                        </strong>

                        <span>
                            Fotos e vídeos aparecem no feed.
                        </span>

                    </div>


                    <span
                        id="media-counter"
                        class="post-create-sheet__media-count"
                    >
                        0/${MAX_MEDIA}
                    </span>

                </div>


                <div
                    id="post-media-preview"
                    class="post-create-sheet__preview"
                >

                    <div
                        class="post-create-sheet__empty-media"
                    >

                        <span
                            class="post-create-sheet__empty-icon"
                        >
                            ${icon(
                                "camera",
                                {
                                    size: 23,
                                    decorative: true
                                }
                            )}
                        </span>


                        <div>

                            <strong>
                                Suas fotos e vídeos
                            </strong>

                            <span>
                                Até ${MAX_MEDIA}
                                mídias por publicação.
                            </span>

                        </div>

                    </div>

                </div>


                <div
                    class="post-create-sheet__media-actions"
                >
<button
                        type="button"
                        class="post-create-sheet__media-action"
                        data-action="gallery"
                    >

                        <span
                            class="post-create-sheet__media-action-icon"
                        >
                            ${icon(
                                "gallery",
                                {
                                    size: 19,
                                    decorative: true
                                }
                            )}
                        </span>

                        <span>
                            Galeria
                        </span>

                    </button>

                </div>

            </section>


            <!-- =============================================
                 VEHICLE SNAPSHOT
                 ============================================= -->

            <section
                class="post-create-sheet__vehicle"
            >

                <span
                    class="post-create-sheet__vehicle-icon"
                >
                    ${vehicleIcon(vehicle, 18)}
                </span>


                <div
                    class="post-create-sheet__vehicle-copy"
                >

                    <span>
                        Veículo desta publicação
                    </span>

                    <strong>
                        ${escapeHTML(
                            vehicleName(vehicle)
                        )}
                    </strong>

                </div>


                <span
                    class="post-create-sheet__vehicle-lock"
                >
                    ${icon(
                        "lock",
                        {
                            size: 14,
                            decorative: true
                        }
                    )}
                </span>

            </section>


            <!-- =============================================
                 ACTIONS
                 ============================================= -->

            <div
                class="post-create-sheet__actions"
            >

                <button
                    type="button"
                    class="post-create-sheet__cancel"
                    data-action="cancel"
                >
                    Cancelar
                </button>


                <button
                    type="submit"
                    class="post-create-sheet__publish"
                    id="publish-post"
                    disabled
                >

                    <span>
                        Publicar
                    </span>

                    ${icon(
                        "arrowRight",
                        {
                            size: 18,
                            decorative: true
                        }
                    )}

                </button>

            </div>

        </form>
    `;


    const authorAvatar = container.querySelector("#post-create-author-avatar");
    if (authorAvatar) {
        authorAvatar.replaceChildren(createAvatar({
            src: avatarSource,
            username,
            size: "small"
        }));
    }


    // =====================================================
    // DOM REFERENCES
    // =====================================================

    const form =
        container.querySelector(
            "#post-create-sheet-form"
        );


    const preview =
        container.querySelector(
            "#post-media-preview"
        );


    const mediaCounter =
        container.querySelector(
            "#media-counter"
        );


    const caption =
        container.querySelector(
            "#post-caption-input"
        );


    const captionCounter =
        container.querySelector(
            "#caption-counter"
        );


    const publishButton =
        container.querySelector(
            "#publish-post"
        );


    // =====================================================
    // CLOSE
    // =====================================================

    function closeRequested() {

        if (data.modal) {

            container.dispatchEvent(
                new CustomEvent(
                    "post:close",
                    {
                        bubbles: true
                    }
                )
            );

            return;
        }


        router.back();
    }


    container
        .querySelector(
            '[data-action="cancel"]'
        )
        ?.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeRequested();

            }
        );


    // =====================================================
    // CAPTION
    // =====================================================

    caption.addEventListener(
        "input",
        () => {

            captionCounter.textContent =
                caption.value.length;

            updatePublishState();

        }
    );


    // =====================================================
    


    // =====================================================
    // GALLERY
    // =====================================================

    container
        .querySelector(
            '[data-action="gallery"]'
        )
        ?.addEventListener(
            "click",
            () => {

                container.dispatchEvent(
                    new CustomEvent(
                        "media:gallery",
                        {
                            bubbles: true,

                            detail: {
                                remaining:
                                    MAX_MEDIA -
                                    media.length
                            }
                        }
                    )
                );

            }
        );


    container.addEventListener("media:error", event => {
        const message = event.detail?.error?.message || "Não foi possível adicionar a mídia.";
        showToast({ type: "error", message });
    });

    // =====================================================
    // SUBMIT
    // =====================================================

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            // Impede duplo toque/clique enquanto a primeira publicação está em processamento.
            if (container.dataset.submitting === "true") return;
            container.dataset.submitting = "true";
            publishButton.disabled = true;
            publishButton.classList.add("is-loading");
            const publishLabel = publishButton.querySelector("span");
            if (publishLabel) publishLabel.textContent = "Publicando…";


            if (
                !media.length &&
                !caption.value.trim()
            ) {

                showToast({
                    type: "warning",
                    message:
                        "Adicione uma mídia ou escreva uma legenda."
                });

                container.dataset.submitting = "false";
                updatePublishState();
                return;
            }


            /*
             * Pegamos novamente o usuário autenticado
             * no momento da publicação.
             *
             * Isso evita utilizar dados antigos caso
             * a sessão tenha sido atualizada enquanto
             * a bottom-sheet estava aberta.
             */

            const currentUser =
                getAuthenticatedUser(user);

            if (!rideContext && currentUser?.id) {
                try {
                    const liveRide = await getCurrentRide(currentUser.id);
                    if (liveRide?.status === "active") rideContext = liveRide;
                } catch {}
            }

            if (!eventContext && currentUser?.id) {
                try {
                    const { getActiveEventForUser } = await import("../../services/events.js");
                    const liveEvent = await getActiveEventForUser(currentUser.id);
                    if (liveEvent?.status === "in_progress") {
                        eventContext = {
                            eventId: liveEvent.id,
                            eventTitle: liveEvent.title || "Evento"
                        };
                    }
                } catch (error) {
                    console.warn("[POST CREATE] Não foi possível detectar evento em andamento:", error);
                }
            }

            const post = {

                caption:
                    caption.value.trim(),

                media:
                    media.map(
                        item => ({
                            ...item
                        })
                    ),

                author: {

                    uid:
                        currentUser.uid ||
                        currentUser.id ||
                        null,

                    username:
                        currentUser.username ||
                        currentUser.nickname ||
                        currentUser.displayName ||
                        currentUser.name ||
                        username,

                    avatar:
                        currentUser.avatarDataUrl ||
                        currentUser.avatar ||
                        currentUser.photoURL ||
                        currentUser.photoUrl ||
                        avatarSource ||
                        null

                },

                vehicleSnapshot:
                    JSON.parse(
                        JSON.stringify(
                            vehicle
                        )
                    ),

                rideContext: rideContext ? {
                    rideId: rideContext.id || null,
                    destination: rideContext.destination || "",
                    startedAt: rideContext.startedAt || null,
                    phase: rideContext.phase || null
                } : null,

                eventContext,

                createdAt:
                    new Date().toISOString()

            };


            try {
                const persistedPost = await createPost(
                    post,
                    currentUser
                );

                showToast({
                    type: "success",
                    message: "Publicação criada."
                });

                if (data.modal) {
                    closeRequested();
                } else {
                    await router.navigate("home", { optimisticPost: persistedPost });
                }
            } catch (error) {
                container.dataset.submitting = "false";
                publishButton.classList.remove("is-loading");
                if (publishLabel) publishLabel.textContent = "Publicar";
                updatePublishState();
                console.error("[POST CREATE] Falha ao publicar:", error);
                showToast({
                    type: "error",
                    message: error.message || "Não foi possível publicar."
                });
            }

        }
    );


    // =====================================================
    // PUBLISH STATE
    // =====================================================

    function updatePublishState() {

        publishButton.disabled =
            media.length === 0 &&
            !caption.value.trim();

    }


    // =====================================================
    // MEDIA
    // =====================================================

    function refreshMedia() {

        mediaCounter.textContent =
            `${media.length}/${MAX_MEDIA}`;


        updatePublishState();


        preview.innerHTML = "";


        if (!media.length) {

            preview.innerHTML = `

                <div
                    class="post-create-sheet__empty-media"
                >

                    <span
                        class="post-create-sheet__empty-icon"
                    >
                        ${icon(
                            "camera",
                            {
                                size: 23,
                                decorative: true
                            }
                        )}
                    </span>


                    <div>

                        <strong>
                            Suas fotos e vídeos
                        </strong>

                        <span>
                            Até ${MAX_MEDIA}
                            mídias por publicação.
                        </span>

                    </div>

                </div>

            `;

            return;
        }


        const normalized =
            media.map(
                item => ({

                    ...item,

                    src:
                        item.src ||
                        item.url

                })
            );


        const carousel =
            createMediaCarousel(
                normalized,
                {

                    removable: true,

                    onRemove(index) {

                        media.splice(
                            index,
                            1
                        );

                        refreshMedia();

                    }

                }
            );


        preview.appendChild(
            carousel
        );

    }


    // =====================================================
    // MEDIA UPLOAD PROGRESS
    // =====================================================

    container.addEventListener(
        "media:progress",
        event => {

            const progress =
                event.detail || {};

            const total =
                Number(progress.total) || 0;

            const completed =
                Number(progress.completed) || 0;

            if (!total) return;

            const percent =
                Math.min(
                    100,
                    Math.round(
                        (completed / total) * 100
                    )
                );

            const current =
                Number(progress.current) || 0;

            const title =
                progress.stage === "starting"
                    ? "Preparando mídias"
                    : progress.stage === "uploaded"
                        ? "Mídia enviada"
                        : "Processando e enviando mídias";

            preview.innerHTML = `
                <div class="post-create-sheet__media-upload">
                    <div class="post-create-sheet__media-upload-main">
                        <div class="post-create-sheet__media-upload-spinner"></div>

                        <div class="post-create-sheet__media-upload-info">
                            <div class="post-create-sheet__media-upload-title">
                                ${title}
                            </div>

                            <div class="post-create-sheet__media-upload-count">
                                ${completed} de ${total} concludas
                                ${current > completed ? `  processando ${current} de ${total}` : ""}
                            </div>
                        </div>
                    </div>

                    <div class="post-create-sheet__media-upload-track">
                        <div
                            class="post-create-sheet__media-upload-bar"
                            style="width:${percent}%"
                        ></div>
                    </div>
                </div>
            `;

        }
    );


    // =====================================================
    // MEDIA SELECTED
    // =====================================================

    container.addEventListener(
        "media:selected",
        event => {

            const selected =
                Array.isArray(
                    event.detail?.media
                )
                    ? event.detail.media
                    : [];


            selected
                .slice(
                    0,
                    MAX_MEDIA -
                    media.length
                )
                .forEach(
                    item => {

                        media.push({
                            // Keep the durable Storage path. Signed URLs expire and
                            // must never be the only reference saved with a post.
                            id: item.id || item.mediaId || item.path || null,
                            mediaId: item.mediaId || item.path || item.id || null,
                            path: item.path || item.mediaId || null,
                            type: item.type || "image",
                            src: item.src || item.url || item.preview || item.dataUrl || "",
                            url: item.url || item.src || item.preview || item.dataUrl || "",
                            thumbnail: item.thumbnail || item.url || item.src || null,
                            mimeType: item.mimeType || null,
                            name: item.name || null,
                            alt: item.alt || "Mídia da publicação"
                        });

                    }
                );


            refreshMedia();

        }
    );


    // =====================================================
    // INITIAL RENDER
    // =====================================================

    refreshMedia();


    return container;
}


// =========================================================
// VEHICLE ICON
// =========================================================

function vehicleIcon(
    vehicle,
    size = 18
) {

    const type =
        String(
            vehicle?.type ||
            "on_foot"
        )
        .toLowerCase();


    if (
        type === "motorcycle" ||
        type === "moto" ||
        type === "bike"
    ) {

        return icon(
            "motorcycle",
            {
                size,
                decorative: true
            }
        );

    }


    if (
        type === "car" ||
        type === "auto"
    ) {

        return icon(
            "car",
            {
                size,
                decorative: true
            }
        );

    }


    return icon(
        "walk",
        {
            size,
            decorative: true
        }
    );
}


// =========================================================
// VEHICLE NAME
// =========================================================

function vehicleName(
    vehicle
) {

    if (
        !vehicle ||
        vehicle.type === "on_foot"
    ) {

        return "A pé";
    }


    if (
        vehicle.type === "motorcycle" ||
        vehicle.type === "moto"
    ) {

        return (
            vehicle.model ||
            "Motocicleta"
        );

    }


    if (
        vehicle.type === "car" ||
        vehicle.type === "auto"
    ) {

        return (
            vehicle.model ||
            "Carro"
        );

    }


    return (
        vehicle.model ||
        "Veículo"
    );
}
