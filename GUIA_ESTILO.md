# 🛠️ Estándar de Trabajo y Commits

Para mantener este portafolio con calidad profesional, seguiremos estas reglas en cada proyecto.

## 1. Estándar de Commits (Conventional Commits)
El formato debe ser: `<tipo>: <descripción breve en minúsculas>`

| Tipo | Cuándo usarlo | Ejemplo |
| :--- | :--- | :--- |
| **feat** | Una nueva funcionalidad o archivo importante. | `feat: agrega algoritmo de filtrado FIR` |
| **fix** | Corregir un error en el código o un bug. | `fix: corrige error de desbordamiento en el ADC` |
| **docs** | Cambios solo en la documentación o el README. | `docs: actualiza esquema de conexión en el readme` |
| **refactor** | Cambios en el código que no añaden nada nuevo ni arreglan bugs. | `refactor: optimiza el bucle principal de control` |
| **hw** | Específico para cambios en esquemáticos o PCB. | `hw: ajusta ancho de pistas de potencia` |
| **assets** | Agregar imágenes, fotos o diagramas. | `assets: agrega fotos del prototipo final` |

## 2. Nomenclatura de Archivos
- **Código:** Usar `snake_case` (ej. `main_control.c`) o `camelCase` según el estándar del lenguaje.
- **Hardware:** Versionar los archivos de diseño (ej. `placa_v1.0.kicad_pcb`).
- **Documentos:** Evitar espacios en los nombres. Usar guiones (ej. `reporte-final.pdf`).

## 3. Flujo de Trabajo (Checklist)
1. Antes de subir: Revisar que el código esté comentado.
2. Limpiar: Borrar archivos temporales o de compilación (`.o`, `.hex`) que no filtró el `.gitignore`.
3. Documentar: Si subes una mejora, actualiza la sección correspondiente en el `README.md`.