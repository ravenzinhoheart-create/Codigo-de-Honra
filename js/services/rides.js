import { USER_STATUS, VEHICLE_TYPE } from '../core/constants.js';
import { canStartRide, canEndRide } from '../core/permissions.js';
import { getSession } from '../core/session.js';
import { getSelectedVehicle } from './vehicles.js';
import { listRecords, getRecord, insertRecord, updateRecord } from './app-records.js';
import {
    createActivityPost,
    updateActivityPost,
    getActivityPostBy
} from './posts.js';

const TYPE = 'rides';

function user() {
    const u = getSession()?.user;

    if (!u) {
        throw new Error('Usuário não autenticado.');
    }

    return u;
}

function duration(a, b) {
    return Math.max(
        0,
        Math.floor(
            (new Date(b || Date.now()) - new Date(a || Date.now())) / 1000
        )
    );
}

/* =========================================================
   RIDE ACTIVITY POST
========================================================= */

async function createRideActivityPost(ride, u) {
    if (!ride?.id || !u?.id) return null;

    const existing = await getActivityPostBy('rideId', ride.id);

    if (existing) {
        return existing;
    }

    return createActivityPost({
        user: u,
        type: 'ride',
        title: 'RIDE',
        description: ride.destination || '',
        vehicleSnapshot: ride.vehicle || u.currentVehicle || { type: 'on_foot' },
        metadata: {
            rideId: ride.id,
            status: ride.status || 'active',
            phase: ride.phase || 'outbound',
            destination: ride.destination || '',
            startedAt: ride.startedAt || null,
            phaseStartedAt: ride.phaseStartedAt || ride.startedAt || null,
            phaseDurations: ride.phaseDurations || {},
            phaseHistory: ride.phaseHistory || [],
            finishedAt: ride.finishedAt || null,
            totalDurationSeconds: ride.totalDurationSeconds || 0
        },
        createdAt: ride.startedAt || null
    });
}

async function syncRideActivityPost(ride, options = {}) {
    if (!ride?.id) return null;

    let post = await getActivityPostBy('rideId', ride.id);

    if (!post && options.createIfMissing) {
        const u = getSession()?.user;

        if (u) {
            post = await createRideActivityPost(ride, u);
        }
    }

    if (!post) return null;

    return updateActivityPost(
        post.id,
        {
            rideId: ride.id,
            status: ride.status || 'active',
            phase: ride.phase || 'outbound',
            destination: ride.destination || '',
            startedAt: ride.startedAt || null,
            phaseStartedAt: ride.phaseStartedAt || ride.startedAt || null,
            phaseDurations: ride.phaseDurations || {},
            phaseHistory: ride.phaseHistory || [],
            finishedAt: ride.finishedAt || null,
            totalDurationSeconds: ride.totalDurationSeconds || 0
        }
    );
}

/* =========================================================
   CONSULTAS
========================================================= */

export async function getActiveRides() {
    return (await listRecords(TYPE))
        .filter(r => r.status === 'active');
}

export async function getCurrentRide(userId) {
    if (!userId) {
        throw new Error('Usuário inválido.');
    }

    return (await listRecords(TYPE, { ownerId: userId }))
        .find(r => r.status === 'active') || null;
}

export async function hasActiveRide(userId) {
    return !!(await getCurrentRide(userId));
}

/* =========================================================
   INICIAR RIDE
========================================================= */

export async function startRide(options = {}) {
    const u = user();

    if (!canStartRide(u.status)) {
        throw new Error(
            'A Ride só pode ser iniciada quando o membro está On.'
        );
    }

    const existing = await getCurrentRide(u.id);

    if (existing) {
        return existing;
    }

    const v = await getSelectedVehicle(u.id);

    if (!v) {
        throw new Error('Nenhum veículo selecionado.');
    }

    const startedAt = new Date().toISOString();

    const ride = await insertRecord(
        TYPE,
        u.id,
        {
            userId: u.id,

            vehicle: {
                type: v.type,
                id: v.id ?? null,
                name: v.name ?? null,
                brand: v.brand ?? null,
                model: v.model ?? null,
                plate: v.plate ?? null
            },

            status: 'active',

            phase: options.phase || 'outbound',

            destination: String(
                options.destination || ''
            ).trim(),

            startedAt,

            phaseStartedAt: startedAt,

            phaseDurations: {},

            phaseHistory: []
        }
    );

    try {
        await createRideActivityPost(ride, u);
    } catch (error) {
        console.warn(
            '[RIDE] Ride criada, mas não foi possível criar a publicação:',
            error
        );
    }

    return ride;
}

/* =========================================================
   ATUALIZAR FLUXO DA RIDE
========================================================= */

export async function updateRideFlow(id, data = {}) {
    const r = await getRecord(TYPE, id);

    if (!r) {
        throw new Error('Ride não encontrada.');
    }

    const now = new Date().toISOString();

    const current = r.phase || 'outbound';
    const next = data.phase || current;

    const history = [
        ...(r.phaseHistory || [])
    ];

    const durations = {
        ...(r.phaseDurations || {})
    };

    if (next !== current) {
        const d = duration(
            r.phaseStartedAt || r.startedAt,
            now
        );

        history.push({
            phase: current,
            startedAt: r.phaseStartedAt || r.startedAt,
            endedAt: now,
            durationSeconds: d
        });

        durations[current] =
            (durations[current] || 0) + d;
    }

    const updated = await updateRecord(
        TYPE,
        id,
        {
            ...data,

            phase: next,

            phaseStartedAt:
                next !== current
                    ? now
                    : r.phaseStartedAt || r.startedAt,

            phaseHistory: history,

            phaseDurations: durations
        },
        {
            ownerId: r.userId
        }
    );

    try {
        await syncRideActivityPost(updated, {
            createIfMissing: true
        });
    } catch (error) {
        console.warn(
            '[RIDE] Falha ao sincronizar publicação:',
            error
        );
    }

    return updated;
}

/* =========================================================
   ENCERRAR RIDE
========================================================= */

export async function endRide(id) {
    const u = user();

    if (!canEndRide(u.status)) {
        throw new Error(
            'A Ride não pode ser encerrada neste estado.'
        );
    }

    const r = await getRecord(TYPE, id);

    if (!r) {
        throw new Error('Ride não encontrada.');
    }

    const finishedAt = new Date().toISOString();

    const current = r.phase || 'outbound';

    const d = duration(
        r.phaseStartedAt || r.startedAt,
        finishedAt
    );

    const durations = {
        ...(r.phaseDurations || {})
    };

    durations[current] =
        (durations[current] || 0) + d;

    const finished = await updateRecord(
        TYPE,
        id,
        {
            status: 'finished',

            phase: 'finished',

            finishedAt,

            totalDurationSeconds:
                duration(
                    r.startedAt,
                    finishedAt
                ),

            phaseDurations: durations,

            phaseHistory: [
                ...(r.phaseHistory || []),

                {
                    phase: current,
                    startedAt:
                        r.phaseStartedAt ||
                        r.startedAt,
                    endedAt: finishedAt,
                    durationSeconds: d
                }
            ]
        },
        {
            ownerId: r.userId
        }
    );

    try {
        await syncRideActivityPost(finished, {
            createIfMissing: true
        });
    } catch (error) {
        console.warn(
            '[RIDE] Falha ao finalizar publicação:',
            error
        );
    }

    return finished;
}

/* =========================================================
   HELPERS
========================================================= */

export function getRideVehicle(ride) {
    return ride?.vehicle || {
        type: VEHICLE_TYPE.ON_FOOT
    };
}

export function isRideOnFoot(ride) {
    return getRideVehicle(ride).type === VEHICLE_TYPE.ON_FOOT;
}

export function isRideActive(ride) {
    return ride?.status === 'active';
}

export function canUserStartRide(u) {
    return !!u && canStartRide(u.status);
}

export function canUserEndRide(u) {
    return !!u && canEndRide(u.status);
}