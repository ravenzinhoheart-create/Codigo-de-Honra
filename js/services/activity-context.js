import { getSession } from '../core/session.js';
import { listRecords } from './app-records.js';

const RIDE_TYPE = 'rides';
const SOS_TYPE = 'sos';
const EVENT_TYPE = 'events';

function sameId(a, b) {
    return String(a ?? '') === String(b ?? '');
}

function timestamp(value) {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
}

function isInsideWindow(at, startedAt, finishedAt = null) {
    const point = timestamp(at);
    const start = timestamp(startedAt);

    if (!point || !start || point < start) {
        return false;
    }

    if (!finishedAt) {
        return true;
    }

    const end = timestamp(finishedAt);
    return !end || point <= end;
}

function isRideParticipant(ride, userId) {
    return Boolean(
        ride?.userId &&
        sameId(ride.userId, userId)
    );
}

function getSosParticipantIds(sos) {
    const ids = [];

    if (sos?.userId) {
        ids.push(String(sos.userId));
    }

    if (Array.isArray(sos?.responders)) {
        sos.responders.forEach(responder => {
            const id = responder?.id || responder?.userId;
            if (id) {
                ids.push(String(id));
            }
        });
    }

    return [...new Set(ids)];
}

function isSosParticipant(sos, userId) {
    return getSosParticipantIds(sos)
        .some(id => sameId(id, userId));
}

function isEventParticipant(event, userId) {
    return Array.isArray(event?.confirmedMembers)
        && event.confirmedMembers.some(member =>
            sameId(
                member?.id || member?.userId,
                userId
            )
        );
}

export async function getActivityContextAt(
    at = new Date().toISOString(),
    userId = getSession()?.user?.id
) {
    if (!userId) {
        return {
            ride: null,
            sos: null,
            event: null
        };
    }

    const [rides, sosList, events] = await Promise.all([
        listRecords(RIDE_TYPE).catch(() => []),
        listRecords(SOS_TYPE).catch(() => []),
        listRecords(EVENT_TYPE).catch(() => [])
    ]);

    const ride = rides
        .filter(item =>
            isRideParticipant(item, userId)
            && isInsideWindow(
                at,
                item.startedAt,
                item.finishedAt
            )
        )
        .sort(
            (a, b) =>
                timestamp(b.startedAt) -
                timestamp(a.startedAt)
        )[0] || null;

    const sos = sosList
        .filter(item =>
            isSosParticipant(item, userId)
            && isInsideWindow(
                at,
                item.createdAt,
                item.resolvedAt
            )
        )
        .sort(
            (a, b) =>
                timestamp(b.createdAt) -
                timestamp(a.createdAt)
        )[0] || null;

    const event = events
        .filter(item =>
            isEventParticipant(item, userId)
            && isInsideWindow(
                at,
                item.startAt || item.dateTime,
                item.endedAt
            )
        )
        .sort(
            (a, b) =>
                timestamp(
                    b.startAt || b.dateTime
                ) -
                timestamp(
                    a.startAt || a.dateTime
                )
        )[0] || null;

    return {
        ride,
        sos,
        event
    };
}

export async function getCurrentActivityContext(
    userId = getSession()?.user?.id
) {
    return getActivityContextAt(
        new Date().toISOString(),
        userId
    );
}
