import { router } from "../../core/router.js";
import { showToast } from "../../components/toast.js";
import { initDropdowns } from "../../components/dropdown.js";
import { getProduct, updateProduct } from "../../services/marketplace.js";
import { session } from "../../core/session.js";

const CATEGORIES = [
    {
        value: "motorcycles",
        label: "Motos"
    },
    {
        value: "parts_accessories",
        label: "Peças e acessórios"
    },
    {
        value: "supplies",
        label: "Suprimentos"
    },
    {
        value: "equipment",
        label: "Equipamentos"
    },
    {
        value: "other",
        label: "Outros"
    }
];

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function parsePrice(value) {
    // Aceita tanto o valor inicial do formulário (ex.: "6.00")
    // quanto a digitação brasileira (ex.: "6,00" ou "1.234,56").
    // O ponto só é separador de milhar quando há vírgula decimal.
    let normalized = String(value ?? "")
        .trim()
        .replace(/R\$/gi, "")
        .replace(/\s/g, "");

    if (!normalized) return NaN;

    if (normalized.includes(",")) {
        normalized = normalized
            .replace(/\./g, "")
            .replace(",", ".");
    } else {
        // Sem vírgula, preserva ponto como separador decimal.
        // Remove apenas caracteres que não pertencem a um número decimal.
        normalized = normalized.replace(/[^0-9+\-.]/g, "");
    }

    const number = Number(normalized);

    return Number.isFinite(number)
        ? Math.round((number + Number.EPSILON) * 100) / 100
        : NaN;
}

function getOwnerId(product) {
    return (
        product.ownerId ||
        product.sellerId ||
        product.createdBy?.id ||
        product.createdBy ||
        null
    );
}

function getMedia(product) {
    if (Array.isArray(product?.media)) {
        return product.media
            .map(item => typeof item === "string" ? { type: "image", src: item, url: item } : { ...item, src: item.src || item.url || "", url: item.url || item.src || "" })
            .filter(item => item.src || item.url);
    }

    if (Array.isArray(product?.images)) {
        return product.images.map(url => ({ type: "image", src: url, url }));
    }

    if (product?.image) return [{ type: "image", src: product.image, url: product.image }];
    return [];
}

function renderPreview(media) {
    if (!media.length) {
        return `
            <div class="product-media-preview__empty">
                <span data-icon="camera"></span>
                <span>Adicione fotos do anúncio</span>
            </div>
        `;
    }

    return `
        <div class="product-media-preview__grid">
            ${media.slice(0, 10).map((item, index) => {
                const src = typeof item === "string" ? item : item.src || item.url || "";
                const type = typeof item === "object" ? item.type : "image";
                return `
                <div
                    class="product-media-preview__item"
                    data-preview-index="${index}"
                >
                    ${type === "video" ? `<video src="${escapeHTML(src)}" muted playsinline preload="metadata"></video>` : `<img src="${escapeHTML(src)}" alt="Foto ${index + 1}">`}

                    <button
                        type="button"
                        class="product-media-preview__remove"
                        data-remove-media="${index}"
                        aria-label="Remover foto"
                    >
                        <span data-icon="close"></span>
                    </button>
                </div>
                `;
            }).join("")}
        </div>
    `;
}

export async function renderProductEdit(data = {}) {
    const root = document.querySelector("#app-view");

    if (!root) return;

    let product = data.product || null;

    if (!product && data.productId) {
        product = await getProduct(data.productId);
    }

    if (!product) {
        showToast({
            type: "error",
            message: "Anúncio não encontrado."
        });

        router.back();
        return;
    }

    const currentUserId =
        data.currentUserId ||
        data.userId ||
        session.getUser?.()?.id ||
        null;

    const ownerId = getOwnerId(product);

    const isOwner =
        currentUserId &&
        ownerId &&
        String(currentUserId) ===
            String(ownerId);

    if (!isOwner) {
        showToast({
            type: "error",
            message:
                "Somente o proprietário pode editar este anúncio."
        });

        router.back();
        return;
    }

    const media = getMedia(product);

    root.innerHTML = `
        <section class="product-form-view">

            <header class="product-form-view__header">

                <button
                    type="button"
                    class="icon-button"
                    data-action="back"
                    aria-label="Voltar"
                >
                    <span data-icon="arrow-left"></span>
                </button>

                <div>
                    <span class="product-form-view__eyebrow">
                        MOTOCLUBE
                    </span>

                    <h1>Editar anúncio</h1>
                </div>

            </header>

            <form
                id="product-edit-form"
                class="product-form"
                novalidate
            >

                <section class="product-form__media">

                    <div class="product-form__section-title">
                        <h2>Fotos</h2>
                        <span>Até 10</span>
                    </div>

                    <div
                        id="product-media-preview"
                        class="product-media-preview"
                    >
                        ${renderPreview(media)}
                    </div>

                    <div class="product-form__media-actions">
<button
                            type="button"
                            class="button button--secondary"
                            data-action="gallery"
                        >
                            <span data-icon="gallery"></span>
                            Galeria
                        </button>
                    </div>

                </section>

                <div class="form-field">
                    <label for="product-title">
                        Nome do anúncio
                    </label>

                    <input
                        id="product-title"
                        name="title"
                        type="text"
                        maxlength="100"
                        autocomplete="off"
                        value="${escapeHTML(
                            product.title ||
                            product.name ||
                            ""
                        )}"
                        required
                    >
                </div>

                <div class="form-field">
                    <label for="product-category">
                        Categoria
                    </label>

                    <select
                        id="product-category"
                        name="category"
                        required
                    >
                        ${CATEGORIES.map((category) => `
                            <option
                                value="${category.value}"
                                ${
                                    product.category ===
                                    category.value
                                        ? "selected"
                                        : ""
                                }
                            >
                                ${category.label}
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div class="form-field">
                    <label for="product-price">
                        Preço
                    </label>

                    <div class="form-input-prefix">
                        <span>R$</span>

                        <input
                            id="product-price"
                            name="price"
                            type="text"
                            inputmode="decimal"
                            autocomplete="off"
                            value="${escapeHTML(
                                Number.isFinite(
                                    Number(
                                        product.price
                                    )
                                )
                                    ? Number(
                                        product.price
                                    ).toFixed(2)
                                    : ""
                            )}"
                            required
                        >
                    </div>
                </div>

                <div class="form-field">
                    <label for="product-condition">
                        Estado do produto
                    </label>

                    <select
                        id="product-condition"
                        name="condition"
                    >
                        <option
                            value="new"
                            ${product.condition === "new" ? "selected" : ""}
                        >
                            Novo
                        </option>

                        <option
                            value="used"
                            ${product.condition === "used" ? "selected" : ""}
                        >
                            Usado
                        </option>

                        <option
                            value="like_new"
                            ${product.condition === "like_new" ? "selected" : ""}
                        >
                            Seminovo
                        </option>
                    </select>
                </div>

                <div class="form-field">
                    <label for="product-description">
                        Descrição
                    </label>

                    <textarea
                        id="product-description"
                        name="description"
                        maxlength="3000"
                        rows="7"
                    >${escapeHTML(
                        product.description ||
                        ""
                    )}</textarea>
                </div>

                <div class="form-field">
                    <label for="product-location">
                        Local para negociação
                    </label>

                    <input
                        id="product-location"
                        name="location"
                        type="text"
                        maxlength="160"
                        autocomplete="off"
                        value="${escapeHTML(
                            product.location ||
                            ""
                        )}"
                    >
                </div>

                <div class="product-form__notice">
                    <span data-icon="info"></span>

                    <p>
                        O anúncio continua pertencendo ao mesmo
                        membro. A edição não altera o proprietário.
                    </p>
                </div>

                <div class="product-form__actions">

                    <button
                        type="button"
                        class="button button--secondary"
                        data-action="cancel"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        class="button button--primary"
                    >
                        Salvar alterações
                    </button>

                </div>

            </form>

        </section>
    `;

    initDropdowns(root);

    const mediaPreview =
        root.querySelector(
            "#product-media-preview"
        );

    const updateMediaPreview = () => {
        if (!mediaPreview) return;
        mediaPreview.innerHTML = renderPreview(media);
    };

    const addSelectedMedia = selected => {
        const remaining = 10 - media.length;
        (Array.isArray(selected) ? selected : [])
            .slice(0, remaining)
            .forEach(item => {
                const src = typeof item === "string"
                    ? item
                    : item?.src || item?.url || item?.preview || item?.dataUrl;
                if (!src) return;
                media.push(typeof item === "string"
                    ? { type: "image", src, url: src }
                    : { ...item, src, url: item.url || src });
            });
        updateMediaPreview();
    };
root.querySelector("[data-action='gallery']")?.addEventListener("click", () => {
        root.dispatchEvent(new CustomEvent("media:gallery", { bubbles: true, detail: { remaining: 10 - media.length } }));
    });

    root.addEventListener("click", event => {

        const removeButton =
            event.target.closest("[data-remove-media]");

        if (!removeButton) return;

        const index =
            Number(removeButton.dataset.removeMedia);

        if (!Number.isInteger(index)) return;

        if (index < 0 || index >= media.length) return;

        media.splice(index, 1);

        updateMediaPreview();

    });

    root.addEventListener("media:progress", event => {

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
                ? "Preparando mídias."
                : progress.stage === "uploaded"
                    ? "Mídia enviada"
                    : "Processando e enviando mídias.";

        mediaPreview.innerHTML = `
            <div class="post-create-sheet__media-upload">
                <div class="post-create-sheet__media-upload-main">
                    <div class="post-create-sheet__media-upload-spinner"></div>

                    <div class="post-create-sheet__media-upload-info">
                        <div class="post-create-sheet__media-upload-title">
                            ${title}
                        </div>

                        <div class="post-create-sheet__media-upload-count">
                            ${completed} de ${total} concluídas
                            ${current > completed ? ` → processando ${current} de ${total}` : ""}
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

    });


    root.addEventListener("media:selected", event => {
        addSelectedMedia(event.detail?.media);
    });

    root.querySelector(
        "[data-action='back']"
    )?.addEventListener(
        "click",
        () => router.back()
    );

    root.querySelector(
        "[data-action='cancel']"
    )?.addEventListener(
        "click",
        () => router.back()
    );

    root.querySelector(
        "#product-edit-form"
    )?.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            

            const formData =
                new FormData(event.currentTarget);

            const title =
                String(
                    formData.get("title") || ""
                ).trim();

            const category =
                String(
                    formData.get("category") || ""
                );

            const price =
                parsePrice(
                    formData.get("price")
                );

            const condition =
                String(
                    formData.get(
                        "condition"
                    ) || ""
                );

            const description =
                String(
                    formData.get(
                        "description"
                    ) || ""
                ).trim();

            const location =
                String(
                    formData.get(
                        "location"
                    ) || ""
                ).trim();

            if (!title) {
                showToast({
                    type: "error",
                    message:
                        "Informe o nome do anúncio."
                });
                return;
            }

            if (!category) {
                showToast({
                    type: "error",
                    message:
                        "Selecione uma categoria."
                });
                return;
            }

            if (
                !Number.isFinite(price) ||
                price < 0
            ) {
                showToast({
                    type: "error",
                    message:
                        "Informe um preço válido."
                });
                return;
            }

            try {
                const updated = await updateProduct(
                    product.id,
                    {
                        title,
                        name: title,
                        category,
                        price,
                        description,
                        condition,
                        location,
                        media: [...media]
                    },
                    currentUserId
                );

                root.dispatchEvent(new CustomEvent("marketplace:update", {
                    bubbles: true,
                    detail: { product: updated }
                }));

                showToast({ type: "success", message: "Anúncio atualizado." });
                await router.navigate("product-detail", {
                    product: updated,
                    currentUserId,
                    replace: true
                });
            } catch (error) {
                showToast({
                    type: "error",
                    message: error.message || "Não foi possível salvar o anúncio."
                });
            }
        }
    );
}

export function initializeProductEdit(data = {}) {
    renderProductEdit(data);
}








