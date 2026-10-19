// =========================================================
// MOTOCLUBE
// Session Manager
// =========================================================

import { STORAGE_KEYS } from "./constants.js";
import { events } from "./events.js";


// =========================================================
// Estado interno
// =========================================================

let currentSession = null;


// =========================================================
// Helpers
// =========================================================

function isValidSession(session) {

    return Boolean(
        session &&
        typeof session === "object" &&
        session.user
    );
}


function persistSession(session) {
    currentSession = session || null;
}

function readPersistedSession() {
    return currentSession;
}

function initializeSession() {
    return currentSession;
}

function getSession() { return currentSession; }
function getCurrentUser() { return currentSession?.user ?? null; }
function isAuthenticated() { return Boolean(currentSession?.user); }
function setSession(sessionData) {
    if (!isValidSession(sessionData)) throw new TypeError("[SESSION] Sessão inválida.");
    currentSession = { ...sessionData };
    events.emit("session:changed", currentSession);
    events.emit("auth:login", currentSession.user);
    return currentSession;
}
function updateSession(updates) {
    if (!currentSession) throw new Error("[SESSION] Não existe sessão ativa.");
    currentSession = { ...currentSession, ...updates };
    events.emit("session:changed", currentSession);
    return currentSession;
}
function updateCurrentUser(updates) {
    if (!currentSession) throw new Error("[SESSION] Não existe sessão ativa.");
    currentSession = { ...currentSession, user: { ...currentSession.user, ...updates } };
    events.emit("session:changed", currentSession);
    events.emit("user:updated", currentSession.user);
    return currentSession.user;
}
function clearSession() { const previous=currentSession; currentSession=null; events.emit("session:changed",null); events.emit("auth:logout",previous?.user??null); }
function logout() { clearSession(); }
function hasPersistedSession() { return Boolean(currentSession); }

// =========================================================
// API pública
// =========================================================

export const session = Object.freeze({

    initialize: initializeSession,

    get: getSession,

    getUser: getCurrentUser,

    isAuthenticated,

    set: setSession,

    update: updateSession,

    updateUser: updateCurrentUser,

    clear: clearSession,

    logout,

    hasPersisted: hasPersistedSession

});


// =========================================================
// Exports nomeados
//
// Mantidos separadamente porque outros módulos
// podem importar diretamente essas funções.
// =========================================================

export {

    initializeSession,

    getSession,

    getCurrentUser,

    isAuthenticated,

    setSession,

    updateSession,

    updateCurrentUser,

    clearSession,

    logout,

    hasPersistedSession

};
// Compatibilidade com a camada de bootstrap.
export function initSession() {
    return initializeSession();
}
