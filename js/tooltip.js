// One shared tooltip for every chart.
//   selection.on("mousemove", (event, d) => showTooltip(event, `<strong>${d.name}</strong><br>${d.n} ads`))
//            .on("mouseleave", hideTooltip);
const el = document.getElementById("tooltip");

export function showTooltip(event, html) {
  el.innerHTML = html;
  el.hidden = false;
  const pad = 14;
  const { width, height } = el.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY + pad;
  if (x + width > window.innerWidth - 8) x = event.clientX - width - pad;
  if (y + height > window.innerHeight - 8) y = event.clientY - height - pad;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

export function hideTooltip() {
  el.hidden = true;
}
