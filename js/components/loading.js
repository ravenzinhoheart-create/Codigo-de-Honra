/**
 * Motoclube
 * Loading Component
 */

function createLoading(options = {}) {

    const {
        text = "Carregando...",
        fullscreen = false
    } = options;

    const loading = document.createElement("div");

    loading.className = [
        "loading",
        fullscreen ? "loading--fullscreen" : ""
    ].filter(Boolean).join(" ");

    loading.innerHTML = `
        <div class="loading__spinner"></div>

        ${
            text
                ? `<span class="loading__text">${text}</span>`
                : ""
        }
    `;

    return loading;
}

function showLoading(container, options = {}) {
    if (!container) return null;

    const loading = createLoading(options);

    container.appendChild(loading);

    return loading;
}

function hideLoading(loading) {
    loading?.remove();
}

export {
    createLoading,
    showLoading,
    hideLoading
};