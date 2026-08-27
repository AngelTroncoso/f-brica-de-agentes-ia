# Fábrica de Agentes IA

Build a production-quality public website called "Fábrica de Agentes" for independent entrepreneurs, small business owners, and technical teams in Chile/Latin America.

Core UX: visitors co-create a micro AI agent in real time.

1. Choose business/project domain: Pyme de servicios, E-commerce, Estudio contable, Freelance, Otro.
2. Describe the problem the agent should solve: customer support, lead triage, report generation, or custom description.
3. Call an LLM to generate a system prompt plus a concise technical card containing agent role, suggested tools, and recommended stack. Default recommendation: FastAPI + Gemini.
4. Let visitors copy and download the generated system prompt and technical card.

Interface must be entirely Spanish, Latin American/Chilean tone. Make the interaction feel fast, polished and impressive: clean technical-but-approachable visual language, responsive, strong hierarchy, subtle motion, progress indicator, loading/generation state, polished empty/error/success states. Avoid generic SaaS template aesthetics.

Add a closing CTA: "Lleva tu agente a producción" with public contact form fields name, email, brief description.

Data requirements:

- No sign-in for visitors.
- Persist every generated agent: domain, problem description, generated system prompt, technical card.
- Persist every contact submission: name, email, description.
- Use the project's PostgreSQL/Supabase database with sensible schema, timestamps, validation and safe public access policies. Do not expose stored leads publicly.
- The LLM integration must be implemented through a secure server-side mechanism; never expose API keys in client code. If an API key is not configured, provide a clearly labeled demo/fallback generation so the complete UX remains testable rather than breaking.
- Include robust loading, error, validation, copy-to-clipboard and download behavior.

Suggested page structure:
Hero with headline "Convierte un problema de negocio en un agente de IA." and CTA "Crear mi agente".
Interactive 3-step factory/workbench as the centerpiece.
Generated result displayed as a polished "Ficha del agente" with tabs/cards for system prompt and technical card.
CTA/contact section.
Footer with concise positioning.

Use TypeScript, Tailwind and shadcn/ui. Build reusable components and keep the code maintainable. Prioritize accessibility, mobile responsiveness and performance. Add clear microcopy explaining that this is a prototype and generated agents should be reviewed before production.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ee919da1-21de-4fb7-ad47-fa0cf092735c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
