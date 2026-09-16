// Keeps the project P-Code fixed once the user moves
// from the New Lead form to the next stages.

(() => {
  function lockPCode() {
    const pcodeInput = document.getElementById("pcode");

    if (!pcodeInput) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const pcode = params.get("pcode");

    // A P-Code should come from the project we are working on.
    // If there is no P-Code in the URL, leave the field empty.
    if (pcode) {
      pcodeInput.value = pcode.trim();
    }

    // The P-Code is an identifier, not something the user
    // should edit while completing a stage form.
    pcodeInput.readOnly = true;
    pcodeInput.setAttribute("aria-readonly", "true");
    pcodeInput.setAttribute("autocomplete", "off");

    // Make it obvious that this field is locked.
    pcodeInput.classList.add("pcode-locked");

    // Prevent accidental editing through normal keyboard input.
    pcodeInput.addEventListener("keydown", (event) => {
      const allowedKeys = [
        "Tab",
        "Shift",
        "Control",
        "Alt",
        "Meta",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ];

      if (!allowedKeys.includes(event.key)) {
        event.preventDefault();
      }
    });

    // Do not allow paste, drop or typing into the identifier. 
    pcodeInput.addEventListener("paste", (event) => {
      event.preventDefault();
    });

    pcodeInput.addEventListener("drop", (event) => {
      event.preventDefault();
    });

    // Keep the value tied to the P-Code from the URL.
    pcodeInput.addEventListener("input", () => {
      pcodeInput.value = pcode || "";
    });
  }

  function addLockedPCodeStyle() {
    if (document.getElementById("locked-pcode-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "locked-pcode-style";

    style.textContent = `
      .pcode-locked {
        cursor: not-allowed;
        font-family: var(--font-mono);
        font-weight: 600;
        opacity: 0.85;
      }

      .pcode-locked:focus {
        border-color: var(--line);
        box-shadow: none;
        outline: none;
      }
    `;

    document.head.appendChild(style);
  }

  function start() {
    addLockedPCodeStyle();
    lockPCode();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();