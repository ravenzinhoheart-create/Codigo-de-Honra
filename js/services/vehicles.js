// =========================================================
// MOTOCLUBE — Vehicles Service / Supabase
// =========================================================

import { supabase } from "./supabase.js";
import { getCurrentUser, updateCurrentVehicle } from "./users.js";
import { VEHICLE_TYPE, LIMITS } from "../core/constants.js";

const ON_FOOT = Object.freeze({ type: VEHICLE_TYPE.ON_FOOT, id: null, name: "A pé" });

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

export async function getVehicles() {
    const user = await getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(mapVehicle);
}

export async function getCurrentVehicle() {
    const user = await getCurrentUser();
    return user?.currentVehicle || { ...ON_FOOT };
}

export async function getSelectedVehicle(userId = null) {
    const user = await getCurrentUser();
    if (!user || (userId && user.id !== userId)) return null;
    return user.currentVehicle || { ...ON_FOOT };
}

export async function createVehicle(vehicle) {
    if (![VEHICLE_TYPE.MOTORCYCLE, VEHICLE_TYPE.CAR].includes(vehicle?.type)) {
        throw new Error("Tipo de veículo inválido.");
    }

    const user = await getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const existing = await getVehicles();
    if (existing.length >= LIMITS.MAX_VEHICLES_PER_USER) {
        throw new Error(`O limite é de ${LIMITS.MAX_VEHICLES_PER_USER} veículos.`);
    }

    const { data, error } = await supabase.from("vehicles").insert({
        user_id: user.id,
        type: vehicle.type,
        brand: vehicle.brand || null,
        model: vehicle.model || null,
        year: vehicle.year ? Number(vehicle.year) : null,
        color: vehicle.color || null,
        plate: vehicle.plate || null,
        nickname: vehicle.nickname || null
    }).select("*").single();

    if (error) throw error;
    const created = mapVehicle(data);

    if (!user.currentVehicle || user.currentVehicle.type === VEHICLE_TYPE.ON_FOOT) {
        await updateCurrentVehicle(created);
    }

    return created;
}

export async function updateVehicle(vehicleId, patch = {}) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const allowed = {};
    for (const key of ["brand", "model", "color", "plate", "nickname"]) {
        if (patch[key] !== undefined) allowed[key] = patch[key] || null;
    }
    if (patch.year !== undefined) allowed.year = patch.year ? Number(patch.year) : null;
    if (patch.type !== undefined) allowed.type = patch.type;

    const { data, error } = await supabase
        .from("vehicles")
        .update(allowed)
        .eq("id", vehicleId)
        .eq("user_id", user.id)
        .select("*")
        .single();
    if (error) throw error;

    const updated = mapVehicle(data);
    if (user.currentVehicle?.id === vehicleId) await updateCurrentVehicle(updated);
    return updated;
}

export async function deleteVehicle(vehicleId) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const vehicles = await getVehicles();
    const vehicle = vehicles.find(item => item.id === vehicleId);
    if (!vehicle) throw new Error("Veículo não encontrado.");

    // A tela continuará sendo responsável por consultar eventos futuros afetados
    // antes de confirmar a exclusão, conforme a regra de negócio do app.
    const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleId)
        .eq("user_id", user.id);
    if (error) throw error;

    if (user.currentVehicle?.id === vehicleId) {
        const remaining = vehicles.filter(item => item.id !== vehicleId);
        await updateCurrentVehicle(remaining[0] || ON_FOOT);
    }

    return {
        deleted: vehicle,
        vehicles: vehicles.filter(item => item.id !== vehicleId)
    };
}

export async function selectVehicle(vehicle) {
    if (!vehicle) throw new Error("Veículo inválido.");

    if (vehicle.type === VEHICLE_TYPE.ON_FOOT) {
        await updateCurrentVehicle(ON_FOOT);
        return ON_FOOT;
    }

    const vehicles = await getVehicles();
    const exists = vehicles.some(item => item.id === vehicle.id);
    if (!exists) throw new Error("O veículo selecionado não pertence ao usuário.");

    await updateCurrentVehicle(vehicle);
    return vehicle;
}
