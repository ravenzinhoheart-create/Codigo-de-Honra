import {
    openBottomSheet
} from "../../components/bottom-sheet.js";

import {
    icon
} from "../../icons/icons.js";

import {
    showToast
} from "../../components/toast.js";

import {
    session
} from "../../core/session.js";

import {
    events as eventBus
} from "../../core/events.js";

import {
    createEvent
} from "../../services/events.js";

import {
    getLocationSuggestions,
    createTypedLocationSuggestion,
    rememberLocation
} from "../../utils/location-autocomplete.js";


// =========================================================
// HELPERS
// =========================================================

function escapeHTML(
    value = ""
) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


function todayISO() {

    const now =
        new Date();

    const offset =
        now.getTimezoneOffset();


    return new Date(
        now.getTime() -
        offset * 60000
    )
        .toISOString()
        .slice(
            0,
            10
        );

}


function getDateTimeValue(
    date,
    time
) {

    if (
        !date ||
        !time
    ) {

        return null;

    }


    return `${date}T${time}:00`;

}


// =========================================================
// LOCATION SUGGESTION
// =========================================================

function renderSuggestion(
    item
) {

    let typeIcon =
        "pin";


    if (
        item.type === "recent"
    ) {

        typeIcon =
            "clock";

    } else if (
        item.type === "club"
    ) {

        typeIcon =
            "shield";

    }


    return `

        <button
            type="button"
            class="event-location-suggestion"
            data-location-title="${escapeHTML(
                item.title
            )}"
            data-location-subtitle="${escapeHTML(
                item.subtitle || ""
            )}"
        >

            <span
                class="event-location-suggestion__icon"
            >
                ${icon(
                    typeIcon,
                    {
                        size: 18,
                        decorative: true
                    }
                )}
            </span>


            <span
                class="event-location-suggestion__text"
            >

                <strong>
                    ${escapeHTML(
                        item.title
                    )}
                </strong>

                ${
                    item.subtitle

                        ? `
                            <small>
                                ${escapeHTML(
                                    item.subtitle
                                )}
                            </small>
                        `

                        : ""
                }

            </span>


            <span
                class="event-location-suggestion__arrow"
            >
                ${icon(
                    "chevronRight",
                    {
                        size: 17,
                        decorative: true
                    }
                )}
            </span>

        </button>

    `;

}


// =========================================================
// OPEN BOTTOM SHEET
// =========================================================

export function openEventCreateSheet() {

    const sheet =
        openBottomSheet({

            title:
                "Novo evento",

            className:
                "bottom-sheet--event-create",

            content: `

                <form
                    class="event-create-sheet"
                    id="event-create-sheet-form"
                    novalidate
                >

                    <!-- INTRO -->

                    <div
                        class="event-create-sheet__intro"
                    >

                        <span
                            class="event-create-sheet__mark"
                        >
                            ${icon(
                                "calendar",
                                {
                                    size: 21,
                                    decorative: true
                                }
                            )}
                        </span>


                        <div>

                            <strong>
                                Organize o próximo rolê.
                            </strong>

                            <span>
                                Defina os detalhes
                                e deixe o clube saber.
                            </span>

                        </div>

                    </div>


                    <!-- NOME -->

                    <div
                        class="event-create-sheet__field"
                    >

                        <label
                            for="event-sheet-title"
                        >
                            Nome do evento
                        </label>


                        <input
                            id="event-sheet-title"
                            name="title"
                            type="text"
                            maxlength="100"
                            autocomplete="off"
                            placeholder="Ex.: Serra no domingo"
                            required
                        >

                    </div>


                    <!-- DATA / HORA -->

                    <div
                        class="event-create-sheet__grid"
                    >

                        <div
                            class="event-create-sheet__field"
                        >

                            <label
                                for="event-sheet-date"
                            >
                                Data
                            </label>


                            <input
                                id="event-sheet-date"
                                name="date"
                                type="date"
                                min="${todayISO()}"
                                required
                            >

                        </div>


                        <div
                            class="event-create-sheet__field"
                        >

                            <label
                                for="event-sheet-time"
                            >
                                Horário
                            </label>


                            <input
                                id="event-sheet-time"
                                name="time"
                                type="time"
                                required
                            >

                        </div>

                    </div>


                    <!-- LOCAL -->

                    <div
                        class="
                            event-create-sheet__field
                            event-create-sheet__location-field
                        "
                    >

                        <label
                            for="event-sheet-location"
                        >
                            Local
                        </label>


                        <div
                            class="event-location-input-wrap"
                        >

                            <span
                                class="event-location-input-icon"
                            >
                                ${icon(
                                    "pin",
                                    {
                                        size: 19,
                                        decorative: true
                                    }
                                )}
                            </span>


                            <input
                                id="event-sheet-location"
                                name="location"
                                type="text"
                                maxlength="160"
                                autocomplete="off"
                                placeholder="Digite o endereço ou ponto de encontro"
                            >


                            <button
                                type="button"
                                class="event-location-clear"
                                aria-label="Limpar local"
                                hidden
                            >
                                ${icon(
                                    "close",
                                    {
                                        size: 17,
                                        decorative: true
                                    }
                                )}
                            </button>

                        </div>


                        <div
                            id="event-location-suggestions"
                            class="event-location-suggestions"
                            hidden
                            role="listbox"
                            aria-label="Sugestões de local"
                        ></div>

                    </div>


                    <!-- DESCRIÇÃO -->

                    <div
                        class="event-create-sheet__field"
                    >

                        <label
                            for="event-sheet-description"
                        >
                            Descrição
                        </label>


                        <textarea
                            id="event-sheet-description"
                            name="description"
                            maxlength="2000"
                            rows="4"
                            placeholder="Roteiro, ponto de saída, recomendações..."
                        ></textarea>

                    </div>


                    <!-- STATUS -->

                    <div
                        class="event-create-sheet__field"
                    >

                        <label
                            for="event-sheet-status"
                        >
                            Status
                        </label>


                        <div
                            class="event-status-select-wrap"
                        >

                            <select
                                id="event-sheet-status"
                                name="status"
                            >

                                <option value="planning">
                                    Em planejamento
                                </option>

                                <option value="confirmed">
                                    Confirmado
                                </option>

                            </select>


                            ${icon(
                                "chevronDown",
                                {
                                    size: 18,
                                    decorative: true
                                }
                            )}

                        </div>

                    </div>


                    <!-- AVISO -->

                    <div
                        class="event-create-sheet__notice"
                    >

                        <span
                            class="event-create-sheet__notice-icon"
                        >
                            ${icon(
                                "info",
                                {
                                    size: 17,
                                    decorative: true
                                }
                            )}
                        </span>


                        <span>
                            O veículo usado no evento
                            é definido separadamente
                            quando você confirmar presença.
                        </span>

                    </div>


                    <!-- ACTIONS -->

                    <div
                        class="event-create-sheet__actions"
                    >

                        <button
                            type="button"
                            class="event-create-sheet__cancel"
                            data-event-sheet-cancel
                        >
                            Cancelar
                        </button>


                        <button
                            type="submit"
                            class="event-create-sheet__submit"
                        >

                            <span>
                                Criar evento
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

            `

        });


    if (
        !sheet?.element
    ) {

        return sheet;

    }


    const root =
        sheet.element;


    const form =
        root.querySelector(
            "#event-create-sheet-form"
        );


    const locationInput =
        root.querySelector(
            "#event-sheet-location"
        );


    const suggestions =
        root.querySelector(
            "#event-location-suggestions"
        );


    const clearButton =
        root.querySelector(
            ".event-location-clear"
        );


    let selectedLocation =
        null;


    // =====================================================
    // SUGESTÕES
    // =====================================================

    function hideSuggestions() {

        if (!suggestions) {
            return;
        }


        suggestions.hidden =
            true;


        suggestions.innerHTML =
            "";

    }


    function showSuggestions(
        query
    ) {

        if (!suggestions) {
            return;
        }


        const local =
            getLocationSuggestions(
                query
            );


        const typed =
            createTypedLocationSuggestion(
                query
            );


        const items =
            typed
                ? [
                    ...local,
                    typed
                ]
                : local;


        if (
            !items.length
        ) {

            hideSuggestions();

            return;

        }


        suggestions.innerHTML =
            items
                .map(
                    renderSuggestion
                )
                .join("");


        suggestions.hidden =
            false;


        suggestions
            .querySelectorAll(
                ".event-location-suggestion"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const title =
                                button.dataset
                                    .locationTitle ||
                                "";


                            const subtitle =
                                button.dataset
                                    .locationSubtitle ||
                                "";


                            locationInput.value =
                                title;


                            selectedLocation = {

                                title,

                                subtitle

                            };


                            clearButton.hidden =
                                !title;


                            hideSuggestions();

                        }
                    );

                }
            );

    }


    // =====================================================
    // LOCATION INPUT
    // =====================================================

    locationInput?.addEventListener(
        "focus",
        () => {

            showSuggestions(
                locationInput.value
            );

        }
    );


    locationInput?.addEventListener(
        "input",
        () => {

            selectedLocation =
                null;


            clearButton.hidden =
                !locationInput.value.trim();


            showSuggestions(
                locationInput.value
            );

        }
    );


    clearButton?.addEventListener(
        "click",
        () => {

            locationInput.value =
                "";


            selectedLocation =
                null;


            clearButton.hidden =
                true;


            hideSuggestions();


            locationInput.focus();

        }
    );


    // =====================================================
    // FECHAR SUGESTÕES AO SAIR
    // =====================================================

    document.addEventListener(
        "click",
        event => {

            if (
                !root.contains(
                    event.target
                )
            ) {

                return;

            }


            if (
                !event.target.closest(
                    ".event-create-sheet__location-field"
                )
            ) {

                hideSuggestions();

            }

        }
    );


    // =====================================================
    // CANCELAR
    // =====================================================

    root.querySelector(
        "[data-event-sheet-cancel]"
    )?.addEventListener(
        "click",
        () => {

            sheet.close();

        }
    );


    // =====================================================
    // SUBMIT
    // =====================================================

    form?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const formData =
                new FormData(
                    form
                );


            const title =
                String(
                    formData.get(
                        "title"
                    ) || ""
                ).trim();


            const date =
                String(
                    formData.get(
                        "date"
                    ) || ""
                );


            const time =
                String(
                    formData.get(
                        "time"
                    ) || ""
                );


            const location =
                String(
                    formData.get(
                        "location"
                    ) || ""
                ).trim();


            const description =
                String(
                    formData.get(
                        "description"
                    ) || ""
                ).trim();


            const status =
                String(
                    formData.get(
                        "status"
                    ) ||
                    "planning"
                );


            // =================================================
            // VALIDAÇÃO
            // =================================================

            if (!title) {

                showToast({

                    type:
                        "error",

                    message:
                        "Informe o nome do evento."

                });

                return;

            }


            if (
                !date ||
                !time
            ) {

                showToast({

                    type:
                        "error",

                    message:
                        "Informe a data e o horário."

                });

                return;

            }


            const dateTime =
                getDateTimeValue(
                    date,
                    time
                );


            if (!dateTime) {

                showToast({

                    type:
                        "error",

                    message:
                        "Data ou horário inválido."

                });

                return;

            }


            const timestamp =
                new Date(
                    dateTime
                ).getTime();


            if (
                Number.isNaN(
                    timestamp
                )
            ) {

                showToast({

                    type:
                        "error",

                    message:
                        "Data ou horário inválido."

                });

                return;

            }


            if (
                timestamp <=
                Date.now()
            ) {

                showToast({

                    type:
                        "error",

                    message:
                        "O evento precisa acontecer no futuro."

                });

                return;

            }


            // =================================================
            // USUÁRIO
            // =================================================

            const user =
                session.getUser();


            if (!user) {

                showToast({

                    type:
                        "error",

                    message:
                        "Você precisa estar conectado para criar um evento."

                });

                return;

            }


            // =================================================
            // BLOQUEAR DUPLO ENVIO
            // =================================================

            const submitButton =
                form.querySelector(
                    ".event-create-sheet__submit"
                );


            if (
                submitButton?.disabled
            ) {

                return;

            }


            if (submitButton) {
                submitButton.disabled = true;
                submitButton.classList.add("is-loading");
                const label = submitButton.querySelector("span");
                if (label) label.textContent = "Criando…";
            }


            try {

                // =============================================
                // CRIAR EVENTO
                // =============================================

                const eventData = {

                    title,

                    dateTime,

                    startAt:
                        dateTime,

                    location,

                    locationDetails:
                        selectedLocation,

                    description,

                    status

                };


                const createdEvent =
                    await createEvent(
                        eventData,
                        user
                    );


                // =============================================
                // MEMORIZAR LOCAL
                // =============================================

                if (location) {

                    rememberLocation({

                        title:
                            location,

                        subtitle:
                            selectedLocation
                                ?.subtitle ||
                            "Local usado em evento"

                    });

                }


                // =============================================
                // EVENT BUS
                // =============================================

                eventBus.emit(
                    "event:created",
                    createdEvent
                );


                // =============================================
                // FECHAR
                // =============================================

                sheet.close();


                showToast({

                    type:
                        "success",

                    message:
                        "Evento criado com sucesso."

                });

            } catch (error) {

                console.error(
                    "[EVENT CREATE] Falha ao criar evento:",
                    error
                );


                showToast({

                    type:
                        "error",

                    message:
                        error?.message ||
                        "Não foi possível criar o evento."

                });


                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.classList.remove("is-loading");
                    const label = submitButton.querySelector("span");
                    if (label) label.textContent = "Criar evento";
                }

            }

        }
    );


    // =====================================================
    // RETORNO
    // =====================================================

    return sheet;

}


// =========================================================
// COMPATIBILIDADE COM ROUTER
// =========================================================
//
// Mantemos esses exports porque o router/bootstrap pode
// procurar por renderEventCreate / initializeEventCreate.
// A criação efetiva, porém, acontece pela bottom-sheet.
// =========================================================

export function renderEventCreate(
    data = {}
) {

    return openEventCreateSheet(
        data
    );

}


export function initializeEventCreate(
    data = {}
) {

    return openEventCreateSheet(
        data
    );

}


export default {
    openEventCreateSheet,
    renderEventCreate,
    initializeEventCreate
};