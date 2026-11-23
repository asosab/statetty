// Statetty WhatsApp Direct — background (script clásico, sin imports).
// Chrome MV3 lo carga como service_worker; Firefox lo carga como event page
// via background.scripts (su service_worker aún está deshabilitado).
// Núcleo adaptado de github.com/klederson/tabhero (MIT).

const api = globalThis.browser ?? globalThis.chrome;
const handoffUrl = api.runtime.getURL("handoff.html");
// Serializa clicks rápidos: el primer request crea/reusa la pestaña antes de
// que otro elija destino. Un fallo no envenena la cola.
let routing = Promise.resolve();

// ---------------------------------------------------------------- links.js

function conversationUrl(input) {
  let source;
  try {
    source = new URL(input);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(source.protocol) || source.username || source.password || source.port) {
    return null;
  }

  let phone;
  if (source.hostname === "wa.me") {
    const match = source.pathname.match(/^\/(\+?\d+)\/?$/);
    if (match) phone = match[1];
    else if (source.pathname !== "/") return null;
    else phone = source.searchParams.get("phone");
  } else if (["api.whatsapp.com", "www.whatsapp.com"].includes(source.hostname) && /^\/send\/?$/.test(source.pathname)) {
    phone = source.searchParams.get("phone");
  } else {
    return null;
  }

  const target = new URL("https://web.whatsapp.com/send");
  if (phone) {
    if (!/^[+\d\s().-]+$/.test(phone)) return null;
    phone = phone.replace(/[^\d]/g, "");
    if (!phone) return null;
    target.searchParams.set("phone", phone);
  }
  if (source.searchParams.has("text")) {
    target.searchParams.set("text", source.searchParams.get("text"));
  }
  if (!phone) return null;
  return target.href;
}

function redirectRules(url) {
  // Solo enlaces de conversación. Invitaciones a grupos, canales y el propio
  // WhatsApp Web quedan fuera.
  const expressions = [
    "^https?://wa\\.me/(\\+?[0-9]+/?(\\?[^#]*)?|\\?([^&#]*&)*phone=[^#]*)(#.*)?$",
    "^https?://(api|www)\\.whatsapp\\.com/send/?\\?([^&#]*&)*phone=[^#]*(#.*)?$"
  ];
  return expressions.map((regexFilter, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { regexSubstitution: `${url}#\\0` }
    },
    condition: {
      regexFilter,
      isUrlFilterCaseSensitive: true,
      resourceTypes: ["main_frame"],
      requestMethods: ["get"]
    }
  }));
}

// -------------------------------------------------------------- whatsapp.js

// Corre DENTRO del documento de WhatsApp Web ya cargado (world: MAIN).
// Debe seguir siendo autocontenida: se inyecta con scripting.executeScript.
async function openInLoadedWhatsApp({ phone, text }) {
  const fail = code => ({ ok: false, code });
  if (location.origin !== "https://web.whatsapp.com" || !/^\d+$/.test(phone ?? "")) {
    return fail("invalid-request");
  }

  const load = name => {
    for (const loader of [globalThis.require, globalThis.importNamespace]) {
      if (typeof loader !== "function") continue;
      try {
        const module = loader(name);
        if (module) return module;
      } catch {
        // Módulo aún no listo. Nunca parchear el loader del sitio.
      }
    }
    return null;
  };

  try {
    const cmd = load("WAWebCmd")?.Cmd;
    const factory = load("WAWebWidFactory");
    const chats = load("WAWebChatCollection")?.ChatCollection ?? load("WAWebCollections")?.Chat;
    const findChat = load("WAWebFindChatAction")?.findOrCreateLatestChat;
    const compose = text !== null ? load("WAWebComposeBoxActions")?.ComposeBoxActions : null;

    if (!cmd?.openChatBottom || !factory?.createWid || !chats?.get
      || (text !== null && typeof compose?.setTextContent !== "function")) {
      return fail("unavailable");
    }
    if (cmd.isMainLoaded === false) {
      return fail("not-ready");
    }

    const wid = factory.createWid(`${phone}@c.us`);
    let chat = chats.get(wid);
    if (!chat) {
      if (typeof findChat !== "function") {
        return fail("unavailable");
      }
      // Resuelve números sin chat previo en la lista local, incluido su LID.
      const result = await findChat(wid, "createChat");
      chat = result?.chat?.id ? chats.get(result.chat.id) : null;
    }
    if (!chat) {
      return fail("contact-not-found");
    }
    if (text !== null && typeof chat.setComposeContents !== "function") {
      return fail("unavailable");
    }

    // El comando propio de la app cambia su estado React: sin navegación,
    // sin tocar la URL, sin recargar el documento.
    const version = load("WAWebBuildConstants")?.VERSION_STR ?? globalThis.Debug?.VERSION;
    const parts = typeof version === "string" ? version.split(/[.-]/).slice(0, 3).map(Number) : null;
    const oldSignature = parts && parts.length === 3 && parts.every(Number.isFinite)
      && (parts[0] < 2 || (parts[0] === 2 && (parts[1] < 3000 || (parts[1] === 3000 && parts[2] <= 1029960097))));
    if (!chat.active) {
      const opened = oldSignature
        ? await cmd.openChatBottom(chat)
        : await cmd.openChatBottom({ chat });
      if (opened === false && !chat.active) return fail("open-failed");
    }

    // Esperar a que la app active el chat antes de tocar el composer.
    const deadline = Date.now() + 5_000;
    while (!chat.active && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!chat.active) return fail("open-failed");

    if (text !== null) {
      chat.setComposeContents({ text, timestamp: Math.floor(Date.now() / 1000) });
      compose.setTextContent(chat, text);
    }
    return { ok: true };
  } catch {
    return fail("internal-error");
  }
}

async function openConversationInTab(tabId, url) {
  const target = new URL(url);
  const payload = { phone: target.searchParams.get("phone"), text: target.searchParams.get("text") };
  let results;
  try {
    results = await api.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      world: "MAIN",
      func: openInLoadedWhatsApp,
      args: [payload]
    });
  } catch {
    throw { code: "injection-failed" };
  }
  const result = results?.find(item => item.frameId === 0)?.result;
  if (!result?.ok) {
    throw { code: result?.code ?? "document-unavailable" };
  }
}

// ---------------------------------------------------------------- router.js

function chooseTab(tabs, source) {
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

async function waitTabReady(tabId) {
  // Un segundo click rápido puede encontrar la pestaña todavía cargando.
  const deadline = Date.now() + 30_000;
  while (true) {
    const tab = await api.tabs.get(tabId);
    if (tab.url?.startsWith("https://web.whatsapp.com/") && tab.status !== "loading") return tab;
    if (Date.now() >= deadline) throw { code: "load-timeout" };
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function focusAndOpen(target, url) {
  await api.tabs.update(target.id, { active: true });
  await api.windows.update(target.windowId, { focused: true });
  await waitTabReady(target.id);
  await openConversationInTab(target.id, url);
}

// Vía handoff: la pestaña source ya muestra nuestra página puente; al terminar
// se cierra (o vuelve atrás si el usuario llegó a ella con historial).
async function routeConversation(source, url, canGoBack) {
  const current = await api.tabs.get(source.id);
  if (current.url !== source.url) return;
  const target = chooseTab(await whatsappTabs(), source);

  if (!target) {
    await api.tabs.update(source.id, { url, active: true });
    await api.windows.update(source.windowId, { focused: true });
    return;
  }

  await focusAndOpen(target, url);

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
async function routeDirect(source, url) {
  const target = chooseTab(await whatsappTabs(), source);
  if (!target) return { fallback: true };
  await focusAndOpen(target, url);
  return { ok: true };
}

async function whatsappTabs() {
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

// ------------------------------------------------------------- background

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
    routing = routing.catch(() => {}).then(() => routeDirect(sender.tab, targetUrl));
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
    routeConversation({ ...sender.tab, url: sender.url }, targetUrl, message.canGoBack === true)
  );
  routing.then(
    () => sendResponse({ ok: true }),
    error => sendResponse({ ok: false, code: error?.code ?? "internal-error" })
  );
  return true;
});
