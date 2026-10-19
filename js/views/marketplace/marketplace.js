// =========================================================
// CÓDIGO DE HONRA — MARKETPLACE
// Marketplace: busca + filtro em dropdown + grade 2xN
// Criação de anúncios: somente pelo modal da navbar.
// Negociação: presencial na sede do Motoclub.
// =========================================================

import { session } from "../../core/session.js";
import { getProducts } from "../../services/marketplace.js";
import { icon } from "../../icons/icons.js";
import { events as eventBus } from "../../core/events.js";
import { router } from "../../core/router.js";

const CATEGORIES = Object.freeze([
    { value: "all", label: "Todos" },
    { value: "motorcycles", label: "Motos" },
    { value: "parts_accessories", label: "Peças e acessórios" },
    { value: "equipment", label: "Equipamentos" },
    { value: "supplies", label: "Suprimentos" },
    { value: "other", label: "Outros" },
    { value: "mine", label: "Meus Anúncios" }
]);

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getCurrentUserId() {
    return session.getUser()?.id || null;
}

function getOwnerId(product) {
    return (
        product?.ownerId ||
        product?.sellerId ||
        product?.createdBy?.id ||
        product?.createdBy ||
        null
    );
}

function isSold(product) {
    return (
        product?.sold === true ||
        product?.status === "sold" ||
        product?.status === "vendido" ||
        product?.status === "closed" ||
        product?.status === "encerrado"
    );
}

function normalizeCategory(category) {
    if (category === "others") return "other";
    return category || "other";
}

function getCategoryLabel(category) {
    const normalized = normalizeCategory(category);
    return CATEGORIES.find(item => item.value === normalized)?.label || "Outros";
}

function getProductImage(product) {
    if (Array.isArray(product?.media) && product.media.length) {
        const first = product.media[0];
        return typeof first === "string" ? first : first?.url || null;
    }

    if (Array.isArray(product?.images) && product.images.length) {
        return product.images[0];
    }

    return product?.image || null;
}

function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        return "Consultar";
    }

    return number.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function renderProductCard(product, currentUserId) {
    const image = getProductImage(product);
    const ownerId = getOwnerId(product);
    const isMine = Boolean(
        currentUserId &&
        ownerId &&
        String(currentUserId) === String(ownerId)
    );

    const title = product?.title || product?.name || "Anúncio";

    return `
        <article
            class="market-product ${isMine ? "market-product--mine" : ""}"
            data-product-id="${escapeHTML(product?.id || "")}" 
        >
            <div class="market-product__visual">
                ${image ? `
                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(title)}"
                        loading="lazy"
                    >
                ` : `
                    <div class="market-product__placeholder">
                        ${icon("marketplace", { size: 28, decorative: true })}
                        <small>Sem imagem</small>
                    </div>
                `}

                <span class="market-product__tag">
                    ${escapeHTML(getCategoryLabel(product?.category))}
                </span>

                ${isMine ? `
                    <span class="market-product__mine">Meu anúncio</span>
                ` : ""}
            </div>

            <div class="market-product__body">
                <span class="market-product__category">
                    ${escapeHTML(getCategoryLabel(product?.category))}
                </span>

                <h2>${escapeHTML(title)}</h2>

                <span class="market-product__seller">
                    ${escapeHTML(
                        product?.sellerUsername ||
                        product?.seller?.username ||
                        "Membro"
                    )}
                </span>

                <strong class="market-product__price">
                    ${formatPrice(product?.price)}
                </strong>
            </div>
        </article>
    `;
}

function matchesFilter(product, category, currentUserId) {
    if (isSold(product)) return false;

    const productCategory = normalizeCategory(product?.category);

    if (category === "mine") {
        return Boolean(
            currentUserId &&
            String(getOwnerId(product)) === String(currentUserId)
        );
    }

    if (category === "all") return true;

    return productCategory === category;
}

function matchesSearch(product, search) {
    const normalized = String(search || "")
        .trim()
        .toLocaleLowerCase("pt-BR");

    if (!normalized) return true;

    return [
        product?.title,
        product?.name,
        product?.description,
        getCategoryLabel(product?.category),
        product?.location
    ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalized);
}

export async function renderMarketplace(container) {
    // O Router entrega explicitamente o #app-view para views marcadas
    // como containerRenderer. Mantemos o fallback para chamadas diretas.
    const root =
        container && typeof container.querySelector === "function"
            ? container
            : document.querySelector("#app-view");

    if (!root) {
        throw new Error("Elemento #app-view não encontrado para o Marketplace.");
    }

    let products = [];
    let search = "";
    let category = "all";
    let filterOpen = false;

    const currentUserId = getCurrentUserId();

    try {
        products = await getProducts();
    } catch (error) {
        console.error("[MARKETPLACE] Falha ao carregar anúncios:", error);
        products = [];
    }

    function filteredProducts() {
        return products.filter(product =>
            matchesFilter(product, category, currentUserId) &&
            matchesSearch(product, search)
        );
    }

    function render() {
        const visible = filteredProducts();
        const selected = CATEGORIES.find(item => item.value === category) || CATEGORIES[0];

        root.innerHTML = `
            <section class="marketplace-view">
                <div class="marketplace-shell">
                    <header class="marketplace-toolbar">
                        <div class="marketplace-heading">
                            <span class="marketplace-kicker">Código de Honra</span>
                            <h1>Marketplace</h1>
                            <p>Peças, máquinas e equipamentos entre membros.</p>
                        </div>
                    </header>

                    <div class="marketplace-search-row">
                        <label class="marketplace-search" aria-label="Buscar anúncios">
                            ${icon("search", { size: 18, decorative: true })}
                            <input
                                id="marketplace-search"
                                type="search"
                                placeholder="Buscar no mercado..."
                                autocomplete="off"
                                value="${escapeHTML(search)}"
                            >
                            <button
                                type="button"
                                class="marketplace-search__clear"
                                data-action="clear-search"
                                aria-label="Limpar busca"
                                ${search ? "" : "hidden"}
                            >
                                ${icon("close", { size: 17, decorative: true })}
                            </button>
                        </label>

                        <div class="marketplace-filter-wrap">
                            <button
                                type="button"
                                class="marketplace-filter-button ${filterOpen ? "is-open" : ""}"
                                data-action="toggle-filter"
                                aria-label="Filtrar anúncios"
                                aria-expanded="${filterOpen ? "true" : "false"}"
                            >
                                ${icon("filter", { size: 19, decorative: true })}
                            </button>

                            <div
                                class="marketplace-filter-dropdown ${filterOpen ? "is-open" : ""}"
                                ${filterOpen ? "" : "hidden"}
                                role="menu"
                            >
                                ${CATEGORIES.map(item => `
                                    <button
                                        type="button"
                                        class="market-filter-option ${category === item.value ? "is-active" : ""}"
                                        data-category="${item.value}"
                                        role="menuitem"
                                    >
                                        <span>${escapeHTML(item.label)}</span>
                                        ${category === item.value ? icon("check", { size: 16, decorative: true }) : ""}
                                    </button>
                                `).join("")}
                            </div>
                        </div>
                    </div>

                    <div class="marketplace-current-filter">
                        <span>Filtro</span>
                        <strong>${escapeHTML(selected.label)}</strong>
                    </div>

                    <div class="marketplace-grid" data-marketplace-results>
                        ${visible.length
                            ? visible.map(product => renderProductCard(product, currentUserId)).join("")
                            : `
                                <div class="marketplace-empty">
                                    ${icon("marketplace", { size: 28, decorative: true })}
                                    <strong>Nenhum anúncio encontrado</strong>
                                    <span>Tente outra busca ou categoria.</span>
                                </div>
                            `
                        }
                    </div>
                </div>
            </section>
        `;

        bind();
    }

    function bind() {
        const input = root.querySelector("#marketplace-search");
        const clear = root.querySelector("[data-action='clear-search']");
        const filterButton = root.querySelector("[data-action='toggle-filter']");

        input?.addEventListener("input", () => {
            search = input.value;
            render();
            const next = root.querySelector("#marketplace-search");
            next?.focus();
            next?.setSelectionRange(next.value.length, next.value.length);
        });

        clear?.addEventListener("click", () => {
            search = "";
            render();
        });

        filterButton?.addEventListener("click", event => {
            event.stopPropagation();
            filterOpen = !filterOpen;
            render();
        });

        root.querySelectorAll("[data-category]").forEach(button => {
            button.addEventListener("click", () => {
                category = button.dataset.category || "all";
                filterOpen = false;
                render();
            });
        });

        root.querySelectorAll("[data-product-id]").forEach(card => {
            card.addEventListener("click", async () => {
                // A negociação é presencial. Não abrimos checkout nem fluxo de venda.
                const id = card.dataset.productId;
                if (!id) return;

                const product = products.find(item => String(item.id) === String(id));
                if (!product) return;

                await router.navigate("product-detail", {
                    product,
                    currentUserId
                });
            });
        });

        document.addEventListener("click", closeOutside, { once: true });
    }

    function closeOutside(event) {
        if (!filterOpen) return;
        if (root.contains(event.target)) return;
        filterOpen = false;
        render();
    }

    render();

    // Mantém o marketplace aberto sincronizado quando um anúncio
    // é criado em outra bottom-sheet.
    eventBus.on("marketplace:created", product => {
        if (router.getCurrentRoute?.() !== "marketplace") return;
        if (!product?.id) return;
        products = [product, ...products.filter(item => item.id !== product.id)];
        render();
    });
}

export async function initializeMarketplace(container) {
    return renderMarketplace(
        container && typeof container.querySelector === "function"
            ? container
            : container?.container
    );
}
