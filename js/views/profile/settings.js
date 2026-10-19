import { router } from "../../core/router.js";
import { getCurrentUser } from "../../services/auth.js";
import { updateCurrentUser, updateUsername } from "../../services/auth.js";
import {
    getProfileSettings,
    updateProfileSettings,
    saveEmergencyContact,
    deleteEmergencyContact,
    uploadProfileAvatar,
    getMediaUrl,
    compressAvatar
} from "../../services/profile-settings.js";
import NativeGallery from "../../native/gallery.js";
import { showToast } from "../../components/toast.js";
import { icon, hydrateIcons } from "../../icons/icons.js";
import { openBottomSheet } from "../../components/bottom-sheet.js";
import { events } from "../../core/events.js";

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function maskPhone(value = "") {
    const digits = String(value).replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validPhone(value) {
    return [10, 11].includes(String(value || "").replace(/\D/g, "").length);
}

function field(label, name, value, attrs = "") {
    return `
        <label class="settings-field">
            <span>${label}</span>
            <input name="${name}" value="${escapeHTML(value ?? "")}" ${attrs}>
        </label>
    `;
}

function renderContact(contact = {}) {
    return `
        <article class="settings-contact" data-contact-id="${escapeHTML(contact.id || "new-contact")}">
            <div class="settings-contact__header">
                <div>
                    <strong>Contato de emergência</strong>
                    <small>Uma pessoa para ser acionada em uma emergência.</small>
                </div>
            </div>
            ${field("Nome", "contact_name", contact.name || "")}
            ${field("Relação / identificação", "contact_relationship", contact.relationship || "")}
            ${field("Telefone", "contact_phone", maskPhone(contact.phone || ""), 'inputmode="tel" autocomplete="tel" maxlength="15"')}
            <button type="button" class="button button--secondary settings-contact-save" data-contact-save>
                ${icon("save", { size: 17, decorative: true })}
                <span>Salvar contato</span>
            </button>
        </article>
    `;
}

export async function renderSettings() {
    const root = document.querySelector("#app-view");
    if (!root) return;

    root.__settingsCleanup?.();
    root.__settingsCleanup = null;

    const user = await getCurrentUser();
    if (!user) {
        await router.navigate("login");
        return;
    }

    let data = await getProfileSettings(user.id);
    let avatarUrl = "";
    try {
        avatarUrl = await getMediaUrl(data.profile.avatar_url);
    } catch (error) {
        console.warn("[SETTINGS] Não foi possível gerar URL da foto:", error);
    }

    const contact = data.contacts[0] || { name: "", relationship: "", phone: "" };

    root.innerHTML = `
        <section class="settings-view settings-view--profile">
            <header class="settings-view__header">
                <button type="button" class="icon-button" data-action="back" aria-label="Voltar">
                    <span data-icon="arrow-left"></span>
                </button>
                <div>
                    <span class="settings-view__eyebrow">MINHA CONTA</span>
                    <h1>Configurações</h1>
                </div>
            </header>

            <form class="settings-profile-form" id="settings-profile-form">
                <section class="settings-profile-card settings-profile-card--identity">
                    <div class="settings-avatar-wrap">
                        <div class="settings-avatar">
                            ${avatarUrl
                                ? `<img src="${escapeHTML(avatarUrl)}" alt="Foto de perfil" data-avatar-preview>`
                                : `<span data-icon="user"></span>`}
                        </div>
                        <button type="button" class="settings-avatar-button" data-change-avatar>
                            ${icon("camera", { size: 17, decorative: true })}
                            <span>Trocar foto</span>
                        </button>
                    </div>
                    <div class="settings-profile-nickname">
                        <span class="settings-profile-status">MEMBRO</span>
                        <strong>@${escapeHTML(data.profile.nickname || data.profile.username || "")}</strong>
                        <small>O nome civil não pode ser alterado por aqui.</small>
                    </div>
                </section>

                <section class="settings-section settings-section--profile">
                    <h2>Dados pessoais</h2>
                    <div class="settings-grid settings-grid--two">
                        ${field("Nome", "first_name", data.profile.first_name || "", "readonly")}
                        ${field("Sobrenome", "last_name", data.profile.last_name || "", "readonly")}
                    </div>
                    ${field("Nickname", "nickname", data.profile.nickname || data.profile.username || "", 'autocomplete="nickname" maxlength="30"')}
                    <p class="settings-field-hint">Seu nickname é também seu identificador de acesso ao clube. Ao alterá-lo, o login também muda.</p>
                    <div class="settings-grid settings-grid--two">
                        ${field("Data de nascimento", "birth_date", data.profile.birth_date || "", 'type="date"')}
                        <label class="settings-field">
                            <span>Tipo sanguíneo</span>
                            <button type="button" class="settings-dropdown" data-blood-dropdown>
                                <span data-blood-value>${escapeHTML(data.profile.blood_type || "Selecionar")}</span>
                                <span data-icon="chevron-down"></span>
                            </button>
                            <input type="hidden" name="blood_type" value="${escapeHTML(data.profile.blood_type || "")}">
                            <div class="settings-dropdown-menu" data-blood-menu>
                                ${["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(type => `
                                    <button type="button" data-blood-value-option="${type}">${type}</button>
                                `).join("")}
                            </div>
                        </label>
                    </div>
                    ${field("Telefone", "phone", maskPhone(data.profile.phone || ""), 'inputmode="tel" autocomplete="tel" maxlength="15"')}
                </section>

                <section class="settings-section settings-section--profile">
                    <div class="settings-section__heading">
                        <div>
                            <h2>Contato de emergência</h2>
                            <p>Mantenha uma única pessoa de referência sempre atualizada.</p>
                        </div>
                    </div>
                    <div class="settings-contacts" data-contacts>
                        ${renderContact(contact)}
                    </div>
                </section>

                <div class="settings-save-bar">
                    <button type="submit" class="button button--primary" data-save-profile>
                        ${icon("save", { size: 18, decorative: true })}
                        <span>Salvar alterações</span>
                    </button>
                </div>
            </form>
        </section>
    `;

    hydrateIcons(root);

    const phoneInput = root.querySelector('input[name="phone"]');
    phoneInput?.addEventListener("input", () => {
        phoneInput.value = maskPhone(phoneInput.value);
    });

    root.querySelectorAll('input[name="contact_phone"]').forEach(input => {
        input.addEventListener("input", () => input.value = maskPhone(input.value));
    });

    const dropdown = root.querySelector("[data-blood-dropdown]");
    const menu = root.querySelector("[data-blood-menu]");
    dropdown?.addEventListener("click", () => menu?.classList.toggle("settings-dropdown-menu--open"));
    root.querySelectorAll("[data-blood-value-option]").forEach(option => {
        option.addEventListener("click", () => {
            root.querySelector('input[name="blood_type"]').value = option.dataset.bloodValueOption;
            root.querySelector("[data-blood-value]").textContent = option.dataset.bloodValueOption;
            menu?.classList.remove("settings-dropdown-menu--open");
        });
    });

    const closeDropdown = event => {
        if (!event.target.closest("[data-blood-dropdown], [data-blood-menu]")) {
            menu?.classList.remove("settings-dropdown-menu--open");
        }
    };
    document.addEventListener("click", closeDropdown);

    root.querySelector("[data-action='back']")?.addEventListener("click", () => router.back());

    root.querySelector("[data-change-avatar]")?.addEventListener("click", () => {
        let pendingBlob = null;
        let pendingPreviewUrl = "";
        let saved = false;

        const currentPreview = root.querySelector("[data-avatar-preview]")?.getAttribute("src") || "";
        const content = document.createElement("div");
        content.className = "settings-avatar-sheet";
        content.innerHTML = `
            <div class="settings-avatar-sheet__preview" data-avatar-sheet-preview>
                ${currentPreview
                    ? `<img src="${escapeHTML(currentPreview)}" alt="Pré-visualização da foto de perfil" data-avatar-preview>`
                    : `<span data-icon="user"></span>`}
            </div>
            <div class="settings-avatar-sheet__actions">
                <button type="button" class="button button--primary" data-avatar-gallery>
                    ${icon("image", { size: 18, decorative: true })}
                    <span>Trocar foto</span>
                </button>
                <button type="button" class="button button--primary" data-avatar-save disabled>
                    ${icon("save", { size: 18, decorative: true })}
                    <span>Salvar alteração</span>
                </button>
                <button type="button" class="button button--ghost" data-avatar-cancel>
                    Cancelar
                </button>
            </div>
        `;

        const revokePendingPreview = () => {
            if (pendingPreviewUrl?.startsWith("blob:")) {
                try { URL.revokeObjectURL(pendingPreviewUrl); } catch (_) {}
            }
            pendingPreviewUrl = "";
            pendingBlob = null;
        };

        const setSheetPreview = url => {
            const preview = content.querySelector("[data-avatar-sheet-preview]");
            if (!preview) return;
            if (url) {
                preview.innerHTML = `<img src="${escapeHTML(url)}" alt="Pré-visualização da foto de perfil" data-avatar-preview>`;
            } else {
                preview.innerHTML = `<span data-icon="user"></span>`;
                hydrateIcons(preview);
            }
        };

        const sheet = openBottomSheet({
            title: "Foto de perfil",
            subtitle: "A nova foto só será aplicada quando você salvar a alteração.",
            content,
            className: "bottom-sheet--avatar-picker",
            onClose: () => {
                if (!saved) revokePendingPreview();
            }
        });
        if (!sheet) return;

        const galleryButton = content.querySelector("[data-avatar-gallery]");
        const saveButton = content.querySelector("[data-avatar-save]");

        content.querySelector("[data-avatar-cancel]")?.addEventListener("click", () => sheet.close());

        galleryButton?.addEventListener("click", async () => {
            galleryButton.disabled = true;
            try {
                const media = await NativeGallery.pick({ multiple: false, accept: "image/*" });
                const file = media?.[0];
                if (!file) return;

                const blob = file instanceof Blob
                    ? file
                    : (file.file instanceof Blob ? file.file : (file.blob instanceof Blob ? file.blob : null));
                if (!(blob instanceof Blob)) {
                    showToast({ type: "error", message: "Não foi possível obter a imagem selecionada." });
                    return;
                }

                const compressed = await compressAvatar(blob);
                revokePendingPreview();
                pendingBlob = compressed;
                pendingPreviewUrl = URL.createObjectURL(compressed);
                setSheetPreview(pendingPreviewUrl);
                if (saveButton) saveButton.disabled = false;
            } catch (error) {
                console.error("[SETTINGS] Falha ao preparar avatar:", error);
                showToast({ type: "error", message: error.message || "Não foi possível preparar a foto." });
            } finally {
                galleryButton.disabled = false;
            }
        });

        saveButton?.addEventListener("click", async () => {
            if (!(pendingBlob instanceof Blob)) return;
            saveButton.disabled = true;
            galleryButton.disabled = true;

            try {
                const path = await uploadProfileAvatar(user.id, pendingBlob);
                await updateProfileSettings(user.id, { avatarUrl: path });
                await updateCurrentUser({ avatar: path });

                const avatar = root.querySelector(".settings-avatar");
                if (avatar) {
                    avatar.innerHTML = `<img src="${escapeHTML(pendingPreviewUrl)}" alt="Foto de perfil" data-avatar-preview>`;
                }

                // O path do avatar é estável (avatars/{userId}/avatar.webp).
                // Invalida a URL anterior e atualiza todos os avatares da sessão
                // imediatamente, sem esperar uma nova navegação.
                events.emit("profile:avatar-updated", {
                    userId: user.id,
                    path,
                    previewUrl: pendingPreviewUrl
                });

                saved = true;
                showToast({ type: "success", message: "Foto de perfil atualizada." });
                sheet.close();
            } catch (error) {
                console.error("[SETTINGS] Falha ao salvar avatar:", error);
                saveButton.disabled = false;
                galleryButton.disabled = false;
                showToast({ type: "error", message: error.message || "Não foi possível salvar a foto." });
            }
        });

        hydrateIcons(content);
    });


    function bindContact(card) {
        card.querySelector('input[name="contact_phone"]')?.addEventListener("input", event => {
            event.target.value = maskPhone(event.target.value);
        });
        card.querySelector("[data-contact-save]")?.addEventListener("click", async () => {
            const payload = {
                id: card.dataset.contactId?.startsWith("new-") ? null : card.dataset.contactId,
                name: card.querySelector('input[name="contact_name"]')?.value,
                relationship: card.querySelector('input[name="contact_relationship"]')?.value,
                phone: card.querySelector('input[name="contact_phone"]')?.value
            };
            if (!payload.name || !payload.relationship || !validPhone(payload.phone)) {
                showToast({ type: "error", message: "Preencha os dados do contato e informe um telefone válido." });
                return;
            }
            try {
                const saved = await saveEmergencyContact(user.id, payload);
                card.dataset.contactId = saved.id;
                showToast({ type: "success", message: "Contato de emergência salvo." });
            } catch (error) {
                console.error("[SETTINGS] Falha ao salvar contato:", error);
                showToast({ type: "error", message: error.message || "Não foi possível salvar o contato." });
            }
        });

    }

    root.querySelectorAll(".settings-contact").forEach(bindContact);

    root.querySelector("#settings-profile-form")?.addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = root.querySelector("[data-save-profile]");
        button.disabled = true;

        try {
            const nickname = form.querySelector('[name="nickname"]').value.trim().toLowerCase();
            const birthDate = form.querySelector('[name="birth_date"]').value;
            const bloodType = form.querySelector('[name="blood_type"]').value;
            const phone = form.querySelector('[name="phone"]').value;

            if (!nickname) throw new Error("Informe um nickname.");
            if (!validPhone(phone)) throw new Error("Informe um telefone válido com DDD.");

            const currentLogin = String(data.profile.username || "").toLowerCase();
            const nextLogin = nickname;
            if (nextLogin !== currentLogin) {
                await updateUsername(nextLogin);
                data.profile.username = nextLogin;
            }

            await updateProfileSettings(user.id, {
                nickname: nextLogin,
                birthDate,
                bloodType,
                phone
            });
            await updateCurrentUser({ nickname: nextLogin, username: nextLogin, birthDate, bloodType, phone });

            showToast({ type: "success", message: "Dados do perfil atualizados." });
        } catch (error) {
            console.error("[SETTINGS] Falha ao salvar perfil:", error);
            showToast({ type: "error", message: error.message || "Não foi possível salvar as alterações." });
        } finally {
            button.disabled = false;
        }
    });

    root.__settingsCleanup = () => document.removeEventListener("click", closeDropdown);
}

export function initializeSettings(data = {}) {
    renderSettings(data);
}
