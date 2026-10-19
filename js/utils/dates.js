// Motoclube — Date Utils

export function toDate(value) {
    if (value instanceof Date) {
        return new Date(value.getTime());
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

export function isValidDate(value) {
    return toDate(value) !== null;
}

export function now() {
    return new Date();
}

export function startOfDay(value = new Date()) {
    const date = toDate(value);

    if (!date) return null;

    date.setHours(0, 0, 0, 0);

    return date;
}

export function endOfDay(value = new Date()) {
    const date = toDate(value);

    if (!date) return null;

    date.setHours(23, 59, 59, 999);

    return date;
}

export function addDays(value, amount) {
    const date = toDate(value);

    if (!date) return null;

    date.setDate(date.getDate() + Number(amount));

    return date;
}

export function addHours(value, amount) {
    const date = toDate(value);

    if (!date) return null;

    date.setHours(date.getHours() + Number(amount));

    return date;
}

export function addMinutes(value, amount) {
    const date = toDate(value);

    if (!date) return null;

    date.setMinutes(date.getMinutes() + Number(amount));

    return date;
}

export function differenceInSeconds(from, to = new Date()) {
    const first = toDate(from);
    const second = toDate(to);

    if (!first || !second) return 0;

    return Math.floor(
        (second.getTime() - first.getTime()) / 1000
    );
}

export function differenceInMinutes(from, to = new Date()) {
    return Math.floor(
        differenceInSeconds(from, to) / 60
    );
}

export function differenceInHours(from, to = new Date()) {
    return Math.floor(
        differenceInMinutes(from, to) / 60
    );
}

export function differenceInDays(from, to = new Date()) {
    return Math.floor(
        differenceInHours(from, to) / 24
    );
}

export function isToday(value) {
    const date = toDate(value);

    if (!date) return false;

    const today = new Date();

    return date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();
}

export function isPast(value) {
    const date = toDate(value);

    return date ? date.getTime() < Date.now() : false;
}

export function isFuture(value) {
    const date = toDate(value);

    return date ? date.getTime() > Date.now() : false;
}

export function isBetween(value, start, end) {
    const date = toDate(value);
    const first = toDate(start);
    const last = toDate(end);

    if (!date || !first || !last) {
        return false;
    }

    return date >= first && date <= last;
}

export function toISOString(value = new Date()) {
    const date = toDate(value);

    return date ? date.toISOString() : null;
}

export function toDateInputValue(value) {
    const date = toDate(value);

    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function toTimeInputValue(value) {
    const date = toDate(value);

    if (!date) return '';

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
}

export function combineDateAndTime(dateValue, timeValue) {
    const date = toDate(dateValue);

    if (!date || !timeValue) {
        return null;
    }

    const [hours, minutes] = String(timeValue)
        .split(':')
        .map(Number);

    if (
        !Number.isInteger(hours) ||
        !Number.isInteger(minutes)
    ) {
        return null;
    }

    date.setHours(hours, minutes, 0, 0);

    return date;
}

export function getCountdownParts(target) {
    const date = toDate(target);

    if (!date) {
        return {
            total: 0,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            expired: true
        };
    }

    const total = Math.max(
        0,
        date.getTime() - Date.now()
    );

    const secondsTotal = Math.floor(total / 1000);

    const days = Math.floor(secondsTotal / 86400);
    const hours = Math.floor((secondsTotal % 86400) / 3600);
    const minutes = Math.floor((secondsTotal % 3600) / 60);
    const seconds = secondsTotal % 60;

    return {
        total,
        days,
        hours,
        minutes,
        seconds,
        expired: total === 0
    };
}