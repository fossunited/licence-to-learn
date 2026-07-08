/* Close the <details> dropdown(s) on outside-click and Escape.
   The menu still opens/closes via the summary without JS; this only adds
   the dismiss behaviour native <details> lacks. */
(() => {
  "use strict";
  const menus = document.querySelectorAll("details.menu");
  if (!menus.length) return;

  document.addEventListener("click", (e) => {
    menus.forEach((m) => {
      if (m.open && !m.contains(e.target)) m.open = false;
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    menus.forEach((m) => {
      if (m.open) {
        m.open = false;
        m.querySelector("summary")?.focus();
      }
    });
  });
})();
