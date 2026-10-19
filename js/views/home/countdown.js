/**
 * Motoclube
 * View Component: Countdown
 *
 * Responsável por:
 * - Exibir o próximo evento
 * - Atualizar contagem regressiva
 * - Abrir o evento ao tocar no card
 */

import { router } from "../../core/router.js";


let countdownTimer = null;


/* =========================================================
   RENDER
========================================================= */

export function renderCountdown(event) {

    stopCountdown();

    if (!event) {
        return `
            <button type="button" class="countdown-card countdown-card--empty" data-countdown-empty aria-label="Abrir eventos">

                <div class="countdown-card__icon">
                    <span data-icon="calendar"></span>
                </div>

                <div class="countdown-card__content">

                    <span class="countdown-card__eyebrow">
                        PRÓXIMO EVENTO
                    </span>

                    <h2 class="countdown-card__title">
                        Nenhum evento programado
                    </h2>

                    <p class="countdown-card__description">
                        Quando houver um novo evento, ele aparecerá aqui.
                    </p>

                </div>

            </button>
        `;
    }


    const eventDate = getEventDate(event);

    if (!eventDate) {
        return renderInvalidCountdown(event);
    }


    return `
        <button
            type="button"
            class="countdown-card"
            data-countdown-event="${escapeAttribute(event.id)}"
            aria-label="Abrir evento ${escapeAttribute(event.title || "Próximo evento")}"
        >

            <div class="countdown-card__top">

                <div class="countdown-card__event-icon">
                    <span data-icon="event"></span>
                </div>

                <div class="countdown-card__heading">

                    <span class="countdown-card__eyebrow">
                        PRÓXIMO EVENTO
                    </span>

                    <h2 class="countdown-card__title">
                        ${escapeHtml(event.title || "Evento")}
                    </h2>

                </div>

                <span class="countdown-card__arrow">
                    <span data-icon="arrow-right"></span>
                </span>

            </div>


            <div class="countdown-card__date">

                <span data-icon="calendar"></span>

                <span>
                    ${formatDate(eventDate)}
                </span>

                <span class="countdown-card__separator">
                    •
                </span>

                <span>
                    ${formatTime(eventDate)}
                </span>

            </div>


            <div
                class="countdown-card__timer"
                data-countdown-timer
            >
                ${renderTimer(eventDate)}
            </div>

        </button>
    `;
}


/* =========================================================
   INITIALIZE
========================================================= */

export function initializeCountdown(container, event) {

    if (!container || !event) {
        return;
    }

    const eventDate = getEventDate(event);

    if (!eventDate) {
        return;
    }


    const card = container.querySelector(
        "[data-countdown-event]"
    );


    card?.addEventListener("click", () => {

        if (!event.id) {
            return;
        }

        router.navigate(
            "events",
            {
                eventId: event.id
            }
        );

    });


    const timerElement =
        container.querySelector(
            "[data-countdown-timer]"
        );


    if (!timerElement) {
        return;
    }


    updateTimer(timerElement, eventDate);


    countdownTimer = setInterval(() => {

        updateTimer(
            timerElement,
            eventDate
        );

    }, 1000);
}


/* =========================================================
   TIMER
========================================================= */

function updateTimer(element, targetDate) {

    const now = Date.now();

    const difference =
        targetDate.getTime() - now;


    if (difference <= 0) {

        element.innerHTML = `
            <div class="countdown-card__expired">
                EVENTO INICIADO
            </div>
        `;

        stopCountdown();

        return;
    }


    const totalSeconds =
        Math.floor(difference / 1000);


    const days =
        Math.floor(
            totalSeconds / 86400
        );


    const hours =
        Math.floor(
            (totalSeconds % 86400) / 3600
        );


    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );


    const seconds =
        totalSeconds % 60;


    element.innerHTML = `
        <div class="countdown-card__compact-timer" aria-label="${pad(days)} dias, ${pad(hours)} horas, ${pad(minutes)} minutos e ${pad(seconds)} segundos">
            <span class="countdown-card__unit"><strong>${pad(days)}</strong><small>Dias</small></span>
            <i>:</i>
            <span class="countdown-card__unit"><strong>${pad(hours)}</strong><small>Horas</small></span>
            <i>:</i>
            <span class="countdown-card__unit"><strong>${pad(minutes)}</strong><small>Minutos</small></span>
            <i>:</i>
            <span class="countdown-card__unit"><strong>${pad(seconds)}</strong><small>Segundos</small></span>
        </div>
    `;
}


/* =========================================================
   STOP
========================================================= */

export function stopCountdown() {

    if (countdownTimer) {

        clearInterval(
            countdownTimer
        );

        countdownTimer = null;
    }
}


/* =========================================================
   HELPERS
========================================================= */

function getEventDate(event) {

    const value =
        event.dateTime ||
        event.startAt ||
        event.startDate ||
        event.date;


    if (!value) {
        return null;
    }


    const date =
        value instanceof Date
            ? value
            : new Date(value);


    if (Number.isNaN(date.getTime())) {
        return null;
    }


    return date;
}


function renderTimer(date) {
    const difference = Math.max(0, date.getTime() - Date.now());
    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `
        <div class="countdown-card__compact-timer" aria-label="${pad(days)} dias, ${pad(hours)} horas, ${pad(minutes)} minutos e ${pad(seconds)} segundos">
            <span class="countdown-card__unit"><strong>${pad(days)}</strong><small>Dias</small></span>
            <i>:</i>
            <span class="countdown-card__unit"><strong>${pad(hours)}</strong><small>Horas</small></span>
            <i>:</i>
            <span class="countdown-card__unit"><strong>${pad(minutes)}</strong><small>Minutos</small></span>
            <i>:</i>
            <span class="countdown-card__unit"><strong>${pad(seconds)}</strong><small>Segundos</small></span>
        </div>
    `;
}


function renderInvalidCountdown(event) {

    return `
        <section
            class="countdown-card countdown-card--invalid"
        >

            <div class="countdown-card__event-icon">
                <span data-icon="event"></span>
            </div>

            <div class="countdown-card__content">

                <span class="countdown-card__eyebrow">
                    PRÓXIMO EVENTO
                </span>

                <h2 class="countdown-card__title">
                    ${escapeHtml(event.title || "Evento")}
                </h2>

                <p class="countdown-card__description">
                    Data do evento indisponível.
                </p>

            </div>

        </section>
    `;
}


function formatDate(date) {

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    ).format(date);
}


function formatTime(date) {

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);
}


function pad(value) {

    return String(value)
        .padStart(2, "0");
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