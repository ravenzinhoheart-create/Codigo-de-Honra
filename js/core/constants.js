// =========================================================
// MOTOCLUBE
// Core Constants
// =========================================================

export const APP = Object.freeze({

    NAME: "Codigo de Honra",

    VERSION: "1.1.0",

    ENVIRONMENT: "production",

    MAX_POST_MEDIA: 10,

    POST_MEDIA_ASPECT_RATIO: 1,

    NAVBAR_HEIGHT: 76,

    TOAST_DURATION: 3000,

    ROUTE_TRANSITION_DURATION: 220

});


/*
 * Status geral do membro.
 *
 * OFF:
 * Não recebe SOS e não pode emitir SOS.
 *
 * ON:
 * Pode receber e emitir SOS.
 *
 * RIDE:
 * Pode receber e emitir SOS.
 *
 * SOS:
 * Estado automático enquanto o membro possui
 * um chamado SOS ativo.
 */

export const USER_STATUS = Object.freeze({

    OFF: "off",

    ON: "on",

    RIDE: "ride",

    SOS: "sos"

});


/*
 * Status visuais do usuário.
 */

export const USER_STATUS_META = Object.freeze({

    off: Object.freeze({
        label: "Off",
        colorToken: "--status-off"
    }),

    on: Object.freeze({
        label: "On",
        colorToken: "--status-on"
    }),

    ride: Object.freeze({
        label: "Ride",
        colorToken: "--status-ride"
    }),

    sos: Object.freeze({
        label: "SOS",
        colorToken: "--status-sos"
    })

});


/*
 * Tipos de veículo.
 *
 * "a_pe" NÃO é um veículo cadastrado.
 * É uma opção virtual permanente.
 */

export const VEHICLE_TYPE = Object.freeze({

    MOTORCYCLE: "motorcycle",

    CAR: "car",

    ON_FOOT: "on_foot"

});


export const VEHICLE_META = Object.freeze({

    motorcycle: Object.freeze({
        label: "Moto",
        emoji: "🏍️"
    }),

    car: Object.freeze({
        label: "Carro",
        emoji: "🚗"
    }),

    on_foot: Object.freeze({
        label: "A pé",
        emoji: "🚶"
    })

});


/*
 * Status dos eventos.
 */

export const EVENT_STATUS = Object.freeze({

    PLANNING: "planning",

    CONFIRMED: "confirmed",

    IN_PROGRESS: "in_progress",

    CANCELLED: "cancelled",

    FINISHED: "finished"

});


export const EVENT_STATUS_META = Object.freeze({

    planning: Object.freeze({
        label: "Em planejamento"
    }),

    confirmed: Object.freeze({
        label: "Confirmado"
    }),

    in_progress: Object.freeze({
        label: "Em andamento"
    }),

    cancelled: Object.freeze({
        label: "Cancelado"
    }),

    finished: Object.freeze({
        label: "Finalizado"
    })

});


/*
 * Categorias de SOS.
 */

export const SOS_TYPE = Object.freeze({

    CONFLICT: "conflict",

    MOTORCYCLE_BREAKDOWN: "motorcycle_breakdown",

    ACCIDENT: "accident",

    NATURAL_CAUSE: "natural_cause",

    OTHER: "other"

});


export const SOS_TYPE_META = Object.freeze({

    conflict: Object.freeze({
        label: "Conflito",
        icon: "conflict"
    }),

    motorcycle_breakdown: Object.freeze({
        label: "Pane na moto",
        icon: "motorcycle-breakdown"
    }),

    accident: Object.freeze({
        label: "Acidente",
        icon: "accident"
    }),

    natural_cause: Object.freeze({
        label: "Causa natural",
        icon: "natural-cause"
    }),

    other: Object.freeze({
        label: "Outro",
        icon: "alert"
    })

});


/*
 * Categorias do Marketplace.
 */

export const MARKETPLACE_CATEGORY = Object.freeze({

    MOTORCYCLES: "motorcycles",

    PARTS_ACCESSORIES: "parts_accessories",

    EQUIPMENT: "equipment",

    SUPPLIES: "supplies",

    OTHER: "other"

});


export const MARKETPLACE_CATEGORY_META = Object.freeze({

    motorcycles: Object.freeze({
        label: "Motos"
    }),

    parts_accessories: Object.freeze({
        label: "Peças e acessórios"
    }),

    equipment: Object.freeze({
        label: "Equipamentos"
    }),

    supplies: Object.freeze({
        label: "Suprimentos"
    }),

    other: Object.freeze({
        label: "Outros"
    })

});


/*
 * Tipos de mídia aceitos pelo feed.
 */

export const MEDIA_TYPE = Object.freeze({

    IMAGE: "image",

    VIDEO: "video"

});


/*
 * Limites.
 */

export const LIMITS = Object.freeze({

    POST_MAX_MEDIA: 10,

    USERNAME_MIN_LENGTH: 2,

    USERNAME_MAX_LENGTH: 30,

    PASSWORD_MIN_LENGTH: 6,

    EVENT_TITLE_MAX_LENGTH: 100,

    EVENT_DESCRIPTION_MAX_LENGTH: 2000,

    MARKETPLACE_TITLE_MAX_LENGTH: 100,

    MARKETPLACE_DESCRIPTION_MAX_LENGTH: 3000,

    MAX_VEHICLES_PER_USER: 20

});


/*
 * Rotas públicas.
 */

export const PUBLIC_ROUTES = Object.freeze([

    "login",

    "register"

]);


/*
 * Rotas protegidas.
 */

export const PRIVATE_ROUTES = Object.freeze([

    "home",
    "club",
    "member-profile",
    "events",
    "event-create",
    "event-edit",
    "marketplace",
    "product-detail",
    "product-create",
    "product-edit",
    "profile",
    "settings",
    "vehicles",
    "vehicle-create",
    "vehicle-edit",
    "ride",
    "sos",
    "sos-create",
    "sos-detail",
    "post-create",
    "post-detail"

]);


/*
 * Rotas que exibem a navbar principal.
 */

export const NAVBAR_ROUTES = Object.freeze([

    "home",

    "club",

    "marketplace",

    "profile"

]);


/*
 * Chaves utilizadas no armazenamento local.
 */

export const STORAGE_KEYS = Object.freeze({

    SESSION: "motoclube.session",

    STORE: "motoclube.store",

    PREFERENCES: "motoclube.preferences"

});