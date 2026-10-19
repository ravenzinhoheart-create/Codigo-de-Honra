// Motoclube — Validation Utils

export function isEmpty(value) {
    return value === null ||
        value === undefined ||
        String(value).trim() === '';
}

export function required(value) {
    return !isEmpty(value);
}

export function minLength(value, length) {
    return String(value ?? '').trim().length >= length;
}

export function maxLength(value, length) {
    return String(value ?? '').trim().length <= length;
}

export function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(value ?? '').trim()
    );
}

export function isPhone(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
}

export function isCpf(value) {
    const cpf = String(value ?? '').replace(/\D/g, '');

    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;

    for (let i = 0; i < 9; i++) {
        sum += Number(cpf[i]) * (10 - i);
    }

    let remainder = (sum * 10) % 11;

    if (remainder === 10) remainder = 0;

    if (remainder !== Number(cpf[9])) {
        return false;
    }

    sum = 0;

    for (let i = 0; i < 10; i++) {
        sum += Number(cpf[i]) * (11 - i);
    }

    remainder = (sum * 10) % 11;

    if (remainder === 10) remainder = 0;

    return remainder === Number(cpf[10]);
}

export function isStrongPassword(password) {
    const value = String(password ?? '');

    return value.length >= 8 &&
        /[A-Z]/.test(value) &&
        /[a-z]/.test(value) &&
        /\d/.test(value);
}

export function isUrl(value) {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

export function isNumber(value) {
    return Number.isFinite(Number(value));
}

export function isPositiveNumber(value) {
    return isNumber(value) && Number(value) > 0;
}

export function isInteger(value) {
    return Number.isInteger(Number(value));
}

export function isLatitude(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= -90 && number <= 90;
}

export function isLongitude(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= -180 && number <= 180;
}

export function isValidCoordinate(latitude, longitude) {
    return isLatitude(latitude) && isLongitude(longitude);
}

export function isPlate(value) {
    const plate = String(value ?? '')
        .replace(/[\s-]/g, '')
        .toUpperCase();

    return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(plate) ||
        /^[A-Z]{3}\d{4}$/.test(plate);
}

export function validate(data, rules) {
    const errors = {};

    for (const [field, fieldRules] of Object.entries(rules)) {
        const value = data?.[field];

        if (fieldRules.required && !required(value)) {
            errors[field] = fieldRules.message || 'Campo obrigatório.';
            continue;
        }

        if (isEmpty(value)) {
            continue;
        }

        if (fieldRules.email && !isEmail(value)) {
            errors[field] = fieldRules.message || 'E-mail inválido.';
            continue;
        }

        if (
            fieldRules.minLength &&
            !minLength(value, fieldRules.minLength)
        ) {
            errors[field] =
                fieldRules.message ||
                `Mínimo de ${fieldRules.minLength} caracteres.`;
            continue;
        }

        if (
            fieldRules.maxLength &&
            !maxLength(value, fieldRules.maxLength)
        ) {
            errors[field] =
                fieldRules.message ||
                `Máximo de ${fieldRules.maxLength} caracteres.`;
            continue;
        }

        if (fieldRules.phone && !isPhone(value)) {
            errors[field] = fieldRules.message || 'Telefone inválido.';
            continue;
        }

        if (fieldRules.cpf && !isCpf(value)) {
            errors[field] = fieldRules.message || 'CPF inválido.';
            continue;
        }

        if (fieldRules.password && !isStrongPassword(value)) {
            errors[field] =
                fieldRules.message ||
                'A senha deve possuir 8 caracteres, maiúscula, minúscula e número.';
            continue;
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

export function validateFile(file, options = {}) {
    if (!file) {
        return {
            valid: false,
            error: 'Nenhum arquivo selecionado.'
        };
    }

    const maxSize = options.maxSize ?? 10 * 1024 * 1024;
    const allowedTypes = options.allowedTypes ?? [];

    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'O arquivo excede o tamanho permitido.'
        };
    }

    if (
        allowedTypes.length &&
        !allowedTypes.includes(file.type)
    ) {
        return {
            valid: false,
            error: 'Tipo de arquivo não permitido.'
        };
    }

    return {
        valid: true,
        error: null
    };
}