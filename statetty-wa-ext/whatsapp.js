// Adaptado de github.com/klederson/tabhero (MIT), que a su vez contrasta los
// contratos con wppconnect-team/wa-js y whatsapp-web.js.
// Corre DENTRO del documento de WhatsApp Web ya cargado (world: MAIN).
// Debe seguir siendo autocontenida: se inyecta con scripting.executeScript.

export async function openInLoadedWhatsApp({ phone, text }) {
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

export async function openConversationInTab(api, tabId, url) {
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
