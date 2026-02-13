# thelist.cl

Marketplace curado de experiencias en Chile.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- Fonts: Playfair Display + Outfit (via Google Fonts)

## Setup

```bash
# Instalar dependencias
npm install

# Correr en desarrollo
npm run dev

# Abrir en el browser
open http://localhost:3000
```

## Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy a producción
vercel --prod
```

## Estructura del proyecto

```
thelist/
├── app/
│   ├── globals.css          # Estilos globales + Tailwind + brand tokens
│   ├── layout.tsx           # Root layout con metadata
│   └── page.tsx             # Home page (compone todos los componentes)
├── components/
│   ├── Navbar.tsx            # Navegación principal
│   ├── Hero.tsx              # Hero fullscreen
│   ├── DropCard.tsx          # Tarjeta individual de drop
│   ├── Drops.tsx             # Sección de drops con grid
│   ├── Salas.tsx             # Sección de salas/categorías
│   ├── TheDoor.tsx           # Overlay fullscreen (quiz de 4 pasos)
│   └── Footer.tsx            # Footer
├── tailwind.config.ts        # Config de Tailwind con brand tokens
├── next.config.js
├── tsconfig.json
└── package.json
```

## Próximos pasos (Sprint 2)

- Integrar Supabase (auth, DB, storage)
- Registro de proveedores con aprobación
- CRUD de experiencias (drops)
- Upload de imágenes a Supabase Storage
- Página de detalle de drop
