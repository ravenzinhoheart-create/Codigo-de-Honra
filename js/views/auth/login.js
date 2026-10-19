// =========================================================
// CÓDIGO DE HONRA
// Login View
// =========================================================

import { router } from "../../core/router.js";
import { auth } from "../../services/auth.js";
import { showToast } from "../../components/toast.js";

export async function renderLogin(container) {
    container.innerHTML = `
        <main class="auth-screen auth-screen--login">
            <section class="auth-container">
<section class="auth-card">
                    <div class="auth-heading">
                        <span class="auth-kicker">ACESSO DO MEMBRO</span>
                        <h2>Entrar</h2>
                        <p>Use seu nickname e senha para acessar o clube.</p>
                    </div>

                    <form id="login-form" class="auth-form" novalidate>
                        <div class="auth-field">
                            <label for="login-username">Nickname</label>
                            <div class="auth-input-wrap">
                                <input id="login-username" name="username" type="text" autocomplete="username" placeholder="Digite seu nickname" required />
                            </div>
                        </div>

                        <div class="auth-field">
                            <label for="login-password">Senha</label>
                            <div class="auth-input-wrap">
                                <input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Digite sua senha" required />
                                <button type="button" class="auth-password-toggle" id="login-password-toggle" aria-label="Mostrar senha">
                                    <span class="password-icon password-icon--eye" data-icon="eye"></span><span class="password-icon password-icon--eye-off" data-icon="eyeOff"></span>
                                </button>
                            </div>
                        </div>

                        <button type="submit" class="auth-submit">Entrar</button>
                    </form>

                    <div class="auth-divider">
                        <span></span><strong>ou</strong><span></span>
                    </div>

                    <div class="auth-switch">
                        <span>Ainda não faz parte do clube?</span>
                        <button type="button" class="auth-switch-button" id="go-register">Criar conta</button>
                    </div>
                </section>
            </section>
        </main>
    `;

    const form = container.querySelector("#login-form");
    const username = container.querySelector("#login-username");
    const password = container.querySelector("#login-password");
    const passwordToggle = container.querySelector("#login-password-toggle");
    const registerButton = container.querySelector("#go-register");

    passwordToggle?.addEventListener("click", () => {
        const visible = password.type === "text";
        password.type = visible ? "password" : "text";
        passwordToggle.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
        passwordToggle.classList.toggle("is-visible", !visible);
    });

    registerButton?.addEventListener("click", () => router.navigate("register"));

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const user = username.value.trim();
        const pass = password.value;

        if (!user || !pass) {
            showToast("Informe nickname e senha.", { type: "warning" });
            (user ? password : username).focus();
            return;
        }

        const submit = form.querySelector(".auth-submit");
        submit.disabled = true;
        submit.classList.add("is-loading");

        try {
            await auth.login({ username: user, password: pass });
            await router.navigate("home");
        } catch (error) {
            console.error("[LOGIN] Falha ao entrar:", error);
            showToast(error?.message || "Não foi possível entrar.", { type: "error" });
        } finally {
            submit.disabled = false;
            submit.classList.remove("is-loading");
        }
    });
}
