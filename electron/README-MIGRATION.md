# Migración a Backend Remoto

La aplicación Electron ahora consume datos desde un backend NestJS en lugar de usar SQLite local.

## Configuración

Edita `electron/config.js` y cambia la URL del backend:

```js
const BACKEND_URL = 'https://tu-app.onrender.com/api';
```

Durante desarrollo local:
```js
const BACKEND_URL = 'http://localhost:3000/api';
```

## Cambios realizados

1. **`electron/preload.js`**: Ahora hace `fetch` HTTP al backend remoto y convierte camelCase a snake_case para mantener compatibilidad con el frontend.
2. **`electron/main.js`**: Ya no inicia el servidor Express local ni carga SQLite.
3. **`electron/config.js`**: Archivo centralizado para la URL del backend.

## Notas

- La base de datos local (`valentini.db`) ya no se utiliza.
- Se requiere conexión a Internet para usar la aplicación.
- El backend en Render debe tener CORS habilitado (ya está configurado en NestJS).
