// Página puente: llega aquí la navegación a wa.me / api.whatsapp.com cuando el
// click vino de una página sin nuestro content script. Pide al background que
// abra la conversación en la pestaña de WhatsApp Web y luego se cierra sola.

const api = globalThis.browser ?? globalThis.chrome;
const status = document.getElementById("status");
const retry = document.getElementById("retry");

const MESSAGES = {
  "unauthorized-source": "Solicitud no autorizada.",
  "invalid-link": "El enlace no es una conversación de WhatsApp válida.",
  "not-ready": "WhatsApp Web todavía está cargando. Reintentá en unos segundos.",
  "contact-not-found": "Ese número no tiene una conversación disponible en WhatsApp.",
  "load-timeout": "La pestaña de WhatsApp Web tardó demasiado en responder.",
  "injection-failed": "No se pudo hablar con la pestaña de WhatsApp Web.",
  "document-unavailable": "La pestaña de WhatsApp Web no está disponible.",
  "unavailable": "Esta versión de WhatsApp Web no responde a los comandos esperados.",
  "open-failed": "WhatsApp Web no pudo abrir la conversación.",
  "internal-error": "Error interno de la extensión.",
  "extension-unavailable": "La extensión no está disponible. Recargá la página."
};

async function openConversation() {
  retry.hidden = true;
  retry.disabled = true;
  status.textContent = "Abriendo conversación…";
  try {
    const result = await api.runtime.sendMessage({
      type: "route-conversation",
      canGoBack: history.length > 1
    });
    if (!result?.ok) throw { code: result?.code ?? "extension-unavailable" };
    status.textContent = "Conversación abierta en WhatsApp Web.";
  } catch (error) {
    status.textContent = MESSAGES[error?.code] ?? MESSAGES["extension-unavailable"];
    retry.hidden = false;
  } finally {
    retry.disabled = false;
  }
}

retry.addEventListener("click", openConversation);
openConversation();
