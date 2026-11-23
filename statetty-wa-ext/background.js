// Adaptado de github.com/klederson/tabhero (MIT), recortado a lo esencial:
// reglas DNR (wa.me / api.whatsapp.com -> handoff) + enrutado de conversaciones
// hacia la pestaña viva de WhatsApp Web.

import { conversationUrl, redirectRules } from "./links.js";
import { chooseTab, routeConversation, routeDirect, whatsappTabs } from "./router.js";

const api = globalThis.browser ?? globalThis.chrome;
const handoffUrl = api.runtime.getURL("handoff.html");
// Serializa clicks rápidos: el primer request crea/reusa la pestaña antes de
// que otro elija destino. Un fallo no envenena la cola.
let routing = Promise.resolve();

async function installRules() {
  const rules = redirectRules(handoffUrl);
  await api.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map(rule => rule.id),
    addRules: rules
  });
}

api.runtime.onInstalled.addListener(() => installRules().catch(() => {}));
api.runtime.onStartup.addListener(() => installRules().catch(() => {}));

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Desde el content script de statetty: {type:"stt-route", url:"https://wa.me/..."}
  if (message?.type === "stt-route") {
    const targetUrl = conversationUrl(message.url);
    if (!targetUrl || !sender.tab) { sendResponse({ ok: false, fallback: true }); return; }
    routing = routing.catch(() => {}).then(() => routeDirect(api, sender.tab, targetUrl));
    routing.then(
      result => sendResponse(result?.fallback ? { ok: false, fallback: true } : { ok: true }),
      error => sendResponse({ ok: false, fallback: true, code: error?.code })
    );
    return true;
  }

  if (message?.type !== "route-conversation") return;
  // Solo nuestra página handoff puede pedir navegación de pestañas: se verifica
  // remitente y fragmento, no una URL viniendo de cualquier web.
  if (sender.id !== api.runtime.id || !sender.tab || sender.frameId !== 0 || !sender.url?.startsWith(`${handoffUrl}#`)) {
    sendResponse({ ok: false, code: "unauthorized-source" });
    return;
  }

  const original = sender.url.slice(handoffUrl.length + 1);
  const targetUrl = conversationUrl(original);
  if (!targetUrl) {
    sendResponse({ ok: false, code: "invalid-link" });
    return;
  }

  routing = routing.catch(() => {}).then(() =>
    routeConversation(api, { ...sender.tab, url: sender.url }, targetUrl, message.canGoBack === true)
  );
  routing.then(
    () => sendResponse({ ok: true }),
    error => sendResponse({ ok: false, code: error?.code ?? "internal-error" })
  );
  return true;
});
