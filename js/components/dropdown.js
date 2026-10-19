/**
 * Motoclube
 * Dropdown System
 *
 * Substitui <select> por um controle visual próprio do app.
 * O valor real continua em um <input type="hidden"> para que
 * FormData e os códigos existentes continuem funcionando.
 */

let selectSequence = 0;
let activeSelect = null;


function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function closeSelectDropdown(selectControl) {
    if (!selectControl) return;

    const {
        wrapper,
        trigger,
        menu,
        cleanup
    } = selectControl;

    wrapper?.classList.remove("is-open");
    trigger?.setAttribute("aria-expanded", "false");

    if (menu?.parentNode === document.body) {
        menu.remove();
    }

    cleanup?.();

    if (activeSelect === selectControl) {
        activeSelect = null;
    }
}


function positionSelectDropdown(selectControl) {
    if (!selectControl?.trigger || !selectControl?.menu) {
        return;
    }

    const rect =
        selectControl.trigger.getBoundingClientRect();

    const menu = selectControl.menu;
    const gap = 7;
    const margin = 10;
    const maxHeight = Math.min(
        280,
        Math.max(160, window.innerHeight - margin * 2)
    );

    menu.style.maxHeight = `${maxHeight}px`;
    menu.style.minWidth = `${Math.max(rect.width, 190)}px`;

    const menuHeight = Math.min(
        menu.scrollHeight || maxHeight,
        maxHeight
    );

    const spaceBelow =
        window.innerHeight - rect.bottom - margin;

    const openAbove =
        spaceBelow < Math.min(menuHeight, 240) &&
        rect.top > spaceBelow;

    const top = openAbove
        ? Math.max(
            margin,
            rect.top - menuHeight - gap
        )
        : Math.min(
            window.innerHeight - menuHeight - margin,
            rect.bottom + gap
        );

    const left = Math.min(
        Math.max(margin, rect.left),
        window.innerWidth - menu.offsetWidth - margin
    );

    menu.style.left = `${left}px`;
    menu.style.top = `${Math.max(margin, top)}px`;
}


function createSelectDropdown(select) {
    if (!select) return null;

    // O Bottom Sheet pode já ter transformado o <select> em um
    // botão .mc-select__trigger antes da view pedir o controle.
    // Nesse caso, recuperamos o controle associado ao wrapper.
    if (select._mcSelectControl) {
        return select._mcSelectControl;
    }

    const existingWrapper =
        select.closest?.(".mc-select");

    if (existingWrapper?._mcSelectControl) {
        return existingWrapper._mcSelectControl;
    }

    if (select.dataset?.mcSelectEnhanced === "true") {
        return select._mcSelectControl || null;
    }

    const options =
        Array.from(select.options || []).map(option => ({
            value: option.value,
            label: option.textContent.trim(),
            disabled: option.disabled,
            selected: option.selected
        }));

    if (!options.length) {
        return null;
    }

    const selectedOption =
        options.find(option => option.selected) ||
        options.find(option => !option.disabled) ||
        options[0];

    const originalId =
        select.id ||
        `mc-select-${++selectSequence}`;

    const triggerId = originalId;
    const valueId = `${originalId}__value`;
    const menuId = `${originalId}__menu`;

    const wrapper = document.createElement("div");
    wrapper.className = "mc-select";
    wrapper.dataset.mcSelect = "true";

    if (select.className) {
        wrapper.classList.add(...select.classList);
    }

    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.id = valueId;
    hidden.name = select.name || "";
    hidden.value = selectedOption?.value ?? "";

    if (select.disabled) {
        hidden.disabled = true;
    }

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = triggerId;
    trigger.className = "mc-select__trigger";
    trigger.disabled = Boolean(select.disabled);
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", menuId);

    const text = document.createElement("span");
    text.className = "mc-select__text";
    text.textContent = selectedOption?.label || "Selecione";

    const chevron = document.createElement("span");
    chevron.className = "mc-select__chevron";
    chevron.setAttribute("aria-hidden", "true");

    trigger.append(text, chevron);

    const menu = document.createElement("div");
    menu.className = "mc-select__menu";
    menu.id = menuId;
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-hidden", "true");

    const control = {
        wrapper,
        trigger,
        hidden,
        menu,
        text,
        options,
        selectedValue: selectedOption?.value ?? "",
        cleanup: null
    };

    // Mantém uma referência ao controle no <select> original.
    // Isso permite recuperar o mesmo controle depois que initDropdowns()
    // já o transformou em dropdown visual.
    select._mcSelectControl = control;

    // Compatibilidade retroativa: algumas views guardam a referência ao
    // <select> antes da transformação. Mesmo depois de substituído no DOM,
    // o código continua podendo ler/escrever .value sem reabrir um select nativo.
    try {
        Object.defineProperty(select, "value", {
            configurable: true,
            get() { return hidden.value; },
            set(value) { setSelectValue(control, value, false); }
        });
    } catch (error) {
        console.warn("[DROPDOWN] Não foi possível espelhar .value:", error);
    }
    wrapper._mcSelectControl = control;

    /*
     * Compatibilidade com o código existente:
     * quem antes fazia input.value continua funcionando mesmo
     * depois que o <select> foi substituído pelo botão.
     */
    Object.defineProperty(trigger, "value", {
        configurable: true,
        enumerable: false,
        get() {
            return hidden.value;
        },
        set(value) {
            setSelectValue(control, value, false);
        }
    });

    function renderItems() {
        menu.innerHTML = options.map((option, index) => `
            <button
                type="button"
                class="mc-select__item${
                    String(option.value) === String(control.selectedValue)
                        ? " is-selected"
                        : ""
                }"
                data-mc-select-value="${escapeHTML(option.value)}"
                role="option"
                aria-selected="${
                    String(option.value) === String(control.selectedValue)
                }"
                ${option.disabled ? "disabled" : ""}
                tabindex="-1"
            >
                <span class="mc-select__item-label">
                    ${escapeHTML(option.label)}
                </span>

                <span
                    class="mc-select__check"
                    aria-hidden="true"
                ></span>
            </button>
        `).join("");

        menu.querySelectorAll("[data-mc-select-value]")
            .forEach(item => {
                item.addEventListener("click", event => {
                    event.preventDefault();

                    if (item.disabled) return;

                    setSelectValue(
                        control,
                        item.dataset.mcSelectValue,
                        true
                    );

                    closeSelectDropdown(control);
                    trigger.focus();
                });
            });
    }

    function open() {
        if (trigger.disabled) return;

        if (activeSelect && activeSelect !== control) {
            closeSelectDropdown(activeSelect);
        }

        if (wrapper.classList.contains("is-open")) {
            closeSelectDropdown(control);
            return;
        }

        activeSelect = control;
        wrapper.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        menu.setAttribute("aria-hidden", "false");

        document.body.appendChild(menu);
        menu.classList.add("is-visible");

        positionSelectDropdown(control);

        const reposition = () =>
            positionSelectDropdown(control);

        const onDocumentPointer = event => {
            if (
                !wrapper.contains(event.target) &&
                !menu.contains(event.target)
            ) {
                closeSelectDropdown(control);
            }
        };

        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, true);
        document.addEventListener("pointerdown", onDocumentPointer, true);

        control.cleanup = () => {
            window.removeEventListener("resize", reposition);
            window.removeEventListener("scroll", reposition, true);
            document.removeEventListener(
                "pointerdown",
                onDocumentPointer,
                true
            );
            control.cleanup = null;
        };
    }

    trigger.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        open();
    });

    trigger.addEventListener("keydown", event => {
        if (
            event.key === "Enter" ||
            event.key === " " ||
            event.key === "ArrowDown"
        ) {
            event.preventDefault();
            open();
        }
    });

    wrapper.append(trigger, hidden);
    select.replaceWith(wrapper);

    /*
     * Mantém labels apontando para o controle visível.
     */
    const scope =
        wrapper.parentElement || document;

    scope
        .querySelectorAll(`label[for="${CSS.escape(originalId)}"]`)
        .forEach(label => {
            label.setAttribute("for", triggerId);
        });

    select.dataset.mcSelectEnhanced = "true";

    renderItems();

    return control;
}


function setSelectValue(control, value, emit = true) {
    if (!control) return;

    const option =
        control.options.find(item =>
            String(item.value) === String(value)
        );

    if (!option || option.disabled) {
        return;
    }

    control.selectedValue = option.value;
    control.hidden.value = option.value;
    control.text.textContent = option.label;

    control.menu
        .querySelectorAll("[data-mc-select-value]")
        .forEach(item => {
            const selected =
                String(item.dataset.mcSelectValue) ===
                String(option.value);

            item.classList.toggle("is-selected", selected);
            item.setAttribute("aria-selected", String(selected));
        });

    if (emit) {
        control.hidden.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        control.hidden.dispatchEvent(
            new Event("change", { bubbles: true })
        );
    }
}


function updateSelectOptions(control, options = [], selectedValue = "") {
    if (!control) return;

    control.options = Array.isArray(options)
        ? options.map(option => ({
            value: option.value ?? "",
            label: option.label ?? String(option.value ?? ""),
            disabled: Boolean(option.disabled),
            selected: String(option.value ?? "") === String(selectedValue)
        }))
        : [];

    const requested = control.options.find(option =>
        String(option.value) === String(selectedValue)
    );

    const selected =
        requested ||
        control.options.find(option => !option.disabled) ||
        control.options[0];

    control.selectedValue = selected?.value ?? "";
    control.hidden.value = selected?.value ?? "";
    control.text.textContent = selected?.label || "Selecione";

    control.menu.innerHTML = control.options.map(option => `
        <button
            type="button"
            class="mc-select__item${
                String(option.value) === String(control.selectedValue)
                    ? " is-selected"
                    : ""
            }"
            data-mc-select-value="${escapeHTML(option.value)}"
            role="option"
            aria-selected="${
                String(option.value) === String(control.selectedValue)
            }"
            ${option.disabled ? "disabled" : ""}
            tabindex="-1"
        >
            <span class="mc-select__item-label">
                ${escapeHTML(option.label)}
            </span>
            <span class="mc-select__check" aria-hidden="true"></span>
        </button>
    `).join("");

    control.menu.querySelectorAll("[data-mc-select-value]").forEach(item => {
        item.addEventListener("click", event => {
            event.preventDefault();
            if (item.disabled) return;
            setSelectValue(control, item.dataset.mcSelectValue, true);
            closeSelectDropdown(control);
            control.trigger.focus();
        });
    });

    if (control.wrapper.classList.contains("is-open")) {
        closeSelectDropdown(control);
    }
}


function initDropdown(dropdown) {
    if (!dropdown) return;
    if (dropdown.dataset.dropdownInitialized === "true") return;

    const trigger =
        dropdown.querySelector("[data-dropdown-trigger]");

    const menu =
        dropdown.querySelector("[data-dropdown-menu]");

    if (!trigger || !menu) return;

    dropdown.dataset.dropdownInitialized = "true";

    function open() {
        dropdown.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
    }

    function close() {
        dropdown.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", event => {
        event.stopPropagation();

        dropdown.classList.contains("is-open")
            ? close()
            : open();
    });

    menu.addEventListener("click", event => {
        const item =
            event.target.closest("[data-dropdown-item]");

        if (!item) return;

        const value =
            item.dataset.value ??
            item.textContent.trim();

        dropdown.dispatchEvent(
            new CustomEvent("dropdown:select", {
                bubbles: true,
                detail: {
                    value,
                    item
                }
            })
        );

        close();
    });

    document.addEventListener("click", event => {
        if (!dropdown.contains(event.target)) {
            close();
        }
    });
}


function initDropdowns(container = document) {
    if (!container) return;

    container
        .querySelectorAll("select:not([data-mc-select-enhanced='true'])")
        .forEach(createSelectDropdown);

    container
        .querySelectorAll("[data-dropdown]")
        .forEach(initDropdown);
}


export {
    initDropdown,
    initDropdowns,
    createSelectDropdown,
    updateSelectOptions,
    setSelectValue
};
