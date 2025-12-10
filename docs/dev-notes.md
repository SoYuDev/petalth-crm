# Petalth Developer Notes

Este archivo tiene como motivo documentar las decisiones de desarrollo y arquitectura que se van realizando durante el desarrollo de la aplicación **Petalth**

## 1. ¿Qué es Petalth?

Petalth es una aplicación de gestión para las posibles necesidades que tendría una clínica veterinaria para mascotas domésticas.

## 2. Casos de uso

Los casos de uso principales identificados para el MVP (Producto Mínimo Viable) son:

### 2.1 Cliente (Owner)

-   **Gestión de Mascotas (CRUD):** Registro de nuevas mascotas, edición de datos y eliminación.
-   **Agendar Cita:** Solicitar atención seleccionando:
    -   Mascota (Paciente).
    -   Veterinario deseado (Opcional o específico).
    -   Fecha y Hora.
    -   Motivo de consulta (`reason`).
-   **Consultar Historial Médico:** Vista detallada de las citas pasadas (`COMPLETED`) de sus mascotas para ver los diagnósticos (`diagnosis`) recibidos.
-   **Gestión de Citas Activas:** Posibilidad de cancelar una cita pendiente si surge un imprevisto.
-   **Control Financiero:** Visualización de las facturas generadas y su estado de pago (`PAID`/`UNPAID`).

### 2.2 Veterinario (Veterinarian)

El profesional de salud. Su flujo de trabajo está orientado a la agenda y la resolución médica.

-   **Agenda Diaria:** Visualización filtrada de las citas programadas para el día en curso o fechas futuras específicas.
-   **Gestión de Consulta:**
    -   Acceso al detalle de la cita.
    -   Registro del diagnóstico (`diagnosis`).
    -   Finalización de la cita (Cambio de estado a `COMPLETED`).
-   **Generación de Facturas:** Creación de la factura asociada al servicio prestado.

### 2.3 Administrador (Admin)

-   **Gestión interna del negocio:** Visión global de la clínica.
-   **Gestión de Personal:** Alta de nuevos veterinarios (Creación de `User` + perfil `Veterinarian`).
-   **Supervisión:** Acceso a todas las citas y facturas del sistema para resolución de conflictos o auditoría.

## 3. Creación de entidades

Para la persistencia de datos hemos optado por **Spring Data JPA**, utilizando Hibernate como proveedor de ORM (Object-Relational Mapping). Esto nos permite trabajar con objetos Java (`@Entity`) que se transforman automáticamente en tablas relacionales en PostgreSQL.

### 3.1 Dependencias y Configuración

Las dependencias clave en el `pom.xml` son:

-   **PostgreSQL Driver:** Para la conectividad con la base de datos.
-   **Spring Data JPA:** Para la abstracción de repositorios y gestión de entidades.
-   **Lombok:** Para reducir el código repetitivo (_boilerplate_) como Getters, Setters y Builders.

En cuanto a la configuración (`application.properties`), podemos ver el código comentado en el proyecto.

### 3.2 Definición de Entidades y Arquitectura de Datos

#### 3.2.1 User (Autenticación Centralizada)

La entidad `User` actúa como el núcleo de seguridad de la aplicación.

-   **Responsabilidad:** Almacena las credenciales (`email`, `password`) y los datos de identidad personal (`firstName`, `lastName`) comunes a todos los actores del sistema.
-   **Roles:** Utilizamos un Enum (`Rol`) persistido como `@Enumerated(EnumType.STRING)`. Esto asegura que en la base de datos se guarde el texto legible ("VET", "OWNER") en lugar de un índice numérico, evitando errores si se reordenan los roles en el código en el futuro.
-   **Decisión de Diseño:** Se ha centralizado el nombre y apellidos aquí para evitar duplicidad en las tablas de perfiles y facilitar la identificación del usuario tras el login, independientemente de su rol.

#### 3.2.2 Owner y Veterinarian (Perfiles por Composición)

En lugar de utilizar herencia de tablas (estrategia `JOINED` o `SINGLE_TABLE`), hemos optado por una relación de **Composición 1:1** con la entidad `User`.

-   **Uso de `@MapsId`:** Esta anotación es clave en nuestra arquitectura. Indica que la Clave Primaria (PK) de `Owner` (o `Veterinarian`) es, a su vez, una Clave Foránea (FK) que apunta a `User`.
-   **Ventaja:** Garantiza la integridad referencial (no puede existir un perfil sin usuario) y optimiza las consultas, ya que ambos registros comparten el mismo ID numérico.
-   **Separación de Datos:**
    -   `Veterinarian` contiene solo datos profesionales (`speciality`).
    -   `Owner` contiene datos de contacto (`phone`, `address`) y la relación con sus mascotas.

#### 3.2.3 Pet (Paciente)

Representa a la mascota.

-   **Relación con Owner:** Es una relación N:1 (`@ManyToOne`). Una mascota pertenece obligatoriamente a un dueño.
-   **Historial Médico:** La mascota mantiene una lista de sus citas (`@OneToMany` hacia `Appointment`).
-   **Integridad:** Se ha configurado `orphanRemoval=true` y `CascadeType.ALL` en la lista de citas. Esto significa que el ciclo de vida de las citas depende de la mascota: si se elimina una mascota del sistema, su historial médico se elimina automáticamente para evitar registros huérfanos.

#### 3.2.4 Appointment (El Evento Central)

Es la entidad que articula la lógica de negocio, uniendo a una `Pet` con un `Veterinarian`.

-   **Doble Estado:** Hemos separado la información en dos campos:
    -   `reason`: El motivo por el que el dueño pide la cita (Input).
    -   `diagnosis`: La conclusión médica del veterinario (Output).
-   **Estados:** Controlado por un Enum (`PENDING`, `COMPLETED`, `CANCELLED`) para gestionar el flujo de trabajo de forma estricta.
-   **Relaciones:** Utiliza carga perezosa (`FetchType.LAZY`) en sus relaciones con `Pet` y `Veterinarian` para optimizar el rendimiento y no traer datos innecesarios en consultas masivas.

### 3.2.5 Invoice (Facturación Desacoplada)

Maneja la información económica de la clínica.

-   **Tipos de Datos:** Se utiliza `BigDecimal` para el campo `amount` (importe). El uso de primitivos como `double` o `float` no es apto para cálculos monetarios debido a errores de precisión en coma flotante.
-   **Relación 1:1 Estricta:** Vinculada a `Appointment` mediante la anotación `@OneToOne` con `unique=true`, lo que fuerza una restricción (constraint) en base de datos para asegurar que una cita solo pueda generar una única factura.
-   **Independencia de Estado:** Al ser una entidad separada, permite que el ciclo de vida financiero (ej. estado `PAID`, `PENDING`) evolucione independientemente del estado médico o clínico de la cita.

## 3.3 Relaciones entre entidades y Métodos Helper

En JPA/Hibernate, la consistencia de los objetos en memoria es responsabilidad del desarrollador. Aunque definamos las relaciones en las entidades, Hibernate no actualiza automáticamente ambos extremos de una relación bidireccional en tiempo real (solo lo hace al recargar desde la BD). Por ello, implementamos **Métodos Helper** (`addX`, `removeX`, `setX`) para garantizar la sincronización.

### 3.3.1 @OneToOne (Appointment ↔ Invoice)

En esta relación, aunque `Invoice` es técnicamente la "dueña" de la relación en Base de Datos (porque posee la FK `appointment_id`), `Appointment` es la entidad principal o "Padre" en la lógica de negocio.

-   **El desafío:** Si asignamos la factura solo en la cita (`this.invoice = invoice`), el objeto factura no sabe a quién pertenece (`invoice.appointment` sigue siendo null). Al guardar, la FK en la tabla `invoice` quedaría nula.
-   **La solución:** El método helper se coloca en la entidad padre (`Appointment`) y coordina ambos lados:
    ```java
    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
        if (invoice != null) {
            // Sincronización manual: decimos a la hija quién es su padre
            invoice.setAppointment(this);
        }
    }
    ```

### 3.3.2 @OneToMany (Veterinarian → Appointments)

Representa una colección estándar, donde un Veterinario tiene una lista de Citas asignadas.

-   **El desafío:** La base de datos relacional no guarda "listas" dentro de la tabla de veterinarios. Lo que existe es una FK en la tabla de citas. Si solamente hacemos `listaCitas.add(cita)`, Hibernate no detecta un cambio en la columna FK de la cita.
-   **La solución:** Los métodos helper encapsulan la lógica de añadir a la lista Y asignar la referencia inversa:
    ```java
    public void addAppointment(Appointment appointment) {
        this.appointments.add(appointment);
        appointment.setVeterinarian(this); // Esto actualiza la FK en la tabla hija
    }
    ```

### 3.3.3 @ManyToOne (Appointment → Veterinarian)

Esta anotación define el lado "Dueño" (Owning side) de la relación en la base de datos (donde reside la columna `veterinarian_id`).

-   **Comportamiento:** A diferencia de las anteriores, esta anotación **no suele requerir métodos helper complejos**. Al ser el lado que controla físicamente la llave foránea, un simple `setVeterinarian(vet)` es suficiente para que Hibernate persista la relación. La complejidad de sincronización suele delegarse a la entidad que contiene la colección (`OneToMany`).

## 4. DTOs (Data Transfer Objects)

Para desacoplar la capa de persistencia (Entidades JPA) de la capa de presentación (API REST), utilizamos el patrón DTO implementado mediante **Java Records** (disponibles desde Java 16).

### ¿Por qué usamos Records?

1.  **Inmutabilidad:** Los DTOs deben ser meros transportadores de datos. Los records son inmutables por defecto, lo que previene modificaciones accidentales de los datos mientras viajan hacia el cliente.
2.  **Concisión:** Eliminan el "boilerplate". Java genera automáticamente constructor, `toString`, `equals`, `hashCode` y métodos de acceso, manteniendo el código limpio.
3.  **Seguridad y Rendimiento:**
    -   Evitamos exponer la estructura interna de la base de datos.
    -   Prevenimos errores de recursividad infinita (StackOverflow en JSON) al no incluir relaciones circulares bidireccionales en el DTO.
    -   Permiten "aplanar" datos complejos para que el Frontend reciba una estructura simple.

**Ejemplo de implementación:**

```java
// DTO como Record: Simple, inmutable y directo
public record VeterinarianDTO(Long id, String fullName, String speciality) {
}
```
