# xTechJS

Plataforma de gestion para un laboratorio tecnico de reparaciones.

## Estructura

- `apps/api`: API TypeScript organizada por contextos de dominio.
- `apps/web`: consola web Vue 3 para administracion, tecnicos y clientes.
- `.context`: especificacion funcional y tecnica del proyecto.

## Desarrollo local

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Servicios de datos para desarrollo:

```bash
docker compose up -d postgres redis
```

La API queda disponible en `http://localhost:3000/health` y el cliente en `http://localhost:5173`.

## Pila Docker completa

```bash
cp .env.example .env
docker compose up --build -d
```

La aplicacion queda disponible en `http://localhost:8080`, con la API publicada en
`http://localhost:3000`. El frontend reenvia las llamadas a `/api` hacia el servicio `api`.

Para detener la pila y conservar los datos:

```bash
docker compose down
```