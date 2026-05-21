# README Manager

![Status](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-CC%20BY--NC%204.0-orange)
![React](https://img.shields.io/badge/React-18-61dafb)
![Vite](https://img.shields.io/badge/Vite-6-646cff)

> Generador de READMEs profesionales basado en templates. Crea, edita y reutiliza estructuras de documentación para tus proyectos de hardware, firmware, apps móviles y más.

## 📝 Descripción

README Manager es una herramienta web que permite definir **templates de documentación reutilizables** y generar READMEs completos rellenando un formulario estructurado. Incluye preview en tiempo real, editor de rich content por bloques, soporte para tablas, imágenes, alertas GFM, toggles colapsibles y exportación directa a `.md`.

Desarrollado como herramienta de productividad personal para proyectos de embedded systems, PCB design y desarrollo de apps.

## 🚀 Características Principales

- **Templates reutilizables:** Define la estructura una vez, genera READMEs ilimitados.
- **Editor de bloques rich content:** Combina texto, código, imágenes, alertas, toggles y más en cualquier orden dentro de un mismo campo.
- **Preview en tiempo real:** Vista renderizada del README mientras escribes.
- **Edición en vivo:** Modifica la estructura del template directamente al generar sin salir del formulario.
- **Drag & drop de imágenes:** Arrastra una imagen para obtener la ruta sugerida para tu repo automáticamente.
- **Reordenamiento de secciones:** Sube y baja secciones con botones ↑↓ en el editor.
- **Exportar / Importar JSON:** Comparte templates entre proyectos y colaboradores.
- **Deploy automático:** CI/CD con GitHub Actions hacia GitHub Pages.

## 🛠️ Tecnologías Utilizadas

- **Framework:** React 18 con hooks
- **Build tool:** Vite 6
- **Íconos:** lucide-react
- **Deploy:** GitHub Pages vía GitHub Actions
- **Estilos:** CSS-in-JS (inline styles)
- **Persistencia:** localStorage del navegador

## 📁 Estructura del Repositorio

```
readme-manager/
├── public/
│   └── templates/          ← Templates JSON del repositorio (defaults)
│       ├── hw.json         ← Hardware / Embebido
│       ├── api.json        ← REST API / Backend
│       ├── mobile.json     ← App Móvil
│       ├── lib.json        ← Librería Open Source
│       ├── uni.json        ← Proyecto Universitario
│       └── lesson.json     ← Lección técnica / Documentación de producto
├── src/
│   └── App.jsx             ← Aplicación completa (componente único)
├── .github/
│   └── workflows/
│       └── ci.yml          ← Lint + deploy automático a GitHub Pages
├── vite.config.js
└── package.json
```
## ⚙️ Instalación y Uso Local

```bash
# 1. Clonar el repositorio
git clone git@github.com:obviousfancy/readme-manager.git
cd readme-manager

# 2. Instalar dependencias
npm install

# 3. Levantar servidor de desarrollo
npm run dev
```
Abre http://localhost:5173 en tu navegador.

## 📦 Agregar un Template al Repositorio
Los templates que viven en public/templates/ están disponibles para todos los usuarios que clonen el repo.

**Pasos:**

1. Crea tu archivo JSON con la estructura del template (ver ejemplos en `public/templates/`)
2. Cópialo a `public/templates/tu-template.json`
3. Agrega el nombre del archivo al array `TEMPLATE_FILES` en `src/App.jsx`:

```js
const TEMPLATE_FILES = ['hw.json', 'api.json', ..., 'tu-template.json'];
```

4. Haz commit y push — el CI desplegará automáticamente.

[!TIP]
También puedes importar un template JSON desde el botón "Importar JSON" en el dashboard sin tocar el código. Quedará guardado en tu localStorage local.

---

## 🧩 Tipos de Campo Disponibles

| Tipo | Descripción | Genera en Markdown |
| :--- | :--- | :--- |
| `text` | Texto corto de una línea | `**Label:** valor` |
| `textarea` | Texto largo multilinea | Párrafo o bloque de código |
| `list` | Lista con sub-tipos: puntos, numerada, tareas | `- item` / `1. item` / `- [ ] item` |
| `table` | Tabla editable con columnas y filas configurables | Tabla GFM |
| `image` | Imagen con drag & drop, alt, caption y centrado | `![alt](url)` o `<div align="center">` |
| `code` | Bloque de código con selector de lenguaje | ` ```cpp ` |
| `alert` | Alerta GFM: NOTE, TIP, WARNING, IMPORTANT, CAUTION | `> [!NOTE]` |
| `collapsible` | Toggle colapsible con summary y contenido | `<details><summary>` |
| `badges` | Shields.io badges con preview en vivo | `![badge](shields.io/...)` |
| `video` | Link a video con thumbnail clickeable | Imagen clickeable o link 🎬 |
| `blocks` | Editor de rich content — combina todos los tipos en orden libre | Todos los anteriores |

## 🔩 Guía de Trabajo Rápida

| Tipo de Commit | Descripción |
| :--- | :--- |
| **feat** | Nueva funcionalidad o campo |
| **template** | Nuevo template JSON o modificación de existente |
| **fix** | Corrección de errores |
| **docs** | Cambios en el README o documentación |
| **style** | Cambios visuales sin afectar funcionalidad |

## 🌐 Deploy

El proyecto usa GitHub Actions para deploy automático. Cada push a `main` ejecuta:

1. **Lint** — verifica el código con ESLint
2. **Build** — genera los archivos estáticos con Vite
3. **Deploy** — publica en la rama `gh-pages`

La app queda disponible en `https://obviousfancy.github.io/readme-manager/`

---

## 📄 Licencia y Uso Comercial

Este proyecto está licenciado bajo la **Licencia Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)**.

* **Uso permitido:** Eres completamente libre de usar, bifurcar (fork), modificar y adaptar este generador para fines personales, educativos o herramientas internas comunitarias de código abierto, siempre y cuando mantengas la atribución obligatoria al autor original.
* **Uso Comercial y Regalías:** Queda estrictamente prohibida la explotación comercial de este software, su código o derivados (como integrarlo en plataformas SaaS de pago, empaquetarlo como producto comercial o monetizar el servicio de generación) sin autorización previa. Si estás interesado en adquirir una **licencia comercial separada** o acordar un esquema de regalías, por favor ponte en contacto conmigo.

---

Desarrollado por [obviousfancy](https://github.com/obviousfancy) 
