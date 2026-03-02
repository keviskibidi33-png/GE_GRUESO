# GE Grueso CRM Frontend

Microfrontend del módulo **GE Grueso ASTM C127-25** para Geofal.

- Dominio productivo: `https://ge-grueso.geofal.com.pe`
- Backend API: `https://api.geofal.com.pe` (rutas `/api/ge-grueso`)

## Objetivo

- Registrar/editar ensayos de GE Grueso.
- Guardar estado en BD (`EN PROCESO`/`COMPLETO`).
- Exportar Excel con plantilla oficial `Template_GE_GRUESO.xlsx`.
- Cerrar modal del CRM al finalizar guardado.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Axios
- React Hot Toast

## Variables de entorno

- `VITE_API_URL=https://api.geofal.com.pe`
- `VITE_CRM_LOGIN_URL=https://crm.geofal.com.pe/login`

## Desarrollo local

```bash
npm install
npm run dev
```

## Alcance funcional

- Encabezado (`Muestra`, `N OT`, `Fecha`, `Realizado`).
- Descripcion de muestra con validaciones SI/NO.
- Condiciones del ensayo, codigos de equipos y masas por fracciones.
- Reporte 1° y 2° fraccion (A, B, C, D y masa total).
- Observaciones y cierre (revisado/aprobado).

## Validación recomendada

- Validar formato automático de `Muestra`, `N OT` y fechas al salir del input.
- Completar datos de reporte por fracciones y validar autocalculo de masa total.
- Guardar y descargar para validar ciclo completo.
