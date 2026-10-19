import { router } from "../../core/router.js";
import { createAvatar } from "../../components/avatar.js";
import { createMediaCarousel } from "../../components/media-carousel.js";
import { createModal } from "../../components/modal.js";
import { showToast } from "../../components/toast.js";
import { closeProduct } from "../../services/marketplace.js";

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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

function formatPrice(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "Preço não informado";
    }

    return number.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatDescription(value) {
    const normalized = String(value || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Evita que espaços de indentação desloquem o início das linhas.
        .split("\n")
        .map(line => line.replace(/^[\t ]+/, ""))
        .join("\n");

    return escapeHTML(normalized).replace(/\n/g, "<br>");
}

function getConditionLabel(condition) {
    const conditions = {
        new: "Novo",
        used: "Usado",
        like_new: "Seminovo"
    };

    return conditions[condition] || "Não informado";
}

function getCategoryLabel(category) {
    const categories = {
        motorcycles: "Motos",
        parts: "Peças e acessórios",
        supplies: "Suprimentos",
        other: "Outros"
    };

    return categories[category] || "Outros";
}

function getMedia(product) {
    if (
        Array.isArray(product.media) &&
        product.media.length
    ) {
        return product.media;
    }

    if (
        Array.isArray(product.images) &&
        product.images.length
    ) {
        return product.images.map((url) => ({
            type: "image",
            url
        }));
    }

    if (product.image) {
        return [{
            type: "image",
            url: product.image
        }];
    }

    return [];
}

function renderMedia(product) {
    const media = getMedia(product);

    if (!media.length) {
        return `
            <div class="product-detail__media-empty">
                <span data-icon="marketplace"></span>
                <span>Sem fotos</span>
            </div>
        `;
    }

    return `<div class="product-detail__gallery" data-product-media></div>`;
}

export function renderProductDetail(data = {}) {
    const root = document.querySelector("#app-view");

    if (!root) return;

    const product = data.product;

    if (!product) {
        root.innerHTML = `
            <section class="empty-state">
                <span
                    class="empty-state__icon"
                    data-icon="marketplace"
                ></span>

                <h2>Anúncio não encontrado</h2>

                <button
                    type="button"
                    class="button button--primary"
                    data-action="back"
                >
                    Voltar
                </button>
            </section>
        `;

        root.querySelector(
            "[data-action='back']"
        )?.addEventListener(
            "click",
            () => router.back()
        );

        return;
    }

    const currentUserId =
        data.currentUserId ||
        data.userId ||
        null;

    const ownerId = getOwnerId(product);

    const isOwner =
        currentUserId &&
        ownerId &&
        String(currentUserId) ===
            String(ownerId);

    const seller =
        product.seller ||
        product.owner ||
        product.createdBy ||
        {};

    const sellerUsername =
        seller.username ||
        product.sellerUsername ||
        "Membro do Motoclube";

    const sellerAvatar =
        createAvatar({
            src: seller.avatar,
            alt: sellerUsername,
            size: "md"
        });

    root.innerHTML = `
        <section class="product-detail-view">

            <header class="product-detail-view__header">

                <button
                    type="button"
                    class="icon-button"
                    data-action="back"
                    aria-label="Voltar"
                >
                    <span data-icon="arrow-left"></span>
                </button>

                <span>Detalhes do anúncio</span>

                ${
                    isOwner
                        ? `
                            <button
                                type="button"
                                class="icon-button"
                                data-action="edit"
                                aria-label="Editar anúncio"
                            >
                                <span data-icon="edit"></span>
                            </button>
                        `
                        : `
                            <span class="icon-button-spacer"></span>
                        `
                }

            </header>

            ${renderMedia(product)}

            <article class="product-detail">

                <div class="product-detail__category">
                    ${escapeHTML(
                        getCategoryLabel(
                            product.category
                        )
                    )}
                </div>

                <h1 class="product-detail__title">
                    ${escapeHTML(
                        product.title ||
                        product.name ||
                        "Anúncio"
                    )}
                </h1>

                <strong class="product-detail__price">
                    ${formatPrice(product.price)}
                </strong>

                <div class="product-detail__condition">
                    Estado:
                    <strong>
                        ${escapeHTML(
                            getConditionLabel(
                                product.condition
                            )
                        )}
                    </strong>
                </div>

                ${
                    product.description
                        ? `
                            <section class="product-detail__section">
                                <h2>Descrição</h2>

                                <p>${formatDescription(
                                    product.description
                                )}</p>
                            </section>
                        `
                        : ""
                }

                ${
                    product.location
                        ? `
                            <section class="product-detail__section">
                                <h2>Localização</h2>

                                <div class="product-detail__location">
                                    <span data-icon="location"></span>
                                    ${escapeHTML(
                                        product.location
                                    )}
                                </div>
                            </section>
                        `
                        : ""
                }

                <section class="product-detail__section">

                    <h2>Vendedor</h2>

                    <div class="product-detail__seller">

                        <span>
                            ${sellerAvatar.outerHTML}
                        </span>

                        <div>
                            <strong>
                                ${escapeHTML(
                                    sellerUsername
                                )}
                            </strong>

                            <span>
                                Membro do Motoclube
                            </span>
                        </div>

                    </div>

                </section>

                <div class="product-detail__notice">
                    <span data-icon="info"></span>

                    <p>
                        A negociação e a entrega são realizadas
                        presencialmente na sede ou nos encontros
                        do Motoclube.
                    </p>
                </div>

                ${
                    isOwner
                        ? `
                            <div class="product-detail__actions">
                                <button
                                    type="button"
                                    class="button button--primary"
                                    data-action="close-product"
                                >
                                    Encerrar anúncio
                                </button>
                            </div>
                        `
                        : ""
                }

            </article>

        </section>
    `;

    root.querySelector(
        "[data-action='back']"
    )?.addEventListener(
        "click",
        () => router.back()
    );

    const mediaHost = root.querySelector("[data-product-media]");
    if (mediaHost) {
        mediaHost.appendChild(
            createMediaCarousel(getMedia(product), {
                showCounter: true
            })
        );
    }

    root.querySelectorAll("[data-action='edit']").forEach(button => {
        button.addEventListener("click", async event => {
            event.preventDefault();
            event.stopPropagation();
            const ok = await router.navigate("product-edit", {
                productId: product.id,
                product,
                currentUserId
            });
            if (!ok) {
                showToast({ type: "error", message: "Não foi possível abrir a edição do anúncio." });
            }
        });
    });

    root.querySelector("[data-action='close-product']")?.addEventListener("click", () => {
        const modal = createModal({
            title: "Encerrar anúncio?",
            className: "modal--danger-confirm",
            content: `
                <div class="confirm-dialog">
                    <p>O anúncio deixará de aparecer no Marketplace. Você poderá informar que a negociação foi encerrada.</p>
                    <div class="confirm-dialog__actions">
                        <button type="button" class="button button--secondary" data-cancel>Cancelar</button>
                        <button type="button" class="button button--danger" data-confirm>Encerrar anúncio</button>
                    </div>
                </div>
            `
        });

        modal?.element?.querySelector("[data-cancel]")?.addEventListener("click", () => modal.close());
        modal?.element?.querySelector("[data-confirm]")?.addEventListener("click", async () => {
            try {
                const updated = await closeProduct(product.id, currentUserId);
                modal.close();
                showToast({ type: "success", message: "Anúncio encerrado." });
                window.dispatchEvent(new CustomEvent("motoclube:marketplace-closed", { detail: updated }));
                await router.navigate("marketplace", { replace: true });
            } catch (error) {
                showToast({ type: "error", message: error.message || "Não foi possível encerrar o anúncio." });
            }
        });
    });
}

export function initializeProductDetail(data = {}) {
    renderProductDetail(data);
}



