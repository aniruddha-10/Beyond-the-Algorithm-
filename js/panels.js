// Panel chrome on the dashboard: an ⓘ button that shows each panel's
// "how to read this" text (from its data-info attribute), and an "Explore"
// pill on hover that opens the panel large. Calls onLayout() whenever a
// panel's size changes so charts can redraw at the new size.
import { showTooltip, hideTooltip } from "./tooltip.js";

const EXPAND = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9"/></svg>`;
const CLOSE = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;

export function setupPanels(onLayout) {
  const backdrop = document.createElement("div");
  backdrop.className = "panel-backdrop";
  backdrop.hidden = true;
  document.body.append(backdrop);
  let open = null; // { panel, spacer, trigger }

  for (const panel of document.querySelectorAll(".panel")) {
    const head = panel.querySelector(".panel-head");
    const title = panel.querySelector("h2")?.textContent ?? "chart";
    const tools = document.createElement("div");
    tools.className = "panel-tools";

    const explore = document.createElement("button");
    explore.type = "button";
    explore.className = "explore-btn";
    explore.innerHTML = `<span>Explore this chart</span>${EXPAND}`;
    explore.setAttribute("aria-label", `Explore: ${title}`);
    explore.addEventListener("click", () => (open?.panel === panel ? close() : expand(panel, explore)));
    tools.append(explore);

    if (panel.dataset.info) {
      const info = document.createElement("button");
      info.type = "button";
      info.className = "info-btn";
      info.textContent = "i";
      info.setAttribute("aria-label", `How to read: ${title}`);
      const show = (event) => showTooltip(event, panel.dataset.info);
      info.addEventListener("mousemove", show);
      info.addEventListener("mouseleave", hideTooltip);
      info.addEventListener("focus", () => show(pointAt(info)));
      info.addEventListener("blur", hideTooltip);
      tools.append(info);
    }
    head.append(tools);
  }

  function expand(panel, trigger) {
    if (open) close();
    hideTooltip();
    // A spacer holds the panel's grid cell so the other panels don't reflow behind the overlay.
    const spacer = document.createElement("div");
    spacer.className = `panel-spacer ${panel.classList.contains("span-2") ? "span-2" : ""}`;
    spacer.style.minHeight = `${panel.offsetHeight}px`;
    panel.after(spacer);
    panel.classList.add("is-expanded");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    trigger.innerHTML = `<span>Close</span>${CLOSE}`;
    backdrop.hidden = false;
    open = { panel, spacer, trigger };
    trigger.focus();
    onLayout();
  }

  function close() {
    if (!open) return;
    const { panel, spacer, trigger } = open;
    panel.classList.remove("is-expanded");
    panel.removeAttribute("role");
    panel.removeAttribute("aria-modal");
    spacer.remove();
    trigger.innerHTML = `<span>Explore this chart</span>${EXPAND}`;
    backdrop.hidden = true;
    open = null;
    hideTooltip();
    trigger.focus();
    onLayout();
  }

  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
}

// Place a keyboard-triggered tooltip beside the focused button.
function pointAt(el) {
  const r = el.getBoundingClientRect();
  return { clientX: r.left, clientY: r.bottom };
}
