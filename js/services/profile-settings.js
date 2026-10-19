// =========================================================
// CÓDIGO DE HONRA — Profile Settings Service
// =========================================================

import { supabase } from "./supabase.js";

export async function getProfileSettings(userId) {
    if (!userId) throw new Error("Usuário não informado.");

    const [{ data: profile, error: profileError }, { data: contacts, error: contactsError }] = await Promise.all([
        supabase.from("profiles").select("id,username,nickname,first_name,last_name,birth_date,blood_type,phone,avatar_url").eq("id", userId).maybeSingle(),
        supabase.from("emergency_contacts").select("id,name,relationship,phone,created_at").eq("user_id", userId).order("created_at", { ascending: true }).limit(1)
    ]);

    if (profileError) throw profileError;
    if (contactsError) throw contactsError;
    if (!profile) throw new Error("Perfil não encontrado.");

    return { profile, contacts: contacts || [] };
}

export async function updateProfileSettings(userId, patch = {}) {
    if (!userId) throw new Error("Usuário não informado.");

    const allowed = {};
    if (patch.nickname !== undefined) allowed.nickname = String(patch.nickname).trim();
    if (patch.birthDate !== undefined) allowed.birth_date = patch.birthDate || null;
    if (patch.bloodType !== undefined) allowed.blood_type = String(patch.bloodType || "").trim().toUpperCase() || null;
    if (patch.phone !== undefined) allowed.phone = String(patch.phone || "").trim();
    if (patch.avatarUrl !== undefined) allowed.avatar_url = patch.avatarUrl || null;

    if (!Object.keys(allowed).length) return getProfileSettings(userId);

    const { error } = await supabase.from("profiles").update(allowed).eq("id", userId);
    if (error) throw error;

    return getProfileSettings(userId);
}

export async function saveEmergencyContact(userId, contact) {
    if (!userId) throw new Error("Usuário não informado.");

    const payload = {
        user_id: userId,
        name: String(contact.name || "").trim(),
        relationship: String(contact.relationship || "").trim(),
        phone: String(contact.phone || "").trim()
    };

    if (!payload.name || !payload.relationship || !payload.phone) {
        throw new Error("Preencha nome, relação/identificação e telefone do contato.");
    }

    if (contact.id) {
        const { data, error } = await supabase
            .from("emergency_contacts")
            .update(payload)
            .eq("id", contact.id)
            .eq("user_id", userId)
            .select("id,name,relationship,phone,created_at")
            .single();
        if (error) throw error;
        return data;
    }

    // O clube mantém apenas um contato de emergência por membro.
    // Se ainda não houver contato, cria; caso contrário, atualiza o existente.
    const { data: existing, error: existingError } = await supabase
        .from("emergency_contacts")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
    if (existingError) throw existingError;

    if (existing?.id) {
        const { data, error } = await supabase
            .from("emergency_contacts")
            .update(payload)
            .eq("id", existing.id)
            .eq("user_id", userId)
            .select("id,name,relationship,phone,created_at")
            .single();
        if (error) throw error;
        return data;
    }

    const { data, error } = await supabase
        .from("emergency_contacts")
        .insert(payload)
        .select("id,name,relationship,phone,created_at")
        .single();
    if (error) throw error;
    return data;
}

export async function deleteEmergencyContact(userId, contactId) {
    if (!userId || !contactId) throw new Error("Contato inválido.");

    const { error } = await supabase
        .from("emergency_contacts")
        .delete()
        .eq("id", contactId)
        .eq("user_id", userId);

    if (error) throw error;
}

export async function uploadProfileAvatar(userId, blob) {
    if (!userId || !(blob instanceof Blob)) throw new Error("Imagem inválida.");

    const path = `avatars/${userId}/avatar.webp`;

    const { error } = await supabase.storage
        .from("media")
        .upload(path, blob, {
            contentType: "image/webp",
            upsert: true,
            cacheControl: "3600"
        });

    if (error) throw error;

    return path;
}

export async function getMediaUrl(path, expiresIn = 3600) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path) || /^blob:/i.test(path) || /^data:/i.test(path)) return path;

    const { data, error } = await supabase.storage
        .from("media")
        .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data?.signedUrl || "";
}

export async function compressAvatar(file) {
    if (!(file instanceof Blob)) throw new Error("Imagem inválida.");

    const bitmap = await createImageBitmap(file);
    const size = 512;

    // Regra do CDHMC: toda imagem deve ocupar 100% do quadro 1:1.
    // Não fazemos crop nem preservamos a proporção original.
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
        bitmap.close?.();
        throw new Error("Não foi possível preparar a imagem.");
    }

    ctx.drawImage(bitmap, 0, 0, size, size);
    bitmap.close?.();

    const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, "image/webp", 0.82)
    );

    if (!blob) throw new Error("Não foi possível comprimir a foto.");
    return blob;
}
