// =========================================================
// MOTOCLUBE — Users / Profiles Service
// =========================================================

import { supabase } from "./supabase.js";
import { getCurrentUser as getAuthCurrentUser, updateCurrentUser as updateAuthUser } from "./auth.js";
import { USER_STATUS } from "../core/constants.js";
import { transitionStatus, isValidStatus } from "../core/permissions.js";
import { store } from "../core/store.js";

export async function getCurrentUser() {
    return getAuthCurrentUser();
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

function mapPublicProfile(data, vehicles = []) {
    const mappedVehicles = vehicles.map(mapVehicle);
    const currentVehicle = data.current_vehicle_id
        ? mappedVehicles.find(vehicle => String(vehicle.id) === String(data.current_vehicle_id))
        : null;
    return {
        id: data.id,
        username: data.username,
        nickname: data.nickname || data.username,
        firstName: data.first_name,
        lastName: data.last_name,
        birthDate: data.birth_date,
        bloodType: data.blood_type,
        phone: data.phone,
        avatar: data.avatar_url || null,
        status: data.status,
        membershipStatus: data.membership_status,
        role: data.role,
        currentVehicle: currentVehicle || { type: "on_foot", id: null, name: "A pé" },
        currentVehicleId: currentVehicle?.id || null,
        vehicles: mappedVehicles,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

async function getVehiclesForUsers(userIds = []) {
    const ids = [...new Set(userIds.filter(Boolean).map(String))];
    if (!ids.length) return [];
    const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("user_id", ids)
        .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function getUser(userId) {
    if (!userId) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    if (!data) return null;

    // O perfil continua disponível mesmo que uma política de leitura impeça
    // consultar a garagem. Nesse caso, o app exibe o perfil e registra o motivo.
    let vehicles = [];
    try {
        vehicles = await getVehiclesForUsers([userId]);
    } catch (vehicleError) {
        console.warn("[USERS] Não foi possível carregar a garagem do membro:", vehicleError);
    }
    return mapPublicProfile(data, vehicles);
}

export async function getMembers() {
    const { data, error } = await supabase
        .from("profiles")
        .select("id,username,nickname,avatar_url,status,membership_status,role,created_at,current_vehicle_id")
        .eq("membership_status", "approved")
        .order("nickname", { ascending: true });
    if (error) throw error;

    const profiles = data || [];
    let vehicles = [];
    try {
        vehicles = await getVehiclesForUsers(profiles.map(item => item.id));
    } catch (vehicleError) {
        // Não bloquear lista do clube/notificações caso RLS limite a garagem.
        console.warn("[USERS] Não foi possível carregar veículos dos membros:", vehicleError);
    }

    return profiles.map(item => {
        const memberVehicles = vehicles.filter(vehicle => String(vehicle.user_id) === String(item.id)).map(mapVehicle);
        const currentVehicle = item.current_vehicle_id
            ? memberVehicles.find(vehicle => String(vehicle.id) === String(item.current_vehicle_id))
            : null;
        return {
            id: item.id,
            username: item.username,
            nickname: item.nickname || item.username,
            avatar: item.avatar_url || null,
            status: item.status,
            membershipStatus: item.membership_status,
            role: item.role,
            currentVehicle: currentVehicle || { type: "on_foot", id: null, name: "A pé" },
            currentVehicleId: currentVehicle?.id || null,
            vehicles: memberVehicles,
            createdAt: item.created_at
        };
    });
}

export async function updateUser(userId, patch = {}) {
    const current = await getAuthCurrentUser();
    if (!current || current.id !== userId) throw new Error("Você só pode alterar seu próprio perfil.");

    const dbPatch = {};
    if (patch.nickname !== undefined) dbPatch.nickname = String(patch.nickname).trim();
    if (patch.firstName !== undefined) dbPatch.first_name = String(patch.firstName).trim();
    if (patch.lastName !== undefined) dbPatch.last_name = String(patch.lastName).trim();
    if (patch.birthDate !== undefined) dbPatch.birth_date = patch.birthDate;
    if (patch.bloodType !== undefined) dbPatch.blood_type = patch.bloodType;
    if (patch.phone !== undefined) dbPatch.phone = String(patch.phone).trim();
    if (patch.avatar !== undefined) dbPatch.avatar_url = patch.avatar;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.currentVehicleId !== undefined) dbPatch.current_vehicle_id = patch.currentVehicleId;

    if (patch.currentVehicle !== undefined) {
        dbPatch.current_vehicle_id = patch.currentVehicle?.id || null;
    }

    const { error } = await supabase.from("profiles").update(dbPatch).eq("id", userId);
    if (error) throw error;

    const updated = await getAuthCurrentUser();
    store.set("profile.user", updated);
    if (updated?.currentVehicle) store.set("profile.currentVehicle", updated.currentVehicle);
    return updated;
}

export async function updateStatus(status) {
    const user = await getAuthCurrentUser();
    if (!user) throw new Error("Usuário não autenticado.");
    if (!isValidStatus(status)) throw new Error("Status de membro inválido.");

    const transition = transitionStatus(user.status || USER_STATUS.OFF, status);
    if (!transition.allowed) throw new Error(transition.reason);

    return updateUser(user.id, { status });
}

export async function updateCurrentVehicle(vehicle) {
    const user = await getAuthCurrentUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const vehicleId = vehicle?.type === "on_foot" ? null : vehicle?.id || null;
    const updated = await updateUser(user.id, { currentVehicleId: vehicleId });
    store.set("profile.currentVehicle", updated?.currentVehicle || {
        type: "on_foot",
        id: null,
        name: "A pé"
    });
    return updated;
}
