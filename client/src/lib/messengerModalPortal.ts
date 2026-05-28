const PORTAL_ID = "retrogen-messenger-modals";

/** Контейнер портала — последний ребёнок body, чтобы backdrop-filter видел страницу */
export function getMessengerModalPortalRoot(): HTMLElement {
  let el = document.getElementById(PORTAL_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = PORTAL_ID;
    document.body.appendChild(el);
  } else if (el.parentElement !== document.body || el !== document.body.lastElementChild) {
    document.body.appendChild(el);
  }
  return el;
}
