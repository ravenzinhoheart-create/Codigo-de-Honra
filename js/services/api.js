const API_BASE_URL = "";

function resolveBaseUrl() {
    return (
        globalThis.window?.__MOTOCLUBE_API_BASE_URL__ ||
        API_BASE_URL
    ).replace(/\/$/, "");
}

async function request(path, options = {}) {
    const {
        method = "GET",
        body,
        headers = {},
        signal
    } = options;

    const finalHeaders = {
        Accept: "application/json",
        ...headers
    };

    let payload;

    if (body !== undefined && body !== null) {
        finalHeaders["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }

    const response = await fetch(`${resolveBaseUrl()}${path}`, {
        method,
        headers: finalHeaders,
        body: payload,
        signal
    });

    const contentType = response.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const error = new Error(
            data?.message || data || `Erro HTTP ${response.status}`
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}

export const api = {
    get(path, options = {}) {
        return request(path, {
            ...options,
            method: "GET"
        });
    },

    post(path, body, options = {}) {
        return request(path, {
            ...options,
            method: "POST",
            body
        });
    },

    put(path, body, options = {}) {
        return request(path, {
            ...options,
            method: "PUT",
            body
        });
    },

    patch(path, body, options = {}) {
        return request(path, {
            ...options,
            method: "PATCH",
            body
        });
    },

    delete(path, options = {}) {
        return request(path, {
            ...options,
            method: "DELETE"
        });
    }
};

export function configureApi(baseUrl) {
    const normalized = String(baseUrl || "").trim();

    if (!normalized) {
        return;
    }

    window.__MOTOCLUBE_API_BASE_URL__ = normalized.replace(/\/$/, "");
}

export function getApiBaseUrl() {
    return window.__MOTOCLUBE_API_BASE_URL__ || API_BASE_URL;
}