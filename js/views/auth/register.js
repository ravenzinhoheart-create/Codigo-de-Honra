// =========================================================
// CÓDIGO DE HONRA
// Register View
// =========================================================

import { router } from "../../core/router.js";
import { auth } from "../../services/auth.js";
import { showToast } from "../../components/toast.js";
import { createSelectDropdown } from "../../components/dropdown.js";

const BLOOD_TYPES = [
    "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
];

function maskPhone(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    return value;
}

function inputField({ id, name, label, type = "text", placeholder, autocomplete, required = true }) {
    return `
        <div class="auth-field">
            <label for="${id}">${label}</label>
            <div class="auth-input-wrap">
                <input
                    id="${id}"
                    name="${name}"
                    type="${type}"
                    ${autocomplete ? `autocomplete="${autocomplete}"` : ""}
                    placeholder="${placeholder}"
                    ${required ? "required" : ""}
                />
            </div>
        </div>
    `;
}

export async function renderRegister(container) {

    container.innerHTML = `
        <main class="auth-screen auth-screen--register">
            <section class="auth-container">
<section class="auth-card">
                    <div class="auth-heading">
                        <span class="auth-kicker">CADASTRO DO MEMBRO</span>
                        <h2>Criar conta</h2>
                        <p>Seus dados de registro ficam disponíveis somente para a diretoria.</p>
                    </div>

                    <form id="register-form" class="auth-form auth-form--register" novalidate>

                        <div class="auth-section-label">Identificação</div>

                        <div class="auth-field-grid">
                            ${inputField({
                                id: "register-first-name",
                                name: "firstName",
                                label: "Nome",
                                placeholder: "Seu nome",
                                autocomplete: "given-name"
                            })}
                            ${inputField({
                                id: "register-last-name",
                                name: "lastName",
                                label: "Sobrenome",
                                placeholder: "Seu sobrenome",
                                autocomplete: "family-name"
                            })}
                        </div>

                        ${inputField({
                            id: "register-nickname",
                            name: "nickname",
                            label: "Nickname",
                            placeholder: "Como será conhecido no clube",
                            autocomplete: "username"
                        })}

                        <div class="auth-field-grid">
                            ${inputField({
                                id: "register-birth-date",
                                name: "birthDate",
                                label: "Data de nascimento",
                                type: "date",
                                autocomplete: "bday"
                            })}

                            <div class="auth-field">
                                <label for="register-blood-type">Tipo sanguíneo</label>
                                <div class="auth-input-wrap">
                                    <select id="register-blood-type" name="bloodType" required>
                                        <option value="" selected disabled>Selecione</option>
                                        ${BLOOD_TYPES.map(type => `<option value="${type}">${type}</option>`).join("")}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="auth-section-label">Contato</div>

                        ${inputField({
                            id: "register-phone",
                            name: "phone",
                            label: "Telefone para contato",
                            type: "tel",
                            placeholder: "(00) 00000-0000",
                            autocomplete: "tel"
                        })}

                        ${inputField({
                            id: "register-emergency-name",
                            name: "emergencyName",
                            label: "Nome do contato de emergência",
                            placeholder: "Nome completo",
                            autocomplete: "name"
                        })}

                        ${inputField({
                            id: "register-emergency-relationship",
                            name: "emergencyRelationship",
                            label: "Relação / identificação",
                            placeholder: "Ex.: esposa, mãe, irmão..."
                        })}

                        ${inputField({
                            id: "register-emergency-phone",
                            name: "emergencyPhone",
                            label: "Telefone para contato de emergência",
                            type: "tel",
                            placeholder: "(00) 00000-0000",
                            autocomplete: "tel"
                        })}

                        <div class="auth-section-label">Acesso ao app</div>

                        <div class="auth-field">
                            <label for="register-password">Senha</label>
                            <div class="auth-input-wrap">
                                <input
                                    id="register-password"
                                    name="password"
                                    type="password"
                                    autocomplete="new-password"
                                    placeholder="Crie sua senha"
                                    required
                                />
                                <button type="button" class="auth-password-toggle" id="register-password-toggle" aria-label="Mostrar senha">
                                    <span class="password-icon password-icon--eye" data-icon="eye"></span><span class="password-icon password-icon--eye-off" data-icon="eyeOff"></span>
                                </button>
                            </div>
                        </div>

                        <div class="auth-field">
                            <label for="register-password-confirm">Confirmação de senha</label>
                            <div class="auth-input-wrap">
                                <input
                                    id="register-password-confirm"
                                    name="passwordConfirmation"
                                    type="password"
                                    autocomplete="new-password"
                                    placeholder="Digite a senha novamente"
                                    required
                                />
                                <button type="button" class="auth-password-toggle" id="register-password-confirm-toggle" aria-label="Mostrar confirmação de senha">
                                    <span class="password-icon password-icon--eye" data-icon="eye"></span><span class="password-icon password-icon--eye-off" data-icon="eyeOff"></span>
                                </button>
                            </div>
                        </div>

                        <p class="auth-private-note">
                            Após o cadastro, sua conta ficará em <strong>fila de espera</strong> até ser liberada pela diretoria.
                        </p>

                        <button type="submit" class="auth-submit">Solicitar cadastro</button>
                    </form>

                    <div id="register-success" class="auth-pending-card" hidden>
                        <div class="auth-pending-icon"><span data-icon="clock"></span></div>
                        <span class="auth-kicker">CADASTRO RECEBIDO</span>
                        <h2>Aguardando liberação</h2>
                        <p>
                            Seu cadastro foi salvo com segurança. A diretoria precisa liberar seu acesso antes que você possa entrar no app.
                        </p>
                        <div class="auth-pending-status">
                            <span class="auth-status-dot"></span>
                            <span>Em análise pela diretoria</span>
                        </div>
                        <button type="button" class="auth-submit auth-submit--secondary" id="pending-go-login">Voltar para o login</button>
                    </div>

                    <div class="auth-divider">
                        <span></span><strong>ou</strong><span></span>
                    </div>

                    <div class="auth-switch">
                        <span>Já possui uma conta?</span>
                        <button type="button" class="auth-switch-button" id="go-login">Entrar</button>
                    </div>
                </section>
            </section>
        </main>
    `;

    const form = container.querySelector("#register-form");
    const firstName = container.querySelector("#register-first-name");
    const lastName = container.querySelector("#register-last-name");
    const nickname = container.querySelector("#register-nickname");
    const birthDate = container.querySelector("#register-birth-date");
    const bloodType = container.querySelector("#register-blood-type");
    createSelectDropdown(bloodType);
    const phone = container.querySelector("#register-phone");
    const emergencyName = container.querySelector("#register-emergency-name");
    const emergencyRelationship = container.querySelector("#register-emergency-relationship");
    const emergencyPhone = container.querySelector("#register-emergency-phone");
    const password = container.querySelector("#register-password");
    const passwordConfirmation = container.querySelector("#register-password-confirm");
    const passwordToggle = container.querySelector("#register-password-toggle");
    const passwordConfirmationToggle = container.querySelector("#register-password-confirm-toggle");
    const loginButton = container.querySelector("#go-login");
    const pendingLoginButton = container.querySelector("#pending-go-login");
    const successCard = container.querySelector("#register-success");

    const applyPhoneMask = input => {
        input?.addEventListener("input", () => {
            input.value = maskPhone(input.value);
        });
        input?.addEventListener("blur", () => {
            input.value = maskPhone(input.value);
        });
    };

    applyPhoneMask(phone);
    applyPhoneMask(emergencyPhone);

    passwordToggle?.addEventListener("click", () => {
        const visible = password.type === "text";
        password.type = visible ? "password" : "text";
        passwordToggle.classList.toggle("is-visible", !visible);
        passwordToggle.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
    });

    passwordConfirmationToggle?.addEventListener("click", () => {
        const visible = passwordConfirmation.type === "text";
        passwordConfirmation.type = visible ? "password" : "text";
        passwordConfirmationToggle.classList.toggle("is-visible", !visible);
        passwordConfirmationToggle.setAttribute("aria-label", visible ? "Mostrar confirmação de senha" : "Ocultar confirmação de senha");
    });

    const goLogin = () => router.navigate("login");
    loginButton?.addEventListener("click", goLogin);
    pendingLoginButton?.addEventListener("click", goLogin);

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const payload = {
            firstName: firstName.value.trim(),
            lastName: lastName.value.trim(),
            nickname: nickname.value.trim(),
            birthDate: birthDate.value,
            bloodType: bloodType.value,
            phone: phone.value.trim(),
            emergencyName: emergencyName.value.trim(),
            emergencyRelationship: emergencyRelationship.value.trim(),
            emergencyPhone: emergencyPhone.value.trim(),
            password: password.value,
            passwordConfirmation: passwordConfirmation.value
        };

        if (Object.values(payload).some(value => !String(value || "").trim())) {
            showToast("Preencha todos os campos.", { type: "warning" });
            return;
        }

        if (payload.password !== payload.passwordConfirmation) {
            showToast("As senhas não coincidem.", { type: "warning" });
            passwordConfirmation.focus();
            return;
        }

        if (new Date(`${payload.birthDate}T00:00:00`) > new Date()) {
            showToast("A data de nascimento não pode estar no futuro.", { type: "warning" });
            birthDate.focus();
            return;
        }

        const submit = form.querySelector(".auth-submit");
        submit.disabled = true;
        submit.classList.add("is-loading");

        try {
            await auth.register(payload);

            form.hidden = true;
            successCard.hidden = false;
            successCard.scrollIntoView({ behavior: "smooth", block: "center" });

            showToast("Cadastro enviado para análise da diretoria.", { type: "success" });
        } catch (error) {
            console.error("[REGISTER] Falha ao criar conta:", error);
            showToast(error?.message || "Não foi possível criar a conta.", { type: "error" });
        } finally {
            submit.disabled = false;
            submit.classList.remove("is-loading");
        }
    });
}
