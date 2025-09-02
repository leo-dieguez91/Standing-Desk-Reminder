# My Extension (MV3 + TS + Vite + React)

## Requisitos
- Node 18+
- PNPM / NPM / Yarn

## Desarrollo
1. Instalar deps: `npm i`
2. Build en modo watch: `npm run dev`
3. En Chrome: `chrome://extensions` → activar **Developer mode** → **Load unpacked** → seleccionar la carpeta `dist/`.

> También podés hacer `npm run build` para bundle de producción.

## Personalización
- Edita `public/manifest.json` (nombre, descripción, permisos, matches).
- Ajusta selectores en `src/content.ts`.
- Cambia UI del popup en `src/popup/*`.
