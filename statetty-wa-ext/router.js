// Adaptado de github.com/klederson/tabhero (MIT). Decide a qué pestaña va la
// conversación y la enfoca. La pestaña de WhatsApp NUNCA recibe una URL nueva:
// el chat se abre con los comandos internos de la app, sin recargar.

import { openConversationInTab } from "./whatsapp.js";

export function chooseTab(tabs, source) {
  return tabs
    .filter(tab => tab.id !== source.id && Boolean(tab.incognito) === Boolean(source.incognito)
      && tab.cookieStoreId === source.cookieStoreId)
    .sort((a, b) =>
      Number(b.windowId === source.windowId) - Number(a.windowId === source.windowId)
      || Number(b.active) - Number(a.active)
      || (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0)
      || a.id - b.id
    )[0];
}

async function waitTabReady(api, tabId) {
  // Un segundo click rápido puede encontrar la pestaña todavía cargando.
  const deadline = Date.now() + 30_000;
  while (true) {
    const tab = await api.tabs.get(tabId);
    if (tab.url?.startsWith("https://web.whatsapp.com/") && tab.status !== "loading") return tab;
    if (Date.now() >= deadline) throw { code: "load-timeout" };
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function focusAndOpen(api, target, url) {
  await api.tabs.update(target.id, { active: true });
  await api.windows.update(target.windowId, { focused: true });
  await waitTabReady(api, target.id);
  await openConversationInTab(api, target.id, url);
}

// Vía handoff: la pestaña source ya muestra nuestra página puente; al terminar
// se cierra (o vuelve atrás si el usuario llegó a ella con historial).
export async function routeConversation(api, source, url, canGoBack) {
  const current = await api.tabs.get(source.id);
  if (current.url !== source.url) return;
  const target = chooseTab(await whatsappTabs(api), source);

  if (!target) {
    await api.tabs.update(source.id, { url, active: true });
    await api.windows.update(source.windowId, { focused: true });
    return;
  }

  await focusAndOpen(api, target, url);

  try {
    if ((await api.tabs.get(source.id)).url !== source.url) return;
    if (canGoBack) await api.tabs.goBack(source.id);
    else await api.tabs.remove(source.id);
  } catch {
    // La pestaña ya cambió o el navegador no la dejó cerrar.
  }
}

// Vía directa (content script en statetty): no hay pestaña puente que cerrar.
// Devuelve {fallback:true} cuando no hay pestaña de WhatsApp Web para que la
// página origen haga lo de siempre (wa.me en pestaña nueva).
export async function routeDirect(api, source, url) {
  const target = chooseTab(await whatsappTabs(api), source);
  if (!target) return { fallback: true };
  await focusAndOpen(api, target, url);
  return { ok: true };
}

export async function whatsappTabs(api) {
  // Incluye navegaciones iniciadas pero no confirmadas (pendingUrl): un filtro
  // por url en tabs.query las perdería y abriría pestañas duplicadas.
  return (await api.tabs.query({})).filter(tab => {
    try {
      return new URL(tab.pendingUrl ?? tab.url).origin === "https://web.whatsapp.com";
    } catch {
      return false;
    }
  });
}
