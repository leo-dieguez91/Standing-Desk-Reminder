# Standing Desk Reminder 🏥

Una extensión de Chrome que mejora tu salud laboral con recordatorios inteligentes para alternar entre trabajar de pie y sentado.

## ✨ Características

- ⏰ **Recordatorios personalizables** - Configura intervalos que se adapten a tu rutina
- 🔔 **Notificaciones inteligentes** - Alertas suaves que no interrumpen tu trabajo
- ⚙️ **Configuración flexible** - Ajusta tiempos según tus necesidades
- 💾 **Persistencia de datos** - Tus preferencias se mantienen entre sesiones
- 🎨 **Interfaz intuitiva** - Diseño limpio y fácil de usar

## 🚀 Instalación

### Requisitos
- Node.js 18+
- NPM, Yarn o PNPM

### Pasos de instalación
1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/leo-dieguez91/Standing-Desk-Reminder.git
   cd Standing-Desk-Reminder
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Construir la extensión:**
   ```bash
   npm run build
   ```

4. **Instalar en Chrome:**
   - Abrir `chrome://extensions/`
   - Activar **Modo desarrollador**
   - Hacer clic en **Cargar descomprimida**
   - Seleccionar la carpeta `dist/`

## 🛠️ Desarrollo

### Modo desarrollo
```bash
npm run dev
```
La extensión se reconstruye automáticamente cuando modificas archivos.

### Modo producción
```bash
npm run build
```
Genera la versión optimizada para distribución.

## 🎯 Uso

La extensión te recordará automáticamente cuándo cambiar de postura, ayudándote a:
- Reducir la fatiga y dolor de espalda
- Mejorar la circulación sanguínea
- Aumentar la energía y concentración
- Prevenir problemas posturales a largo plazo

## 🔧 Personalización

### Manifest
Edita `public/manifest.json` para cambiar:
- Nombre y descripción de la extensión
- Permisos requeridos
- Iconos y configuración

### Interfaz
- **Popup:** Modifica `src/popup/` para cambiar la interfaz
- **Estilos:** Edita `src/styles.css` para personalizar la apariencia

## 📄 Licencia

MIT License - Libre para uso personal y comercial


- **GitHub:** [@leo-dieguez91](https://github.com/leo-dieguez91)
- **Proyecto:** [Standing Desk Reminder](https://github.com/leo-dieguez91/Standing-Desk-Reminder)

---

**¡Mantén tu salud en mente mientras trabajas!** 

*Desarrollado con ❤️ para mejorar tu bienestar laboral.*
