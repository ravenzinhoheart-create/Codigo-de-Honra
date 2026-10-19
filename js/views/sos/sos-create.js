// =========================================================
// MOTOCLUBE
// SOS Quick Dial — Emergency Carousel
// Clean / Urgent / Greaser Premium
// =========================================================

import { router } from "../../core/router.js";
import { showToast } from "../../components/toast.js";
import { icon } from "../../icons/icons.js";
import { session } from "../../core/session.js";
import { createSOS } from "../../services/sos.js";
import { getCurrentLocation, normalizeLocation } from "../../services/location.js";

const SOS_TYPES = Object.freeze([
    {
        id: "conflict",
        label: "Conflito",
        short: "Preciso de apoio",
        description: "Situação de conflito ou ameaça.",
        icon: "conflict"
    },
    {
        id: "motorcycle_breakdown",
        label: "Pane na moto",
        short: "Minha moto parou",
        description: "Pane mecânica ou problema que impede a viagem.",
        icon: "motorcycle-breakdown"
    },
    {
        id: "accident",
        label: "Acidente",
        short: "Sofri um acidente",
        description: "Acidente de trânsito ou queda.",
        icon: "accident"
    },
    {
        id: "natural_cause",
        label: "Causa natural",
        short: "Preciso de ajuda",
        description: "Mal-estar ou emergência de causa natural.",
        icon: "natural-cause"
    },
    {
        id: "other",
        label: "Outro",
        short: "Outra emergência",
        description: "Descreva rapidamente o que aconteceu.",
        icon: "alert",
        requiresDetails: true
    }
]);

const STYLE_ID = "motoclube-sos-quick-dial-style";

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderIcon(name, size = 26) {
    return icon(name, {
        size,
        decorative: true
    });
}

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .sos-quick-dial {
            --sos-red: #c94742;
            --sos-red-soft: rgba(201,71,66,.12);
            position: relative;
            width: 100%;
            color: #f1eeee;
            overflow: hidden;
            isolation: isolate;
            background:
                radial-gradient(circle at 50% 0%, rgba(115,32,30,.065), transparent 44%),
                linear-gradient(180deg, rgba(25,24,22,.34), rgba(12,13,12,.18));
            border: 0;
            border-radius: 0 0 28px 28px;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.018);
            backdrop-filter: blur(28px) saturate(1.15);
            -webkit-backdrop-filter: blur(28px) saturate(1.15);
        }

        .sos-quick-dial::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: repeating-linear-gradient(135deg, rgba(255,255,255,.014) 0 1px, transparent 1px 7px);
            opacity: .20;
            -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 9%, #000 91%, transparent 100%);
            mask-image: linear-gradient(to bottom, transparent 0%, #000 9%, #000 91%, transparent 100%);
            z-index: -1;
        }

        .sos-quick-dial__head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            padding: 18px 18px 8px;
        }

        .sos-quick-dial__eyebrow {
            display: block;
            margin-bottom: 4px;
            color: rgba(255,170,166,.72);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .18em;
        }

        .sos-quick-dial__title {
            margin: 0;
            font-size: 25px;
            line-height: 1.05;
            letter-spacing: -.035em;
        }

        .sos-quick-dial__subtitle {
            margin: 7px 0 0;
            color: rgba(255,235,235,.62);
            font-size: 12px;
        }

        .sos-quick-dial__status {
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            color: #fff;
            background: rgba(201,71,66,.075);
            border: 1px solid rgba(201,71,66,.24);
            box-shadow: 0 0 22px rgba(201,71,66,.10);
        }

        .sos-quick-dial__carousel {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            overscroll-behavior-x: contain;
            scrollbar-width: none;
            padding: 14px 18px 12px;
        }

        .sos-quick-dial__carousel::-webkit-scrollbar { display: none; }

        .sos-quick-card {
            position: relative;
            flex: 0 0 calc(100% - 76px);
            aspect-ratio: 1 / 1;
            min-height: 0;
            scroll-snap-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 10px;
            padding: 18px;
            border: 1px solid rgba(255,255,255,.09);
            border-radius: 22px;
            background: linear-gradient(145deg, rgba(31,23,23,.94), rgba(16,14,14,.92));
            box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 16px 35px rgba(0,0,0,.24);
            text-align: center;
            color: inherit;
            cursor: pointer;
            transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease, background .22s ease;
        }

        .sos-quick-card.is-selected {
            transform: translateY(-2px);
            border-color: rgba(229,57,53,.55);
            background: linear-gradient(145deg, rgba(63,20,20,.96), rgba(22,13,13,.94));
            box-shadow: inset 0 1px 0 rgba(255,180,175,.08), 0 18px 45px rgba(160,0,0,.20), 0 0 0 1px rgba(229,57,53,.07);
        }

        .sos-quick-card__top {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
        }

        .sos-quick-card__glyph {
            display: grid;
            place-items: center;
            width: 82px;
            height: 82px;
            border-radius: 22px;
            color: #fff;
            background: rgba(201,71,66,.16);
            border: 1px solid rgba(224,104,99,.30);
            box-shadow: 0 0 26px rgba(201,71,66,.12);
        }

        .sos-quick-card__check {
            display: grid;
            place-items: center;
            position: absolute;
            top: 0;
            right: 0;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,.18);
            background: rgba(0,0,0,.16);
            opacity: .55;
        }

        .sos-quick-card.is-selected .sos-quick-card__check {
            opacity: 1;
            border-color: rgba(255,150,145,.8);
            background: #e53935;
            box-shadow: 0 0 18px rgba(229,57,53,.35);
        }

        .sos-quick-card__name {
            margin: 0;
            font-size: 16px;
            line-height: 1.15;
            letter-spacing: -.015em;
        }

        .sos-quick-card__description {
            margin: 0;
            max-width: 88%;
            color: rgba(255,235,235,.50);
            font-size: 10.5px;
            line-height: 1.35;
        }

        .sos-quick-card__hint {
            color: rgba(255,190,186,.56);
            font-size: 9.5px;
            font-weight: 700;
        }

        .sos-quick-dial__dots {
            display: flex;
            justify-content: center;
            gap: 6px;
            padding: 2px 0 11px;
        }

        .sos-quick-dial__dot {
            width: 5px;
            height: 5px;
            padding: 0;
            border: 0;
            border-radius: 50%;
            background: rgba(255,255,255,.24);
            transition: width .2s ease, background .2s ease;
        }

        .sos-quick-dial__dot.is-active {
            width: 18px;
            border-radius: 999px;
            background: #e53935;
        }

        .sos-quick-dial__details {
            margin: 0 18px 12px;
            padding: 13px;
            border-radius: 17px;
            background: rgba(0,0,0,.18);
            border: 1px solid rgba(255,255,255,.08);
        }

        .sos-quick-dial__details[hidden] { display: none; }

        .sos-quick-dial__details label {
            display: block;
            margin-bottom: 7px;
            color: rgba(255,200,196,.72);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .12em;
        }

        .sos-quick-dial__details textarea {
            width: 100%;
            min-height: 72px;
            resize: none;
            border: 0;
            outline: 0;
            color: #fff;
            background: transparent;
            font: inherit;
            font-size: 13px;
        }

        .sos-quick-dial__details textarea::placeholder { color: rgba(255,255,255,.32); }

        .sos-quick-dial__footer {
            padding: 7px 18px 18px;
        }

        .sos-quick-dial__vehicle {
            display: flex;
            align-items: center;
            gap: 9px;
            margin-bottom: 11px;
            color: rgba(255,235,235,.5);
            font-size: 11px;
        }

        .sos-quick-dial__vehicle strong { color: rgba(255,240,240,.8); }

        .sos-quick-dial__emit {
            width: 100%;
            min-height: 56px;
            border: 1px solid rgba(255,170,166,.28);
            border-radius: 18px;
            color: #fff;
            background: linear-gradient(180deg, #c74a45, #a93632);
            box-shadow: 0 12px 28px rgba(100,0,0,.18), inset 0 1px 0 rgba(255,255,255,.13);
            font: inherit;
            font-weight: 900;
            letter-spacing: .01em;
            cursor: pointer;
            transition: transform .15s ease, filter .15s ease;
        }

        .sos-quick-dial__emit:active { transform: scale(.985); }
        .sos-quick-dial__emit:disabled { opacity: .45; filter: saturate(.5); cursor: default; box-shadow: none; }

        .sos-quick-dial__footnote {
            margin: 8px 3px 0;
            text-align: center;
            color: rgba(255,220,220,.38);
            font-size: 9px;
            line-height: 1.35;
        }
    `;
    document.head.appendChild(style);
}

function vehicleName(vehicle) {
    if (!vehicle || vehicle.type === "on_foot") return "A pé";
    if (vehicle.type === "motorcycle") return vehicle.model || "Motocicleta";
    if (vehicle.type === "car") return vehicle.model || "Carro";
    return vehicle.model || "Veículo";
}

export function renderSosCreate(data = {}) {
    injectStyles();

    const container = document.createElement("section");
    container.className = "sos-quick-dial";

    let user = data.user || {};

    // A view também consulta a sessão diretamente.
    // Assim, o bloqueio não depende do router lembrar de passar o usuário.
    try {
        const authenticatedUser = session.getUser?.();

        if (authenticatedUser && typeof authenticatedUser === "object") {
            user = { ...authenticatedUser, ...user };
        }
    } catch (error) {
        console.warn("[SOS] Não foi possível consultar a sessão:", error);
    }

    const vehicle = data.currentVehicle || user.currentVehicle || { type: "on_foot", id: null, name: "A pé" };

    // OFF é o único estado que não pode emitir SOS.
    const normalizedStatus = String(
        user.status ||
        data.status ||
        ""
    ).trim().toLowerCase();

    if (normalizedStatus === "off") {
        container.innerHTML = `
            <div class="sos-quick-dial__head">
                <div>
                    <span class="sos-quick-dial__eyebrow">EMERGÊNCIA</span>
                    <h1 class="sos-quick-dial__title">SOS indisponível</h1>
                    <p class="sos-quick-dial__subtitle">Seu status está Off. Ative o On para poder pedir ajuda.</p>
                </div>
                <div class="sos-quick-dial__status" aria-hidden="true">${renderIcon("sos", 22)}</div>
            </div>
            <div class="sos-quick-dial__footer">
                <button type="button" class="sos-quick-dial__emit" data-action="back">Voltar</button>
            </div>
        `;
        container.querySelector('[data-action="back"]')?.addEventListener("click", close);
        return container;
    }

    let selectedType = SOS_TYPES[0];

    container.innerHTML = `
        <header class="sos-quick-dial__head">
            <div>
                <span class="sos-quick-dial__eyebrow">QUICK DIAL · EMERGÊNCIA</span>
                <h1 class="sos-quick-dial__title">Precisa de ajuda?</h1>
                <p class="sos-quick-dial__subtitle">Deslize, escolha o que aconteceu e emita.</p>
            </div>
            <div class="sos-quick-dial__status" aria-hidden="true">${renderIcon("sos", 22)}</div>
        </header>

        <div class="sos-quick-dial__carousel" id="sos-carousel" aria-label="Tipos de SOS">
            ${SOS_TYPES.map((type, index) => `
                <button
                    type="button"
                    class="sos-quick-card${index === 0 ? " is-selected" : ""}"
                    data-sos-type="${type.id}"
                    aria-pressed="${index === 0 ? "true" : "false"}"
                >
                    <div class="sos-quick-card__top">
                        <span class="sos-quick-card__glyph">${renderIcon(type.icon, 28)}</span>
                        <span class="sos-quick-card__check" aria-hidden="true">${index === 0 ? renderIcon("check", 13) : ""}</span>
                    </div>
                    <div>
                        <h2 class="sos-quick-card__name">${escapeHTML(type.label)}</h2>
                        <p class="sos-quick-card__description">${escapeHTML(type.description)}</p>
                    </div>
                    <span class="sos-quick-card__hint">${escapeHTML(type.short)}</span>
                </button>
            `).join("")}
        </div>

        <div class="sos-quick-dial__dots" aria-hidden="true">
            ${SOS_TYPES.map((type, index) => `<span class="sos-quick-dial__dot${index === 0 ? " is-active" : ""}" data-dot="${index}"></span>`).join("")}
        </div>

        <section class="sos-quick-dial__details" id="sos-other-details" hidden>
            <label for="sos-description">O QUE ESTÁ ACONTECENDO?</label>
            <textarea id="sos-description" maxlength="500" placeholder="Escreva só o essencial para a galera entender e agir."></textarea>
        </section>

        <footer class="sos-quick-dial__footer">
            <div class="sos-quick-dial__vehicle">
                ${vehicle.type === "motorcycle" ? renderIcon("motorcycle", 18) : vehicle.type === "car" ? renderIcon("car", 18) : renderIcon("sos", 18)}
                <span>Veículo: <strong>${escapeHTML(vehicleName(vehicle))}</strong></span>
            </div>

            <button type="button" class="sos-quick-dial__emit" id="sos-submit">
                EMITIR SOS
            </button>

            <p class="sos-quick-dial__footnote">O chamado será enviado aos membros elegíveis e a localização poderá ser compartilhada pelo serviço de SOS.</p>
        </footer>
    `;

    const carousel = container.querySelector("#sos-carousel");
    const details = container.querySelector("#sos-other-details");
    const description = container.querySelector("#sos-description");
    const submit = container.querySelector("#sos-submit");
    const cards = [...container.querySelectorAll("[data-sos-type]")];
    const dots = [...container.querySelectorAll("[data-dot]")];

    function selectType(type, shouldScroll = false) {
        selectedType = type;

        cards.forEach(card => {
            const active = card.dataset.sosType === type.id;
            card.classList.toggle("is-selected", active);
            card.setAttribute("aria-pressed", String(active));

            const check = card.querySelector(".sos-quick-card__check");
            if (check) check.innerHTML = active ? renderIcon("check", 13) : "";
        });

        const index = SOS_TYPES.findIndex(item => item.id === type.id);
        dots.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));

        details.hidden = !type.requiresDetails;

        if (!type.requiresDetails && description) {
            description.value = "";
        }

        submit.disabled = Boolean(type.requiresDetails && !description?.value.trim());

        if (shouldScroll) {
            cards[index]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }

    cards.forEach(card => {
        card.addEventListener("click", () => {
            const type = SOS_TYPES.find(item => item.id === card.dataset.sosType);
            if (type) selectType(type);
        });
    });

    let scrollTimer;
    carousel.addEventListener("scroll", () => {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(() => {
            const center = carousel.scrollLeft + carousel.clientWidth / 2;
            let nearest = cards[0];
            let distance = Infinity;

            cards.forEach(card => {
                const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                const currentDistance = Math.abs(cardCenter - center);
                if (currentDistance < distance) {
                    distance = currentDistance;
                    nearest = card;
                }
            });

            const type = SOS_TYPES.find(item => item.id === nearest?.dataset.sosType);
            if (type) selectType(type);
        }, 70);
    }, { passive: true });

    description?.addEventListener("input", () => {
        submit.disabled = selectedType.requiresDetails && !description.value.trim();
    });

    submit.addEventListener("click", async () => {
        const detailsText = description?.value.trim() || "";

        if (selectedType.requiresDetails && !detailsText) {
            description?.focus();
            showToast({ type: "warning", message: "Descreva rapidamente o que aconteceu." });
            return;
        }

        submit.disabled = true;

        try {
            let gpsLocation = null;
            try {
                gpsLocation = normalizeLocation(await getCurrentLocation({ enableHighAccuracy: true, timeout: 5000, maximumAge: 15000 }));
            } catch (gpsError) {
                console.warn("[SOS] Não foi possível obter a localização antes da emissão:", gpsError);
            }

            const sos = await createSOS({
                type: selectedType.id,
                description: detailsText,
                vehicle: JSON.parse(JSON.stringify(vehicle)),
                latitude: gpsLocation?.latitude ?? null,
                longitude: gpsLocation?.longitude ?? null,
                location: gpsLocation ? { latitude: gpsLocation.latitude, longitude: gpsLocation.longitude, accuracy: gpsLocation.accuracy } : null
            });

            container.dispatchEvent(new CustomEvent("sos:create", {
                bubbles: true,
                detail: sos
            }));

            showToast({ type: "success", message: "SOS emitido. Ajuda solicitada." });

            if (typeof data.onClose === "function") {
                data.onClose();
            }
        } catch (error) {
            submit.disabled = false;
            showToast({ type: "error", message: error.message || "Não foi possível emitir o SOS." });
        }
    });

    function close() {
        if (typeof data.onClose === "function") {
            data.onClose();
            return;
        }
        router.back();
    }

    selectType(selectedType);
    return container;
}
