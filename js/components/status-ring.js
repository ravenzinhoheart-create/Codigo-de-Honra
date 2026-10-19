/**
 * Motoclube
 * Status Ring
 */

const STATUS = Object.freeze({
    OFF: "off",
    ON: "on",
    RIDE: "ride",
    SOS: "sos"
});

function createStatusRing(status) {
    const ring = document.createElement("span");

    ring.className = "status-ring";

    setStatus(ring, status);

    return ring;
}

function setStatus(element, status) {
    if (!element) return;

    const normalizedStatus =
        Object.values(STATUS).includes(status)
            ? status
            : STATUS.OFF;

    element.dataset.status = normalizedStatus;
    element.setAttribute(
        "aria-label",
        getStatusLabel(normalizedStatus)
    );
}

function getStatusLabel(status) {
    switch (status) {
        case STATUS.ON:
            return "Online";

        case STATUS.RIDE:
            return "Em ride";

        case STATUS.SOS:
            return "SOS";

        default:
            return "Offline";
    }
}

export {
    STATUS,
    createStatusRing,
    setStatus,
    getStatusLabel
};