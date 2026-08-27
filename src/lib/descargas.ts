import type { AgenteGenerado, FichaTecnica } from "./agentes.tipos";

export async function copiarAlPortapapeles(texto: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* cae al método alternativo */
  }
  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function descargarArchivo(nombre: string, contenido: string, tipo = "text/plain") {
  const blob = new Blob([contenido], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function fichaComoMarkdown(ficha: FichaTecnica) {
  return [
    `# ${ficha.nombre}`,
    "",
    `**Rol:** ${ficha.rol}`,
    "",
    "## Objetivos",
    ...ficha.objetivos.map((o) => `- ${o}`),
    "",
    "## Herramientas sugeridas",
    ...ficha.herramientas.map((h) => `- **${h.nombre}** — ${h.para_que}`),
    "",
    "## Stack recomendado",
    ...ficha.stack.map((s) => `- **${s.capa}:** ${s.eleccion} — ${s.motivo}`),
    "",
    "## Métricas",
    ...ficha.metricas.map((m) => `- ${m}`),
    "",
    "## Riesgos a revisar",
    ...ficha.riesgos.map((r) => `- ${r}`),
    "",
    "> Prototipo generado por Fábrica de Agentes. Revísalo antes de llevarlo a producción.",
  ].join("\n");
}

export function agenteComoMarkdown(agente: AgenteGenerado) {
  return [
    fichaComoMarkdown(agente.ficha),
    "",
    "## System prompt",
    "",
    "```text",
    agente.systemPrompt,
    "```",
  ].join("\n");
}

export function slug(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "agente";
}
