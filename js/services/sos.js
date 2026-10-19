import { USER_STATUS, SOS_TYPE_META } from '../core/constants.js';
import { canEmitSOS } from '../core/permissions.js';
import { getSession, updateCurrentUser as updateSessionUser } from '../core/session.js';
import { getCurrentUser, updateUser } from './users.js';
import { events as eventBus } from '../core/events.js';
import { listRecords, getRecord, insertRecord, updateRecord } from './app-records.js';
import { getCurrentRide } from './rides.js';
import {
    createActivityPost,
    updateActivityPost,
    getActivityPostBy
} from './posts.js';
import { supabase } from './supabase.js';
import {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
} from '../config/supabase-config.js';

const TYPE = 'sos';

function norm(v) {
    const a = {
        conflict: 'conflict',
        conflito: 'conflict',

        motorcycle_breakdown: 'motorcycle_breakdown',
        'pane na moto': 'motorcycle_breakdown',
        pane: 'motorcycle_breakdown',

        accident: 'accident',
        acidente: 'accident',

        natural_cause: 'natural_cause',
        'causa natural': 'natural_cause',

        other: 'other',
        outro: 'other'
    };

    return a[
        String(v || '')
            .trim()
            .toLowerCase()
    ] || null;
}

function req() {
    const u = getSession()?.user;

    if (!u) {
        throw new Error('Usuário não autenticado.');
    }

    return u;
}

async function setStatus(u, status) {
    const x = await updateUser(u.id, { status });

    try {
        updateSessionUser(x);
    } catch {}

    return x;
}

function snap(u) {
    return {
        id: u.id,
        username: u.username || 'Membro',
        avatar: u.avatar || null,
        status: u.status || 'off',
        currentVehicle:
            u.currentVehicle || {
                type: 'on_foot'
            }
    };
}

/* =========================================================
   SOS ACTIVITY POST
========================================================= */

async function createSOSActivityPost(sos, u) {
    if (!sos?.id || !u?.id) return null;

    const existing =
        await getActivityPostBy(
            'sosId',
            sos.id
        );

    if (existing) {
        return existing;
    }

    return createActivityPost({
        user: u,

        type: 'sos',

        title: 'SOS',

        description:
            sos.description || '',

        vehicleSnapshot:
            sos.vehicle ||
            u.currentVehicle || {
                type: 'on_foot'
            },

        metadata: {
            sosId: sos.id,

            sosType:
                sos.type || 'other',

            sosTypeLabel:
                sos.typeLabel ||
                SOS_TYPE_META[
                    sos.type
                ]?.label ||
                'Outro',

            sosTypeIcon:
                sos.typeIcon ||
                SOS_TYPE_META[
                    sos.type
                ]?.icon ||
                'alert',

            status:
                sos.status || 'active',

            createdAt:
                sos.createdAt || null,

            resolvedAt:
                sos.resolvedAt || null,

            description:
                sos.description || '',

            latitude:
                sos.latitude ?? null,

            longitude:
                sos.longitude ?? null,

            location:
                sos.location || null,

            responders:
                Array.isArray(sos.responders)
                    ? sos.responders
                    : [],

            rideId:
                sos.rideId || null,

            rideLinks:
                Array.isArray(sos.rideLinks)
                    ? sos.rideLinks
                    : []
        },

        createdAt:
            sos.createdAt || null
    });
}

async function syncSOSActivityPost(
    sos,
    options = {}
) {
    if (!sos?.id) return null;

    let post =
        await getActivityPostBy(
            'sosId',
            sos.id
        );

    if (
        !post &&
        options.createIfMissing
    ) {
        const u =
            getSession()?.user;

        if (u) {
            post =
                await createSOSActivityPost(
                    sos,
                    u
                );
        }
    }

    if (!post) return null;

    return updateActivityPost(
        post.id,

        {
            sosId: sos.id,

            sosType:
                sos.type || 'other',

            sosTypeLabel:
                sos.typeLabel ||
                SOS_TYPE_META[
                    sos.type
                ]?.label ||
                'Outro',

            sosTypeIcon:
                sos.typeIcon ||
                SOS_TYPE_META[
                    sos.type
                ]?.icon ||
                'alert',

            status:
                sos.status || 'active',

            createdAt:
                sos.createdAt || null,

            resolvedAt:
                sos.resolvedAt || null,

            description:
                sos.description || '',

            responders:
                Array.isArray(sos.responders)
                    ? sos.responders
                    : [],

            latitude:
                sos.latitude ?? null,

            longitude:
                sos.longitude ?? null,

            location:
                sos.location || null,

            rideId:
                sos.rideId || null,

            rideLinks:
                Array.isArray(sos.rideLinks)
                    ? sos.rideLinks
                    : []
        }
    );
}

/* =========================================================
   CRIAR SOS
========================================================= */

export async function createSOS({
    type,
    description = '',
    latitude = null,
    longitude = null,
    location = null,
    vehicle = null
} = {}) {

    const u = req();

    if (!canEmitSOS(u.status)) {
        throw new Error(
            'Membros Off não podem emitir SOS.'
        );
    }

    const normalized = norm(type);

    if (!normalized) {
        throw new Error(
            'Tipo de SOS inválido.'
        );
    }

    const existing =
        await getActiveSOS(u.id);

    if (existing) {
        return existing;
    }

    const meta =
        SOS_TYPE_META[
            normalized
        ] ||
        SOS_TYPE_META.other;

    const emitter =
        snap({
            ...u,
            currentVehicle:
                vehicle ||
                u.currentVehicle
        });

    const ride =
        await getCurrentRide(u.id)
            .catch(() => null);

    const createdAt =
        new Date().toISOString();

    const sos =
        await insertRecord(
            TYPE,
            u.id,
            {
                userId: u.id,

                type: normalized,

                typeLabel:
                    meta.label,

                typeIcon:
                    meta.icon,

                description:
                    String(
                        description || ''
                    ).trim(),

                latitude,

                longitude,

                location,

                vehicle:
                    emitter.currentVehicle,

                status: 'active',

                previousUserStatus:
                    u.status,

                createdAt,

                emitter,

                responders: [],

                rideId:
                    ride?.id || null,

                rideLinks:
                    ride?.id
                        ? [{
                            userId: u.id,
                            rideId: ride.id,
                            role: 'emitter'
                        }]
                        : [],

                activityPostId: null
            }
        );

    /*
     * O registro do SOS já existe.
     * Agora criamos a publicação correspondente
     * no feed.
     */
    try {
        const post =
            await createSOSActivityPost(
                sos,
                u
            );

        if (post?.id) {
            await updateRecord(
                TYPE,
                sos.id,
                {
                    activityPostId:
                        post.id
                },
                {
                    ownerId: sos.userId
                }
            );

            sos.activityPostId =
                post.id;
        }
    } catch (error) {
        console.warn(
            '[SOS] SOS criado, mas não foi possível criar a publicação:',
            error
        );
    }

    await setStatus(
        u,
        USER_STATUS.SOS
    );

    eventBus.emit(
        'sos:created',
        sos
    );

    supabase.functions
        .invoke(
            'send-sos-push',
            {
                body: {
                    sosId: sos.id
                }
            }
        )
        .catch(error =>
            console.warn(
                '[SOS] Push não enviado:',
                error
            )
        );

    try {
        const nativeSos =
            window.MotoclubeNative?.sos;

        if (
            nativeSos?.startTracking
        ) {
            const { data } =
                await supabase.auth
                    .getSession();

            await nativeSos.startTracking({
                sosId: sos.id,

                accessToken:
                    data?.session
                        ?.access_token || '',

                supabaseUrl:
                    SUPABASE_URL,

                supabaseKey:
                    SUPABASE_ANON_KEY
            });
        }
    } catch (error) {
        console.warn(
            '[SOS] Rastreamento nativo indisponível:',
            error
        );
    }

    return sos;
}

/* =========================================================
   CONSULTAS
========================================================= */

export async function getActiveSOS(
    userId
) {
    if (!userId) {
        throw new Error(
            'Usuário inválido.'
        );
    }

    return (
        await listRecords(
            TYPE,
            {
                ownerId: userId
            }
        )
    ).find(
        x => x.status === 'active'
    ) || null;
}

export async function hasActiveSOS(
    userId
) {
    return !!(
        await getActiveSOS(userId)
    );
}

export async function getSOS(id) {
    return getRecord(
        TYPE,
        id
    );
}

export async function getActiveSOSList() {
    const u = req();

    if (
        u.status === USER_STATUS.OFF
    ) {
        return [];
    }

    return (
        await listRecords(TYPE)
    ).filter(
        x => x.status === 'active'
    );
}

/* =========================================================
   RESPONDER AO SOS
========================================================= */

export async function respondToSOS(
    id,
    location = null
) {
    const u = req();

    if (
        u.status === USER_STATUS.OFF ||
        u.status === USER_STATUS.SOS
    ) {
        throw new Error(
            'Seu status atual não permite responder a um SOS.'
        );
    }

    const s =
        await getRecord(
            TYPE,
            id
        );

    if (
        !s ||
        s.status !== 'active'
    ) {
        throw new Error(
            'SOS não encontrado ou já encerrado.'
        );
    }

    if (
        s.userId === u.id
    ) {
        return s;
    }

    const entry = {
        ...snap(u)
    };

    const {
        data,
        error
    } = await supabase.rpc(
        'respond_to_sos',
        {
            p_sos_id: id,

            p_responder:
                entry,

            p_latitude:
                Number.isFinite(
                    Number(
                        location?.latitude
                    )
                )
                    ? Number(
                        location.latitude
                    )
                    : null,

            p_longitude:
                Number.isFinite(
                    Number(
                        location?.longitude
                    )
                )
                    ? Number(
                        location.longitude
                    )
                    : null,

            p_location:
                location || null
        }
    );

    if (error) {
        throw error;
    }

    const row = data;

    const updated = {
        ...(row?.data || {}),
        id: row?.id,
        ownerId: row?.owner_id,
        createdAt: row?.created_at,
        updatedAt: row?.updated_at
    };

    /*
     * Recarrega o SOS completo para garantir
     * que responders e demais campos estejam
     * sincronizados com o registro principal.
     */
    const latest =
        await getRecord(
            TYPE,
            id
        ).catch(() => null);

    const finalSOS =
        latest || updated;

    try {
        await syncSOSActivityPost(
            finalSOS,
            {
                createIfMissing: true
            }
        );
    } catch (syncError) {
        console.warn(
            '[SOS] Falha ao sincronizar publicação após resposta:',
            syncError
        );
    }

    eventBus.emit(
        'sos:updated',
        finalSOS
    );

    return finalSOS;
}

/* =========================================================
   SAIR DA RESPOSTA
========================================================= */

export async function leaveSOSResponse(
    id
) {
    req();

    const {
        data,
        error
    } = await supabase.rpc(
        'leave_sos_response',
        {
            p_sos_id: id
        }
    );

    if (error) {
        throw error;
    }

    const row = data;

    const updated = {
        ...(row?.data || {}),
        id: row?.id,
        ownerId: row?.owner_id,
        createdAt: row?.created_at,
        updatedAt: row?.updated_at
    };

    const latest =
        await getRecord(
            TYPE,
            id
        ).catch(() => null);

    const finalSOS =
        latest || updated;

    try {
        await syncSOSActivityPost(
            finalSOS,
            {
                createIfMissing: true
            }
        );
    } catch (syncError) {
        console.warn(
            '[SOS] Falha ao sincronizar publicação após saída:',
            syncError
        );
    }

    eventBus.emit(
        'sos:updated',
        finalSOS
    );

    return finalSOS;
}

/* =========================================================
   ENCERRAR / CANCELAR
========================================================= */

async function finish(
    id,
    cancel = false
) {
    const u = req();

    const s =
        await getRecord(
            TYPE,
            id
        );

    if (!s) {
        throw new Error(
            'SOS não encontrado.'
        );
    }

    if (
        s.userId !== u.id
    ) {
        throw new Error(
            'Somente quem abriu o SOS pode encerrá-lo.'
        );
    }

    const status =
        cancel
            ? 'cancelled'
            : 'finished';

    const updated =
        await updateRecord(
            TYPE,
            id,
            {
                status,

                resolvedAt:
                    new Date()
                        .toISOString()
            },
            {
                ownerId: s.userId
            }
        );

    try {
        await syncSOSActivityPost(
            updated,
            {
                createIfMissing: true
            }
        );
    } catch (error) {
        console.warn(
            '[SOS] Falha ao finalizar publicação:',
            error
        );
    }

    try {
        await window
            .MotoclubeNative
            ?.sos
            ?.stopTracking?.();
    } catch {}

    await setStatus(
        u,
        s.previousUserStatus ||
        USER_STATUS.ON
    );

    eventBus.emit(
        'sos:updated',
        updated
    );

    eventBus.emit(
        'sos:resolved',
        updated
    );

    return updated;
}

export async function finishSOS(id) {
    return finish(
        id,
        false
    );
}

export async function cancelSOS(id) {
    return finish(
        id,
        true
    );
}

/* =========================================================
   PERMISSÕES
========================================================= */

export function canUserCreateSOS(
    user
) {
    return !!user &&
        canEmitSOS(
            user.status
        );
}

export function canUserReceiveSOS(
    user
) {
    return !!user &&
        [
            USER_STATUS.ON,
            USER_STATUS.RIDE
        ].includes(
            user.status
        );
}