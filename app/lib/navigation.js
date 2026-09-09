(() => {
  function setupNavigation() {
    const wrap = document.querySelector("header.bar .wrap");
    if (!wrap) return;

    const pcode = new URLSearchParams(location.search).get("pcode");

    const nav = document.createElement("div");
    nav.className = "top-nav";

    const logo = document.createElement("a");
    logo.href = "/";
    logo.className = "home-logo";
    logo.textContent = "PERFACT";

    nav.appendChild(logo);

    if (pcode) {
      const details = document.createElement("a");
      details.href = `/project.html?pcode=${encodeURIComponent(pcode)}`;
      details.className = "project-details";
      details.textContent = "Project Details";
      nav.appendChild(details);
    }

    wrap.prepend(nav);

    const style = document.createElement("style");
    style.textContent = `
      .top-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
      }

      .home-logo {
        color: inherit;
        text-decoration: none;
        font-size: 1rem;
        font-weight: 800;
        letter-spacing: 0.05em;
      }

      .project-details {
        color: var(--hero-sub);
        text-decoration: none;
        font-size: 0.8rem;
      }

      .project-details:hover {
        color: var(--hero-ink);
      }
    `;

    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupNavigation);
  } else {
    setupNavigation();
  }
})();