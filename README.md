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