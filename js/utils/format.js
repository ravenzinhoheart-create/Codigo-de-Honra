// Motoclube — Format Utils

export function formatCurrency(value, currency = 'BRL') {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 'R$ 0,00';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency
    }).format(number);
}

export function formatNumber(value, decimals = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return '0';
    }

    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

export function formatDistance(meters) {
    const value = Number(meters);

    if (!Number.isFinite(value) || value < 0) {
        return '0 m';
    }

    if (value < 1000) {
        return `${Math.round(value)} m`;
    }

    return `${(value / 1000).toFixed(1).replace('.', ',')} km`;
}

export function formatSpeed(kmh) {
    const value = Number(kmh);

    if (!Number.isFinite(value)) {
        return '0 km/h';
    }

    return `${Math.round(value)} km/h`;
}

export function formatDuration(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));

    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDate(date, options = {}) {
    if (!date) return '';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat(
        options.locale || 'pt-BR',
        options
    ).format(parsed);
}

export function formatDateTime(date) {
    return formatDate(date, {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

export function formatTime(date) {
    return formatDate(date, {
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatRelativeTime(date) {
    const target = new Date(date);

    if (Number.isNaN(target.getTime())) {
        return '';
    }

    const diff = target.getTime() - Date.now();
    const seconds = Math.round(diff / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    const formatter = new Intl.RelativeTimeFormat('pt-BR', {
        numeric: 'auto'
    });

    if (Math.abs(seconds) < 60) {
        return formatter.format(seconds, 'second');
    }

    if (Math.abs(minutes) < 60) {
        return formatter.format(minutes, 'minute');
    }

    if (Math.abs(hours) < 24) {
        return formatter.format(hours, 'hour');
    }

    return formatter.format(days, 'day');
}

export function formatPhone(phone) {
    const digits = String(phone ?? '').replace(/\D/g, '');

    if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return phone ? String(phone) : '';
}

export function formatCpf(cpf) {
    const digits = String(cpf ?? '').replace(/\D/g, '');

    if (digits.length !== 11) {
        return cpf ? String(cpf) : '';
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPlate(plate) {
    return String(plate ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');
}

export function capitalize(value) {
    if (!value) return '';

    const text = String(value).toLowerCase();

    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function truncate(value, maxLength = 100) {
    const text = String(value ?? '');

    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function initials(name, max = 2) {
    const parts = String(name ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!parts.length) {
        return '';
    }

    return parts
        .slice(0, max)
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase();
}