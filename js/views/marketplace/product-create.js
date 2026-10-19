// =========================================================
// MOTOCLUBE
// Bottom Sheet — Criar Anúncio
// Marketplace — Greaser / Industrial Rustic
// =========================================================

import { router } from "../../core/router.js";
import { createMediaCarousel } from "../../components/media-carousel.js";
import { createAvatar } from "../../components/avatar.js";
import { showToast } from "../../components/toast.js";
import { icon } from "../../icons/icons.js";
import { session } from "../../core/session.js";
import { initDropdowns } from "../../components/dropdown.js";
import { createProduct } from "../../services/marketplace.js";
import { events as eventBus } from "../../core/events.js";
import {
    MARKETPLACE_CATEGORY,
    MARKETPLACE_CATEGORY_META,
    LIMITS
} from "../../core/constants.js";

const MAX_MEDIA = 10;
const MAX_TITLE =
    LIMITS.MARKETPLACE_TITLE_MAX_LENGTH || 100;
const MAX_DESCRIPTION =
    LIMITS.MARKETPLACE_DESCRIPTION_MAX_LENGTH || 3000;


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
            "[PRODUCT CREATE] Não foi possível obter o usuário autenticado:",
            error
        );

    }

    return fallback || {};
}


function normalizePrice(value = "") {

    const raw =
        String(value)
            .replace(/[^\d,.-]/g, "")
            .replace(/\./g, "")
            .replace(",", ".");

    const number =
        Number(raw);

    return Number.isFinite(number)
        ? number
        : 0;
}


function formatBRL(value) {

    const number =
        Number(value) || 0;

    return number.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function formatPriceInput(value = "") {

    const digits =
        String(value)
            .replace(/\D/g, "")
            .replace(/^0+(?=\d)/, "");

    if (!digits) {
        return "";
    }

    const padded =
        digits.padStart(3, "0");

    const cents =
        padded.slice(-2);

    let integer =
        padded.slice(0, -2)
            .replace(/^0+(?=\d)/, "");

    integer = integer || "0";

    integer =
        integer.replace(
            /\B(?=(\d{3})+(?!\d))/g,
            "."
        );

    return `${integer},${cents}`;
}


function getUsername(user = {}) {

    return (
        user.username ||
        user.nickname ||
        user.displayName ||
        user.name ||
        "Membro"
    );
}


function categoryOptions() {

    return Object.entries(
        MARKETPLACE_CATEGORY
    )
        .map(
            ([, value]) => {

                const meta =
                    MARKETPLACE_CATEGORY_META[value];

                return `
                    <option value="${escapeHTML(value)}">
                        ${escapeHTML(
                            meta?.label || value
                        )}
                    </option>
                `;
            }
        )
        .join("");
}


// =========================================================
// RENDER
// =========================================================

export function renderProductCreate(data = {}) {

    const container =
        document.createElement("section");

    container.className =
        "product-create-sheet";


    const user =
        getAuthenticatedUser(
            data.user || {}
        );


    const username =
        getUsername(user);


    const avatarSource =
        user.avatarDataUrl ||
        user.avatar ||
        user.photoURL ||
        user.photoUrl ||
        "";


    const avatarMarkup = "";


    const media = [];


    container.innerHTML = `

        <form
            class="product-create-sheet__form"
            id="product-create-sheet-form"
            novalidate
        >

            <!-- =============================================
                 HEADER
                 ============================================= -->

            <section
                class="product-create-sheet__header"
            >

                <div
                    class="product-create-sheet__header-icon"
                >
                    ${icon(
                        "store",
                        {
                            size: 22,
                            decorative: true
                        }
                    )}
                </div>

                <div>

                    <strong>
                        Novo anúncio
                    </strong>

                    <span>
                        Venda para o clube.
                    </span>

                </div>

            </section>


            <!-- =============================================
                 SELLER
                 ============================================= -->

            <section
                class="product-create-sheet__seller"
            >

                <div
                    class="product-create-sheet__avatar"
                ></div>

                <div
                    class="product-create-sheet__seller-info"
                >

                    <strong>
                        ${escapeHTML(username)}
                    </strong>

                    <span>
                        Anúncio visível para o clube
                    </span>

                </div>

            </section>


            <!-- =============================================
                 BASIC DATA
                 ============================================= -->

            <section
                class="product-create-sheet__section"
            >

                <div
                    class="product-create-sheet__section-heading"
                >

                    <div>

                        <strong>
                            O que você está anunciando?
                        </strong>

                        <span>
                            Informe os dados principais.
                        </span>

                    </div>

                </div>


                <div class="product-create-sheet__field">

                    <label
                        for="product-title"
                    >
                        Título
                    </label>

                    <input
                        id="product-title"
                        name="title"
                        type="text"
                        maxlength="${MAX_TITLE}"
                        placeholder="Ex.: Capacete LS2 FF800"
                        autocomplete="off"
                        required
                    >

                    <div
                        class="product-create-sheet__field-meta"
                    >
                        <span>
                            Seja direto e fácil de encontrar.
                        </span>

                        <span>
                            <b id="product-title-counter">0</b>/${MAX_TITLE}
                        </span>
                    </div>

                </div>


                <div
                    class="product-create-sheet__row"
                >

                    <div
                        class="product-create-sheet__field"
                    >

                        <label
                            for="product-category"
                        >
                            Categoria
                        </label>

                        <select
                            id="product-category"
                            name="category"
                            required
                        >

                            ${categoryOptions()}

                        </select>

                    </div>


                    <div
                        class="product-create-sheet__field"
                    >

                        <label
                            for="product-price"
                        >
                            Preço
                        </label>

                        <div
                            class="product-create-sheet__price-input"
                        >

                            <span>
                                R$
                            </span>

                            <input
                                id="product-price"
                                name="price"
                                type="text"
                                inputmode="numeric"
                                placeholder="0,00"
                                autocomplete="off"
                                required
                            >

                        </div>

                    </div>

                </div>


                <div
                    class="product-create-sheet__field"
                >

                    <label
                        for="product-condition"
                    >
                        Estado do produto
                    </label>

                    <select
                        id="product-condition"
                        name="condition"
                    >

                        <option value="new">
                            Novo
                        </option>

                        <option value="used" selected>
                            Usado
                        </option>

                        <option value="like_new">
                            Seminovo
                        </option>

                    </select>

                </div>

            </section>


            <!-- =============================================
                 DESCRIPTION
                 ============================================= -->

            <section
                class="product-create-sheet__section"
            >

                <div
                    class="product-create-sheet__field"
                >

                    <label
                        for="product-description"
                    >
                        Descrição
                    </label>

                    <textarea
                        id="product-description"
                        name="description"
                        maxlength="${MAX_DESCRIPTION}"
                        rows="6"
                        placeholder="Descreva o produto, estado de conservação, detalhes, acessórios, forma de entrega etc."
                        autocomplete="off"
                    ></textarea>


                    <div
                        class="product-create-sheet__field-meta"
                    >

                        <span>
                            Quanto mais detalhes, melhor.
                        </span>

                        <span>
                            <b id="product-description-counter">0</b>/${MAX_DESCRIPTION}
                        </span>

                    </div>

                </div>

            </section>


            <!-- =============================================
                 MEDIA
                 ============================================= -->

            <section
                class="product-create-sheet__section"
            >

                <div
                    class="product-create-sheet__section-heading"
                >

                    <div>

                        <strong>
                            Fotos do produto
                        </strong>

                        <span>
                            Mostre o que está sendo vendido.
                        </span>

                    </div>

                    <span
                        id="product-media-counter"
                        class="product-create-sheet__media-count"
                    >
                        0/${MAX_MEDIA}
                    </span>

                </div>


                <div
                    id="product-media-preview"
                    class="product-create-sheet__preview"
                >

                    <div
                        class="product-create-sheet__empty-media"
                    >

                        <span
                            class="product-create-sheet__empty-icon"
                        >
                            ${icon(
                                "gallery",
                                {
                                    size: 23,
                                    decorative: true
                                }
                            )}
                        </span>

                        <div>

                            <strong>
                                Adicione fotos
                            </strong>

                            <span>
                                Até ${MAX_MEDIA} mídias.
                            </span>

                        </div>

                    </div>

                </div>


                <div
                    class="product-create-sheet__media-actions"
                >
<button
                        type="button"
                        class="product-create-sheet__media-action"
                        data-action="gallery"
                    >

                        <span
                            class="product-create-sheet__media-action-icon"
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

            </section><!-- =============================================
                 ACTIONS
                 ============================================= -->

            <div
                class="product-create-sheet__actions"
            >

                <button
                    type="button"
                    class="product-create-sheet__cancel"
                    data-action="cancel"
                >
                    Cancelar
                </button>


                <button
                    type="submit"
                    class="product-create-sheet__publish"
                    id="publish-product"
                    disabled
                >

                    <span>
                        Publicar anúncio
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


    const sellerAvatar = container.querySelector(".product-create-sheet__avatar");
    if (sellerAvatar) {
        sellerAvatar.replaceChildren(createAvatar({
            src: avatarSource,
            username,
            size: "small"
        }));
    }


    initDropdowns(container);


    // =====================================================
    // DOM REFERENCES
    // =====================================================

    const form =
        container.querySelector(
            "#product-create-sheet-form"
        );

    const title =
        container.querySelector(
            "#product-title"
        );

    const category =
        container.querySelector(
            "#product-category"
        );

    const price =
        container.querySelector(
            "#product-price"
        );

    const condition =
        container.querySelector(
            "#product-condition"
        );

    const description =
        container.querySelector(
            "#product-description"
        );

    const titleCounter =
        container.querySelector(
            "#product-title-counter"
        );

    const descriptionCounter =
        container.querySelector(
            "#product-description-counter"
        );
const mediaCounter =
        container.querySelector(
            "#product-media-counter"
        );

    const preview =
        container.querySelector(
            "#product-media-preview"
        );

    const publishButton =
        container.querySelector(
            "#publish-product"
        );


    // =====================================================
    // CLOSE
    // =====================================================

    function closeRequested() {

        if (data.modal) {

            container.dispatchEvent(
                new CustomEvent(
                    "product:close",
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
    // TITLE
    // =====================================================

    title.addEventListener(
        "input",
        () => {

            titleCounter.textContent =
                title.value.length;

            updatePublishState();

        }
    );


    // =====================================================
    // DESCRIPTION
    // =====================================================

    description.addEventListener(
        "input",
        () => {

            descriptionCounter.textContent =
                description.value.length;

            updatePublishState();

        }
    );


    // =====================================================
    // PRICE
    // =====================================================

    price.addEventListener(
        "input",
        () => {

            price.value =
                formatPriceInput(
                    price.value
                );
updatePublishState();

        }
    );



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


    // =====================================================
    // SUBMIT
    // =====================================================

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const cleanTitle =
                title.value.trim();

            const cleanDescription =
                description.value.trim();

            const numericPrice =
                normalizePrice(
                    price.value
                );


            if (!cleanTitle) {

                showToast({
                    type: "warning",
                    message:
                        "Informe o título do anúncio."
                });

                title.focus();

                return;
            }


            if (!numericPrice || numericPrice <= 0) {

                showToast({
                    type: "warning",
                    message:
                        "Informe um preço válido."
                });

                price.focus();

                return;
            }


            if (!cleanDescription) {

                showToast({
                    type: "warning",
                    message:
                        "Descreva o produto."
                });

                description.focus();

                return;
            }


            const currentUser =
                getAuthenticatedUser(user);


            const product = {

                title:
                    cleanTitle,

                description:
                    cleanDescription,

                price:
                    numericPrice,

                priceFormatted:
                    formatBRL(
                        numericPrice
                    ),

                category:
                    category.value,

                categoryLabel:
                    MARKETPLACE_CATEGORY_META[
                        category.value
                    ]?.label ||
                    category.value,

                condition:
                    condition.value,

                media:
                    media.map(
                        item => ({
                            ...item
                        })
                    ),

                seller: {

                    uid:
                        currentUser.uid ||
                        currentUser.id ||
                        null,

                    username:
                        getUsername(
                            currentUser
                        ),

                    avatar:
                        currentUser.avatarDataUrl ||
                        currentUser.avatar ||
                        currentUser.photoURL ||
                        currentUser.photoUrl ||
                        avatarSource ||
                        null

                },

                createdAt:
                    new Date().toISOString(),

                status:
                    "active"

            };


            try {
                const persistedProduct = await createProduct(
                    product,
                    currentUser
                );

                container.dispatchEvent(
                    new CustomEvent(
                        "marketplace:create",
                        {
                            bubbles: true,
                            detail: persistedProduct
                        }
                    )
                );

                container.dispatchEvent(
                    new CustomEvent(
                        "marketplace:created",
                        {
                            bubbles: true,
                            detail: persistedProduct
                        }
                    )
                );

                eventBus.emit("marketplace:created", persistedProduct);

                showToast({
                    type: "success",
                    message: "Anúncio criado."
                });

                if (data.modal) {
                    container.dispatchEvent(
                        new CustomEvent("product:close", { bubbles: true })
                    );
                } else {
                    await router.navigate("marketplace");
                }
            } catch (error) {
                console.error("[PRODUCT CREATE] Falha ao persistir:", error);
                showToast({
                    type: "error",
                    message: error.message || "Não foi possível criar o anúncio."
                });
            }

        }
    );


    // =====================================================
    // PUBLISH STATE
    // =====================================================

    function updatePublishState() {

        publishButton.disabled =
            !title.value.trim() ||
            !normalizePrice(
                price.value
            ) ||
            !description.value.trim();

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
                    class="product-create-sheet__empty-media"
                >

                    <span
                        class="product-create-sheet__empty-icon"
                    >
                        ${icon(
                            "gallery",
                            {
                                size: 23,
                                decorative: true
                            }
                        )}
                    </span>


                    <div>

                        <strong>
                            Adicione fotos
                        </strong>

                        <span>
                            Até ${MAX_MEDIA} mídias.
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
    id:
        item.id ||
        item.path ||
        item.mediaId ||
        null,

    path:
        item.path ||
        item.mediaId ||
        null,

    mediaId:
        item.mediaId ||
        item.path ||
        null,

    type:
        item.type ||
        "image",

    src:
        item.src ||
        item.url,

    url:
        item.url ||
        item.src,

    thumbnail:
        item.thumbnail ||
        item.url ||
        item.src,

    mimeType:
        item.mimeType ||
        null,

    alt:
        item.alt ||
        "Mídia do anúncio"
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


