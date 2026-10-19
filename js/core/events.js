// =========================================================
// MOTOCLUBE
// Global Event Bus
// =========================================================

class EventBus {

    constructor() {

        this.listeners = new Map();

    }


    on(eventName, callback) {

        if (
            typeof callback !== "function"
        ) {

            throw new TypeError(
                "O callback precisa ser uma função."
            );

        }


        if (
            !this.listeners.has(eventName)
        ) {

            this.listeners.set(
                eventName,
                new Set()
            );

        }


        const callbacks =
            this.listeners.get(eventName);

        callbacks.add(callback);


        return () => {

            this.off(
                eventName,
                callback
            );

        };

    }


    once(eventName, callback) {

        const unsubscribe =
            this.on(
                eventName,
                payload => {

                    unsubscribe();

                    callback(payload);

                }
            );

        return unsubscribe;

    }


    off(eventName, callback) {

        const callbacks =
            this.listeners.get(eventName);

        if (!callbacks) {
            return;
        }


        callbacks.delete(callback);


        if (callbacks.size === 0) {

            this.listeners.delete(
                eventName
            );

        }

    }


    emit(eventName, payload = null) {

        const callbacks =
            this.listeners.get(eventName);

        if (!callbacks) {
            return;
        }


        /*
         * Cópia dos listeners para permitir
         * remoção durante a execução.
         */

        [...callbacks].forEach(
            callback => {

                try {

                    callback(payload);

                } catch (error) {

                    console.error(
                        `[EVENTS] Erro em "${eventName}":`,
                        error
                    );

                }

            }
        );

    }


    clear(eventName = null) {

        if (eventName === null) {

            this.listeners.clear();

            return;
        }


        this.listeners.delete(
            eventName
        );

    }

}


/*
 * Instância global do Event Bus.
 */

export const events =
    new EventBus();


/*
 * Exporta a classe para testes
 * ou criação de EventBus isolado.
 */

export {
    EventBus
};


export default events;
// Compatibilidade com a camada de bootstrap.
export function initEvents() {
    return events;
}
