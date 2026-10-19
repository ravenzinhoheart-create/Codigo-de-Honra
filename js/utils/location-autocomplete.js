// =========================================================
// MOTOCLUBE
// Local Location Autocomplete
//
// Sem API.
// Sem Google Maps.
// Sem rede.
// =========================================================

let history = [];

const MAX_HISTORY = 12;


// =========================================================
// LOCAIS PADRÃO
// =========================================================

const DEFAULT_LOCATIONS = [

    {
        title: "Sede do Motoclube",
        subtitle: "Local da sede",
        type: "club"
    },

    {
        title: "Ponto de encontro",
        subtitle: "Local personalizado do clube",
        type: "meeting"
    }

];


// =========================================================
// NORMALIZAÇÃO
// =========================================================

function normalize(value = "") {

    return String(value)

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .trim();

}


// =========================================================
// HISTÓRICO
// =========================================================

function readHistory() { return history.slice(); }

function writeHistory(items) { history = items.slice(0, MAX_HISTORY); }


// =========================================================
// MEMORIZAR LOCAL
// =========================================================

export function rememberLocation(
    location
) {

    const title =
        String(
            location?.title || ""
        ).trim();


    const subtitle =
        String(
            location?.subtitle || ""
        ).trim();


    if (!title) {
        return;
    }


    const normalized =
        normalize(title);


    const history =
        readHistory().filter(
            item =>
                normalize(
                    item.title
                ) !== normalized
        );


    history.unshift({

        title,

        subtitle,

        type: "recent"

    });


    writeHistory(
        history
    );

}


// =========================================================
// BUSCAR SUGESTÕES
// =========================================================

export function getLocationSuggestions(
    query = ""
) {

    const term =
        normalize(query);


    const history =
        readHistory();


    const source = [

        ...history,

        ...DEFAULT_LOCATIONS

    ];


    const unique =
        new Map();


    source.forEach(
        item => {

            const title =
                String(
                    item?.title || ""
                ).trim();


            if (!title) {
                return;
            }


            const key =
                normalize(title);


            if (
                unique.has(key)
            ) {
                return;
            }


            const subtitle =
                String(
                    item?.subtitle || ""
                );


            const matches =
                !term ||
                key.includes(term) ||
                normalize(
                    subtitle
                ).includes(term);


            if (!matches) {
                return;
            }


            unique.set(
                key,
                {

                    title,

                    subtitle,

                    type:
                        item.type ||
                        "place"

                }
            );

        }
    );


    return [
        ...unique.values()
    ].slice(
        0,
        6
    );

}


// =========================================================
// ENDEREÇO DIGITADO
// =========================================================

export function createTypedLocationSuggestion(
    query = ""
) {

    const title =
        String(
            query
        ).trim();


    if (!title) {
        return null;
    }


    const normalized =
        normalize(title);


    const alreadyExists =
        readHistory().some(
            item =>
                normalize(
                    item.title
                ) === normalized
        );


    if (alreadyExists) {
        return null;
    }


    return {

        title,

        subtitle:
            "Usar este local",

        type:
            "typed"

    };

}


// =========================================================
// LIMPAR HISTÓRICO
// =========================================================

export function clearLocationHistory() {
    history = [];
}
