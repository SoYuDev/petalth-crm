# Petalth Developer Notes
Este archivo tiene como motivo documentar las decisiones de desarrollo y arquitectura que se van realizando durante el desarrollo de la aplicación **Petalth**

## 1. ¿Qué es Petalth?
Petalth es una aplicación de gestión para las posibles necesidades que tendría una clínica veterinaria para mascotas domésticas.

## 2. Casos de uso.

### 2.1 Cliente (Owner)

- Gestión de Mascotas (CRUD): Registro de nuevas mascotas, edición de datos y eliminación.

- Agendar Cita: Solicitar atención seleccionando:

  - Mascota (Paciente).

  - Veterinario deseado (Opcional o específico).

  - Fecha y Hora.

  - Motivo de consulta (reason).

  - Consultar Historial Médico: Vista detallada de las citas pasadas (COMPLETED) de sus mascotas para ver los diagnósticos (diagnosis) recibidos.

  - Gestión de Citas Activas: Posibilidad de cancelar una cita pendiente si surge un imprevisto.

  - Control Financiero: Visualización de las facturas generadas y su estado de pago (PAID/UNPAID).

### 2.2 Veterinario (Veterinarian)
El profesional de salud. Su flujo de trabajo está orientado a la agenda y la resolución médica.

- Agenda Diaria: Visualización filtrada de las citas programadas para el día en curso o fechas futuras específicas.

- Gestión de Consulta:

- Acceso al detalle de la cita.

- Registro del diagnóstico (diagnosis).

- Finalización de la cita (Cambio de estado a COMPLETED).

- Generación de Facturas: Creación de la factura asociada al servicio prestado.

### 2.3 Administrador (Admin)
- Gestión interna del negocio.

- Gestión de Personal: Alta de nuevos veterinarios (Creación de User + perfil Veterinarian).

- Visión Global: Acceso a todas las citas y facturas del sistema para resolución de conflictos.
