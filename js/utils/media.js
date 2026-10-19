// Motoclube — Media Utils

export const IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
];

export const VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime'
];

export function isImage(file) {
    if (!file) return false;

    return IMAGE_TYPES.includes(file.type);
}

export function isVideo(file) {
    if (!file) return false;

    return VIDEO_TYPES.includes(file.type);
}

export function isMedia(file) {
    return isImage(file) || isVideo(file);
}

export function getExtension(file) {
    if (!file) return '';

    const name = file.name || '';
    const parts = name.split('.');

    return parts.length > 1
        ? parts.pop().toLowerCase()
        : '';
}

export function getMediaType(file) {
    if (isImage(file)) return 'image';
    if (isVideo(file)) return 'video';

    return 'unknown';
}

export function createPreview(file) {
    if (!file) return null;

    return URL.createObjectURL(file);
}

export function revokePreview(url) {
    if (!url) return;

    try {
        URL.revokeObjectURL(url);
    } catch {
        // Ignora URLs inválidas.
    }
}

export function validateMedia(file, options = {}) {
    if (!file) {
        return {
            valid: false,
            error: 'Nenhum arquivo selecionado.'
        };
    }

    const maxSize = options.maxSize ?? 10 * 1024 * 1024;
    const allowedTypes =
        options.allowedTypes ??
        [...IMAGE_TYPES, ...VIDEO_TYPES];

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Formato de mídia não permitido.'
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'A mídia excede o tamanho máximo permitido.'
        };
    }

    return {
        valid: true,
        error: null
    };
}

export function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Arquivo inválido.'));
            return;
        }

        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);

        reader.readAsDataURL(file);
    });
}

export function loadImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () =>
            reject(new Error('Não foi possível carregar a imagem.'));

        image.src = source;
    });
}

export async function compressImage(
    file,
    {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 0.85,
        type = 'image/jpeg'
    } = {}
) {
    if (!isImage(file)) {
        throw new Error('O arquivo precisa ser uma imagem.');
    }

    const source = createPreview(file);

    try {
        const image = await loadImage(source);

        // Regra do CDHMC: qualquer imagem é forçada para um quadro 1:1.
        // Não há crop, letterbox ou preservação da proporção.
        const size = Math.min(maxWidth, maxHeight);

        const canvas = document.createElement('canvas');

        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Canvas indisponível.');
        }

        context.drawImage(
            image,
            0,
            0,
            size,
            size
        );

        const blob = await new Promise(resolve => {
            canvas.toBlob(
                resolve,
                type,
                quality
            );
        });

        if (!blob) {
            throw new Error('Não foi possível comprimir a imagem.');
        }

        return new File(
            [blob],
            file.name,
            {
                type: blob.type,
                lastModified: Date.now()
            }
        );
    } finally {
        revokePreview(source);
    }
}

export function createMediaInput({
    accept = [...IMAGE_TYPES, ...VIDEO_TYPES],
    multiple = false
} = {}) {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = accept.join(',');
    input.multiple = multiple;
    input.hidden = true;

    return input;
}