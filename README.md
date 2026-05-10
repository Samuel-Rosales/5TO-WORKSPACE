# 5TO-WORKSPACE

Este repositorio es solo un espacio de trabajo que orquesta el backend y el frontend.

## Estructura

```
/
├── BACKEND-5TO/      # API REST con Express + Prisma + TypeScript
├── FRONTEND-5TO/     # Webapp con Astro + React
├── scripts/          # Scripts de utilidad
└── package.json      # Workspaces npm
```

## Requisitos

- Node.js 18+
- npm 9+

## Instalación

```bash
npm install
```

## Desarrollo

```bash
# Iniciar ambos servicios (backend + frontend)
npm run dev

# Iniciar solo backend
npm run dev:back

# Iniciar solo frontend
npm run dev:front
```

## Puertos

- **Backend**: http://localhost:3800
- **Frontend**: http://localhost:4321

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run prisma:generate` | Generar cliente Prisma |
| `npm run prisma:migrate` | Aplicar migraciones |
| `npm run prisma:studio` | Abrir Prisma Studio |
| `npm run prisma:seed` | Poblar base de datos |
| `npm run build` | Compilar frontend |
| `npm run preview` | Previsualizar frontend |

## Inicializar repos internos

```bash
npm run init
```

Clona los repositorios internos desde GitHub (BACKEND-5TO y FRONTEND-5TO).
Usa este comando cuando necesites reconstruir los workspaces locales.

Repositorios fuente:

- https://github.com/Samuel-Rosales/BACKEND-5TO.git
- https://github.com/EDGAR-BRI/FRONTEND-5TO.git

Despues de clonar, instala dependencias:

```bash
npm install
```
