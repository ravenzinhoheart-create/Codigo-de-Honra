// =========================================================
// MOTOCLUBE
// Global Store
// =========================================================

import {
    STORAGE_KEYS
} from "./constants.js";

import {
    events
} from "./events.js";


const DEFAULT_STATE = {

    app: {

        initialized: false,

        loading: false,

        online: true

    },


    auth: {

        authenticated: false,

        user: null

    },


    navigation: {

        route: null,

        previousRoute: null

    },


    ui: {

        navbarVisible: false,

        addMenuOpen: false,

        activeModal: null,

        activeBottomSheet: null,

        toast: null

    },


    home: {

        countdownEvent: null,

        feed: [],

        feedLoading: false

    },


    club: {

        members: [],

        loading: false

    },


    events: {

        selectedEvent: null,

        upcoming: [],

        loading: false

    },


    marketplace: {

        products: [],

        selectedProduct: null,

        filters: {

            category: "all",

            mineOnly: false,

            search: ""

        },

        loading: false

    },


    profile: {

        user: null,

        vehicles: [],

        currentVehicle: null

    },


    ride: {

        active: false,

        startedAt: null,

        vehicle: null

    },


    sos: {

        active: [],

        current: null,

        tracking: false

    }

};


function clone(value) {

    if (
        typeof structuredClone === "function"
    ) {

        return structuredClone(value);

    }


    return JSON.parse(
        JSON.stringify(value)
    );
}


function getNestedValue(
    object,
    path
) {

    return path
        .split(".")
        .reduce(
            (current, key) =>
                current?.[key],
            object
        );
}


function setNestedValue(
    object,
    path,
    value
) {

    const keys =
        path.split(".");

    const lastKey =
        keys.pop();


    let target = object;


    keys.forEach(key => {

        if (
            !target[key] ||
            typeof target[key] !== "object"
        ) {

            target[key] = {};

        }

        target = target[key];

    });


    target[lastKey] = value;
}


class Store {

    constructor() {

        this.state =
            clone(DEFAULT_STATE);

        this.initialized = false;

    }


    initialize() {

        if (this.initialized) {
            return;
        }


        this.initialized = true;


        /*
         * Neste momento não restauramos dados
         * sensíveis do aplicativo.
         *
         * A persistência real ficará nos services.
         */


        events.emit(
            "store:initialized",
            this.getState()
        );

    }


    getState() {

        return this.state;

    }


    get(path = null) {

        if (!path) {

            return this.getState();

        }


        return getNestedValue(
            this.state,
            path
        );

    }


    set(path, value) {

        const previous =
            this.get(path);

        setNestedValue(
            this.state,
            path,
            value
        );


        events.emit(
            "store:changed",
            {
                path,
                value,
                previous
            }
        );


        events.emit(
            `store:${path}`,
            {
                value,
                previous
            }
        );


        return value;
    }


    update(path, updater) {

        if (
            typeof updater !== "function"
        ) {

            throw new TypeError(
                "O updater precisa ser uma função."
            );

        }


        const current =
            this.get(path);

        const next =
            updater(current);


        return this.set(
            path,
            next
        );
    }


    reset() {

        this.state =
            clone(DEFAULT_STATE);


        events.emit(
            "store:reset",
            this.getState()
        );

    }


    snapshot() {

        return clone(
            this.state
        );

    }
}


export const store = new Store();