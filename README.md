# Fábrica de Agentes IA

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Fábrica de Agentes es una plataforma web que permite a emprendedores, pymes y equipos técnicos de Latinoamérica **co-crear agentes de IA en tiempo real** junto con modelos de lenguaje grandes, utilizando el estándar **WebMCP** para integración nativa con navegadores y agentes externos.

## 🎯 ¿Por qué WebMCP?

WebMCP (Model Context Protocol) es el estándar que nos permite:

- **Integración nativa con navegadores**: Los agentes pueden registrar herramientas directamente en `document.modelContext` o `navigator.modelContext`
- **Colaboración entre agentes**: Nuestro [servidor MCP](MCP.md) expone un endpoint JSON-RPC 2.0 que permite a cualquier agente externo participar en la "Sala de Encuentro"
- **Interoperabilidad**: Agentes de diferentes plataformas pueden interactuar con nuestra fábrica sin acoplamiento directo al LLM

## 🤝 ¿Qué pueden hacer personas + agentes juntos?

| Persona | Agente | Resultado |
|---------|--------|-----------|
| Define el problema de negocio | Sugiere soluciones técnicas | Generación de prompts y fichas técnicas |
| Selecciona dominio (Pyme, E-commerce, etc.) | Valida datos del formulario | Detección temprana de errores |
| Describe el reto | Genera sistema prompt | Agente listo para implementación |
| Revisa la propuesta | Colabora en la Sala de Encuentro | Solución convergida y validada |

**Flujo típico:**
1. Usuario describe su problema de negocio
2. Nuestro LLM + herramientas WebMCP generan un agente especializado
3. Agentes externos pueden unirse vía el [servidor MCP](MCP.md) para colaborar
4. El equipo humano revisa y lleva a producción

## 🛠 Arquitectura

- **Frontend**: TypeScript + Tailwind + shadcn/ui
- **Backend**: Supabase (PostgreSQL) + Edge Functions
- **WebMCP**: Herramientas registradas en el navegador para interacción con agentes
- **Servidor MCP**: JSON-RPC 2.0 sobre HTTP para colaboración externa

## 📋 Especificación Original

Build a production-quality public website called "Fábrica de Agentes" for independent entrepreneurs, small business owners, and technical teams in Chile/Latin America.

Core UX: visitors co-create a micro AI agent in real time.

1. Choose business/project domain: Pyme de servicios, E-commerce, Estudio contable, Freelance, Otro.
2. Describe the problem the agent should solve: customer support, lead triage, report generation, or custom description.
3. Call an LLM to generate a system prompt plus a concise technical card containing agent role, suggested tools, and recommended stack. Default recommendation: FastAPI + Gemini.
4. Let visitors copy and download the generated system prompt and technical card.

Interface must be entirely Spanish, Latin American/Chilean tone. Make the interaction feel fast, polished and impressive: clean technical-but-approachable visual language, responsive, strong hierarchy, subtle motion, progress indicator, loading/generation state, polished empty/error/success states. Avoid generic SaaS template aesthetics.

Add a closing CTA: "Lleva tu agente a producción" with public contact form fields name, email, brief description.

## 📊 Requisitos de Datos

- No sign-in for visitors.
- Persist every generated agent: domain, problem description, generated system prompt, technical card.
- Persist every contact submission: name, email, description.
- Use the project's PostgreSQL/Supabase database with sensible schema, timestamps, validation and safe public access policies. Do not expose stored leads publicly.
- The LLM integration must be implemented through a secure server-side mechanism; never expose API keys in client code. If an API key is not configured, provide a clearly labeled demo/fallback generation so the complete UX remains testable rather than breaking.
- Include robust loading, error, validation, copy-to-clipboard and download behavior.

## 🎨 Estructura de Página Sugerida

- Hero with headline "Convierte un problema de negocio en un agente de IA." and CTA "Crear mi agente"
- Interactive 3-step factory/workbench as the centerpiece
- Generated result displayed as a polished "Ficha del agente" with tabs/cards for system prompt and technical card
- CTA/contact section
- Footer with concise positioning

## ⚙️ Desarrollo

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## 📄 Documentación

- [Servidor MCP - Especificación completa](MCP.md)
- [Guía de despliegue](docs/DESPLIEGUE-SALA-MANUAL.md)

---

This project was built with [Lovable](https://lovable.dev).

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ee919da1-21de-4fb7-ad47-fa0cf092735c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.
