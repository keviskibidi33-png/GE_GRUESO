# Branding Iframes - GE Grueso

Documento de referencia para mantener consistente el branding del microfrontend GE Grueso y su visualizacion embebida en iframe dentro del CRM.

## Alcance

- Microfrontend: `ge-grueso-crm`
- Shell embebedor: `crm-geofal` modulo GE Grueso
- Flujo: CRM abre `https://ge-grueso.geofal.com.pe` en dialog modal con `token` y opcionalmente `ensayo_id`

## Reglas visuales

- Mantener la paleta y tipografia definida en `src/index.css` y `BRANDING.md` del workspace.
- Mantener estructura de hoja tecnica (fondo gris, bordes y tablas) fiel a `Template_GE_GRUESO.xlsx`.
- Mantener orden visual del formato ASTM C127-25 en el formulario web.
- Mantener botonera final con accion doble: `Guardar` y `Guardar y Descargar`.

## Contrato iframe

- Entrada por query params: `token`, `ensayo_id`.
- Mensajes hijo -> padre: `TOKEN_REFRESH_REQUEST`, `CLOSE_MODAL`.
- Mensaje padre -> hijo: `TOKEN_REFRESH`.

## Archivos clave

- `ge-grueso-crm/src/pages/GeGruesoForm.tsx`
- `ge-grueso-crm/src/App.tsx`
- `ge-grueso-crm/src/components/SessionGuard.tsx`
- `crm-geofal/src/components/dashboard/ge-grueso-module.tsx`
