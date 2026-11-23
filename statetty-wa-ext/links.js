// Adaptado de github.com/klederson/tabhero (MIT). Convierte un enlace de
// conversación (wa.me / api.whatsapp.com/send) en la URL equivalente de
// web.whatsapp.com/send, y define las reglas DNR que llevan esas navegaciones
// a nuestra página handoff en vez del intersticial de WhatsApp.

export function conversationUrl(input) {
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

export function redirectRules(handoffUrl) {
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
      redirect: { regexSubstitution: `${handoffUrl}#\\0` }
    },
    condition: {
      regexFilter,
      isUrlFilterCaseSensitive: true,
      resourceTypes: ["main_frame"],
      requestMethods: ["get"]
    }
  }));
}
