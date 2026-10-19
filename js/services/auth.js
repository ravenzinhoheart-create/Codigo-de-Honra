// =========================================================
// CÓDIGO DE HONRA — Authentication Service / Supabase
// =========================================================

import { supabase } from "./supabase.js";
import {
    getSession,
    setSession,
    updateCurrentUser as updateSessionUser,
    clearSession
} from "../core/session.js";
import { USER_STATUS, VEHICLE_TYPE } from "../core/constants.js";
import { registerPushToken, disableCurrentPushToken } from "./push.js";

export const MEMBERSHIP_STATUS = Object.freeze({
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected"
});

function validateUsername(username) {
    return /^[a-zA-Z0-9_.-]{2,30}$/.test(username);
}

function mapProfile(profile, vehicles = []) {
    if (!profile) return null;
    const current = profile.current_vehicle_id
        ? vehicles.find(v => v.id === profile.current_vehicle_id)
        : null;

    return {
        id: profile.id,
        username: profile.username,
        nickname: profile.nickname || profile.username,
        firstName: profile.first_name,
        lastName: profile.last_name,
        birthDate: profile.birth_date,
        bloodType: profile.blood_type,
        phone: profile.phone,
        avatar: profile.avatar_url || null,
        status: profile.status || USER_STATUS.OFF,
        membershipStatus: profile.membership_status || MEMBERSHIP_STATUS.PENDING,
        role: profile.role || "prospecto",
        currentVehicle: current ? mapVehicle(current) : {
            type: VEHICLE_TYPE.ON_FOOT,
            id: null,
            name: "A pé"
        },
        vehicles: vehicles.map(mapVehicle),
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
    };
}

function mapVehicle(vehicle) {
    return {
        id: vehicle.id,
        type: vehicle.type,
        brand: vehicle.brand || "",
        model: vehicle.model || "",
        year: vehicle.year || "",
        color: vehicle.color || "",
        plate: vehicle.plate || "",
        nickname: vehicle.nickname || "",
        createdAt: vehicle.created_at
    };
}

async function loadProfile(userId) {
    const [{ data: profile, error: profileError }, { data: vehicles, error: vehicleError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("vehicles").select("*").eq("user_id", userId).order("created_at", { ascending: true })
    ]);

    if (profileError) throw profileError;
    if (vehicleError) throw vehicleError;
    return mapProfile(profile, vehicles || []);
}

async function establishLocalSession(authSession) {
    if (!authSession?.user?.id) {
        clearSession();
        return null;
    }

    const user = await loadProfile(authSession.user.id);
    if (!user) {
        clearSession();
        return null;
    }

    if (user.membershipStatus === MEMBERSHIP_STATUS.REJECTED) {
        await supabase.auth.signOut();
        clearSession();
        return null;
    }

    setSession({
        user,
        userId: user.id,
        username: user.username,
        authenticatedAt: authSession.user.last_sign_in_at || new Date().toISOString()
    });

    if (user.membershipStatus === MEMBERSHIP_STATUS.APPROVED) registerPushToken(user.id).catch(() => {});
    return user;
}

export async function initializeAuth() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    await establishLocalSession(data.session);

    supabase.auth.onAuthStateChange(async (_event, session) => {
        try {
            await establishLocalSession(session);
        } catch (error) {
            console.error("[AUTH] Falha ao sincronizar sessão:", error);
        }
    });

    // Token FCM pode ser renovado enquanto o app estava fechado. Ao voltar para
    // primeiro plano, sempre perguntamos ao Firebase pelo token atual e
    // sincronizamos novamente o registro do aparelho.
    if (!window.__cdhmcPushRefreshInstalled) {
        window.__cdhmcPushRefreshInstalled = true;
        const refreshPush = () => {
            const current = getSession()?.user;
            if (current?.membershipStatus === MEMBERSHIP_STATUS.APPROVED) {
                registerPushToken(current.id).catch(() => {});
            }
        };
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") refreshPush();
        });
        window.addEventListener("pageshow", refreshPush);
    }

    return getSession();
}

export async function register(usernameOrOptions, password, passwordConfirmation) {
    const credentials = typeof usernameOrOptions === "object"
        ? usernameOrOptions
        : { username: usernameOrOptions, password, passwordConfirmation };

    const username = String(credentials.username ?? credentials.nickname ?? "").trim();
    const pass = String(credentials.password ?? "");
    const confirmation = String(credentials.passwordConfirmation ?? credentials.confirmPassword ?? "");

    if (!validateUsername(username)) {
        throw new Error("O nickname deve ter entre 2 e 30 caracteres e usar apenas letras, números, ponto, hífen ou underline.");
    }
    if (pass.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
    if (pass !== confirmation) throw new Error("As senhas não coincidem.");

    const payload = {
        action: "register",
        username,
        password: pass,
        passwordConfirmation: confirmation,
        firstName: String(credentials.firstName || "").trim(),
        lastName: String(credentials.lastName || "").trim(),
        birthDate: String(credentials.birthDate || "").trim(),
        bloodType: String(credentials.bloodType || "").trim().toUpperCase(),
        phone: String(credentials.phone || "").trim(),
        emergencyName: String(credentials.emergencyName || "").trim(),
        emergencyRelationship: String(credentials.emergencyRelationship || "").trim(),
        emergencyPhone: String(credentials.emergencyPhone || "").trim()
    };

    const { data, error } = await supabase.functions.invoke("username-auth", {
        body: payload
    });

    if (error) {
        let message = error.message || "Falha ao criar conta.";
        try {
            const details = await error.context?.json?.();
            message = details?.error || message;
        } catch (_) {}
        throw new Error(message);
    }
    if (!data?.user) throw new Error("O servidor não retornou o usuário criado.");

    clearSession();
    return data;
}

export async function authenticate(usernameOrOptions, password) {
    const credentials = typeof usernameOrOptions === "object"
        ? usernameOrOptions
        : { username: usernameOrOptions, password };

    const username = String(credentials.username ?? credentials.nickname ?? "").trim();
    const pass = String(credentials.password ?? "");
    if (!username || !pass) throw new Error("Informe nickname e senha.");

    const { data, error } = await supabase.functions.invoke("username-auth", {
        body: {
            action: "login",
            username,
            password: pass
        }
    });

    if (error) {
        let message = error.message || "Nickname ou senha inválidos.";
        try {
            const details = await error.context?.json?.();
            message = details?.error || message;
        } catch (_) {}
        throw new Error(message);
    }

    if (!data?.session?.access_token || !data?.session?.refresh_token) {
        throw new Error("O servidor não retornou uma sessão válida.");
    }

    const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
    });

    if (sessionError) throw sessionError;

    const user = await establishLocalSession({
        user: { id: data.user.id, last_sign_in_at: new Date().toISOString() }
    });

    if (!user) throw new Error("Não foi possível carregar o perfil do membro.");
    return { user, session: getSession() };
}

export const login = authenticate;

export function logout() {
    // Encerra a sessão local imediatamente para liberar a navegação para o Login.
    clearSession();

    // Limpeza remota em segundo plano. Não bloqueia a troca de tela.
    Promise.allSettled([
        disableCurrentPushToken(),
        supabase.auth.signOut()
    ]).catch((error) => {
        console.warn("[AUTH] Falha durante a limpeza da sessão:", error);
    });
}

export function isAuthenticated() {
    return Boolean(getSession()?.user);
}

export function getCurrentSession() {
    return getSession();
}

export async function getCurrentUser() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user?.id) {
        clearSession();
        return null;
    }
    const user = await loadProfile(data.session.user.id);
    if (user) updateSessionUser(user);
    return user;
}

export async function updateCurrentUser(patch = {}) {
    const current = await getCurrentUser();
    if (!current) throw new Error("Sessão não encontrada.");

    const allowed = {};
    if (patch.nickname !== undefined) allowed.nickname = String(patch.nickname).trim();
    if (patch.firstName !== undefined) allowed.first_name = String(patch.firstName).trim();
    if (patch.lastName !== undefined) allowed.last_name = String(patch.lastName).trim();
    if (patch.birthDate !== undefined) allowed.birth_date = patch.birthDate;
    if (patch.bloodType !== undefined) allowed.blood_type = patch.bloodType;
    if (patch.phone !== undefined) allowed.phone = String(patch.phone).trim();
    if (patch.avatar !== undefined) allowed.avatar_url = patch.avatar;
    if (patch.status !== undefined) allowed.status = patch.status;
    if (patch.currentVehicleId !== undefined) allowed.current_vehicle_id = patch.currentVehicleId;

    if (Object.keys(allowed).length) {
        const { error } = await supabase.from("profiles").update(allowed).eq("id", current.id);
        if (error) throw error;
    }

    const updated = await loadProfile(current.id);
    updateSessionUser(updated);
    return updated;
}

export async function updateUsername(username) {
    const normalized = String(username || "").trim().toLowerCase();
    if (!validateUsername(normalized)) {
        throw new Error("O username deve ter entre 2 e 30 caracteres e usar apenas letras, números, ponto, hífen ou underline.");
    }

    const { data, error } = await supabase.functions.invoke("username-auth", {
        body: { action: "update_username", username: normalized }
    });

    if (error) {
        let message = error.message || "Não foi possível alterar o username.";
        try {
            const details = await error.context?.json?.();
            message = details?.error || message;
        } catch (_) {}
        throw new Error(message);
    }

    if (!data?.username) throw new Error("O servidor não confirmou o novo username.");
    return data;
}

export async function getRegisteredMemberRecord(userId) {
    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error || !profile) return null;

    const { data: emergency } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

    return {
        id: profile.id,
        nickname: profile.nickname || profile.username,
        membershipStatus: profile.membership_status,
        registrationData: {
            firstName: profile.first_name,
            lastName: profile.last_name,
            birthDate: profile.birth_date,
            bloodType: profile.blood_type,
            phone: profile.phone,
            emergencyContacts: emergency || []
        }
    };
}

export function getMembershipStatusForUser(user) {
    return user?.membershipStatus || MEMBERSHIP_STATUS.PENDING;
}

export const auth = Object.freeze({
    register,
    authenticate,
    login,
    logout,
    initializeAuth,
    isAuthenticated,
    getCurrentSession,
    getCurrentUser,
    updateCurrentUser,
    updateUsername,
    getMembershipStatusForUser,
    getRegisteredMemberRecord,
    MEMBERSHIP_STATUS
});

export default auth;

