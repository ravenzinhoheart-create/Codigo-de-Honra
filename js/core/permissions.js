// =========================================================
// MOTOCLUBE
// Core Permissions
// =========================================================

import {
    USER_STATUS
} from "./constants.js";


// =========================================================
// STATUS CHECKS
// =========================================================

export function isOff(status) {
    return status === USER_STATUS.OFF;
}


export function isOn(status) {
    return status === USER_STATUS.ON;
}


export function isRide(status) {
    return status === USER_STATUS.RIDE;
}


export function isSOS(status) {
    return status === USER_STATUS.SOS;
}


// =========================================================
// SOS PERMISSIONS
// =========================================================

/*
 * Quem pode RECEBER SOS?
 *
 * OFF:
 *   não recebe.
 *
 * ON:
 *   recebe.
 *
 * RIDE:
 *   recebe.
 *
 * SOS:
 *   já está em um chamado ativo.
 */

export function canReceiveSOS(status) {

    return (
        status === USER_STATUS.ON ||
        status === USER_STATUS.RIDE
    );
}


/*
 * Quem pode EMITIR SOS?
 *
 * Somente OFF fica impedido.
 * ON e RIDE podem emitir SOS.
 */

export function canEmitSOS(status) {

    return (
        status === USER_STATUS.ON ||
        status === USER_STATUS.RIDE
    );
}


// =========================================================
// RIDE PERMISSIONS
// =========================================================

/*
 * Somente ON pode iniciar uma Ride.
 */

export function canStartRide(status) {

    return status === USER_STATUS.ON;
}


/*
 * Somente RIDE pode encerrar uma Ride.
 *
 * Um usuário em SOS não pode simplesmente
 * encerrar a Ride, pois o SOS ainda está ativo.
 */

export function canEndRide(status) {

    return status === USER_STATUS.RIDE;
}


// =========================================================
// STATUS TRANSITIONS
// =========================================================

/*
 * OFF -> ON
 */

export function activateMember(status) {

    if (!isOff(status)) {

        return {
            allowed: false,
            status,
            reason: "O membro não está Off."
        };
    }

    return {
        allowed: true,
        status: USER_STATUS.ON
    };
}


/*
 * ON -> OFF
 *
 * Só é permitido quando o membro está On.
 */

export function deactivateMember(status) {

    if (!isOn(status)) {

        return {
            allowed: false,
            status,
            reason: "O membro precisa estar On para ficar Off."
        };
    }

    return {
        allowed: true,
        status: USER_STATUS.OFF
    };
}


/*
 * ON -> RIDE
 */

export function startRideStatus(status) {

    if (!canStartRide(status)) {

        return {
            allowed: false,
            status,
            reason: "A Ride só pode ser iniciada quando o membro está On."
        };
    }

    return {
        allowed: true,
        status: USER_STATUS.RIDE
    };
}


/*
 * RIDE -> ON
 */

export function endRideStatus(status) {

    if (!canEndRide(status)) {

        return {
            allowed: false,
            status,
            reason: "Somente uma Ride ativa pode ser encerrada."
        };
    }

    return {
        allowed: true,
        status: USER_STATUS.ON
    };
}


/*
 * ON/RIDE -> SOS
 *
 * A entrada em SOS acontece automaticamente
 * quando o chamado é criado.
 */

export function activateSOSStatus(status) {

    if (!canEmitSOS(status)) {

        return {
            allowed: false,
            status,
            reason: "Membros Off não podem emitir SOS."
        };
    }

    return {
        allowed: true,
        status: USER_STATUS.SOS,
        previousStatus: status
    };
}


/*
 * SOS -> RIDE
 *
 * Quando o chamado é encerrado,
 * o membro continua em Ride.
 */

export function finishSOSStatus(status, previousStatus = USER_STATUS.ON) {

    if (!isSOS(status)) {

        return {
            allowed: false,
            status,
            reason: "O membro não possui um SOS ativo."
        };
    }

    const restoredStatus =
        previousStatus === USER_STATUS.RIDE
            ? USER_STATUS.RIDE
            : USER_STATUS.ON;

    return {
        allowed: true,
        status: restoredStatus
    };
}


// =========================================================
// STATUS VALIDATION
// =========================================================

/*
 * Verifica se o status é um status válido.
 */

export function isValidStatus(status) {

    return (
        status === USER_STATUS.OFF ||
        status === USER_STATUS.ON ||
        status === USER_STATUS.RIDE ||
        status === USER_STATUS.SOS
    );
}


// =========================================================
// STATUS ACTIONS
// =========================================================

/*
 * Retorna exatamente o que o usuário
 * pode fazer no estado atual.
 */

export function getAvailableStatusActions(status) {

    switch (status) {

        case USER_STATUS.OFF:

            return {
                activate: true,
                deactivate: false,
                startRide: false,
                endRide: false,
                emitSOS: false,
                receiveSOS: false
            };


        case USER_STATUS.ON:

            return {
                activate: false,
                deactivate: true,
                startRide: true,
                endRide: false,
                emitSOS: true,
                receiveSOS: true
            };


        case USER_STATUS.RIDE:

            return {
                activate: false,
                deactivate: false,
                startRide: false,
                endRide: true,
                emitSOS: true,
                receiveSOS: true
            };


        case USER_STATUS.SOS:

            return {
                activate: false,
                deactivate: false,
                startRide: false,
                endRide: false,
                emitSOS: false,
                receiveSOS: false
            };


        default:

            return {
                activate: false,
                deactivate: false,
                startRide: false,
                endRide: false,
                emitSOS: false,
                receiveSOS: false
            };
    }
}


// =========================================================
// STATUS TRANSITION VALIDATION
// =========================================================

/*
 * Verifica se uma transição específica
 * é permitida.
 */

export function canTransitionStatus(from, to) {

    if (!isValidStatus(from) || !isValidStatus(to)) {
        return false;
    }


    // OFF -> ON
    if (
        from === USER_STATUS.OFF &&
        to === USER_STATUS.ON
    ) {
        return true;
    }


    // ON -> OFF
    if (
        from === USER_STATUS.ON &&
        to === USER_STATUS.OFF
    ) {
        return true;
    }


    // ON -> RIDE
    if (
        from === USER_STATUS.ON &&
        to === USER_STATUS.RIDE
    ) {
        return true;
    }


    // RIDE -> ON
    if (
        from === USER_STATUS.RIDE &&
        to === USER_STATUS.ON
    ) {
        return true;
    }


    // ON/RIDE -> SOS
    if (
        (from === USER_STATUS.ON || from === USER_STATUS.RIDE) &&
        to === USER_STATUS.SOS
    ) {
        return true;
    }


    // SOS -> RIDE
    if (
        from === USER_STATUS.SOS &&
        to === USER_STATUS.RIDE
    ) {
        return true;
    }


    return false;
}


// =========================================================
// STATUS TRANSITION
// =========================================================

/*
 * Função central para validar uma alteração
 * de status.
 */

export function transitionStatus(from, to) {

    if (!canTransitionStatus(from, to)) {

        return {
            allowed: false,
            from,
            to,
            status: from,
            reason: `Transição de ${from} para ${to} não permitida.`
        };
    }

    return {
        allowed: true,
        from,
        to,
        status: to
    };
}