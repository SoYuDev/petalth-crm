# Petalth Developer Notes

Este archivo tiene como motivo documentar las decisiones de desarrollo y arquitectura que se van realizando durante el desarrollo de la aplicación **Petalth**. 

---

## 1. ¿Qué es Petalth? 

Petalth es una aplicación de gestión para las posibles necesidades que tendría una clínica veterinaria para mascotas domésticas. 

### 1.1 Casos de Uso Principales

| Actor | Funcionalidad |
|-------|---------------|
| **Usuario** | Login y registro (Sign in / Sign up) |
| **Owner** | CRUD de mascotas (delete = soft delete), agendar citas |
| **Veterinarian** | Ver sus citas, solicitar modificación de citas |
| **Admin** | CRUD de veterinarios (delete = soft delete), ver facturas |

---

## 2. Entidades y Modelo de Datos

### 2.1 Diagrama de Relaciones

```
User (petalth_user)
  │
  ├──[1:1]──► Owner ──[1:N]──► Pet ──[N:1]──► Appointment
  │             │                                  │
  │             └── @MapsId                        ├──[N:1]──► Veterinarian
  │                                                │
  └──[1:1]──► Veterinarian ◄───────────────────────┘
                  │                                │
                  └── @MapsId                      ├──[N:1]──► MedicalTreatment
                                                   │
                                                   └──[1:1]──► Invoice
```

---

### 2.2 Entidades

#### 2.2.1 User (petalth_user)

##### Definición

Es la entidad base de autenticación.  Otras entidades como `Owner` o `Veterinarian` heredan su PK mediante la anotación `@MapsId`.

##### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Long | PK autogenerada |
| `firstName` | String | Nombre |
| `lastName` | String | Apellido |
| `email` | String | Email único (usado para login) |
| `password` | String | Contraseña encriptada |
| `rol` | Enum | `ADMIN`, `VET`, `OWNER` |
| `active` | boolean | Soft delete |

##### Decisiones de Diseño

- Se usa `@Table(name = "petalth_user")` porque `user` es palabra reservada en PostgreSQL. 
- `@Enumerated(EnumType.STRING)` para guardar el rol como texto, evitando problemas si se reordenan los valores del enum. 

---

#### 2.2.2 Owner

##### Definición

Representa al dueño de mascotas. Extiende de `User` mediante composición con `@MapsId`.

##### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Long | PK heredada de User |
| `phone` | String | Teléfono de contacto |
| `address` | String | Dirección (útil para facturación) |

##### Relaciones

| Relación | Tipo | Dirección | Justificación |
|----------|------|-----------|---------------|
| `Owner → User` | `@OneToOne` | Unidireccional | Owner necesita acceder a datos de User |
| `Owner ↔ Pet` | `@OneToMany` | **Bidireccional** | Ver sección 3.1 |

##### ¿Por qué @MapsId? 

```java
@OneToOne
@MapsId
@JoinColumn(name = "user_id")
private User user;
```

`@MapsId` indica que `Owner` usará el mismo ID que `User`. Esto:
- Evita generar un ID adicional innecesario
- Garantiza relación 1:1 real a nivel de base de datos
- No necesita `unique = true` porque la PK ya es única por definición

---

#### 2.2.3 Pet

##### Definición

Representa una mascota.  Implementa **soft delete** para preservar el historial de facturas.

##### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Long | PK autogenerada |
| `name` | String | Nombre de la mascota |
| `photoUrl` | String | URL de la foto |
| `birthDate` | LocalDate | Fecha de nacimiento |
| `active` | boolean | `true` = activo, `false` = eliminado (soft delete) |

##### Relaciones

| Relación | Tipo | Dirección | Justificación |
|----------|------|-----------|---------------|
| `Pet → Owner` | `@ManyToOne` | Bidireccional | Necesario para facturación (`pet.getOwner()`) |
| `Pet ↔ Appointment` | `@OneToMany` | Bidireccional | Un dueño querrá ver historial de citas de su mascota |

##### Soft Delete

```java
@Builder. Default
private boolean active = true;
```

**¿Por qué soft delete en Pet?**

Si eliminamos físicamente una mascota, las facturas asociadas perderían la referencia.  Con soft delete: 
- Las facturas históricas mantienen la relación
- Se puede "restaurar" una mascota eliminada por error
- Los queries deben filtrar por `active = true`

```java
// En PetRepository
List<Pet> findByOwnerIdAndActiveTrue(Long ownerId);
```

---

#### 2.2.4 Veterinarian

##### Definición

Representa a un veterinario.  Al igual que `Owner`, hereda el ID de `User` mediante `@MapsId`.

##### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Long | PK heredada de User |
| `speciality` | String | Especialidad (cirugía, dermatología, etc.) |
| `active` | boolean | Soft delete |

##### Relaciones

| Relación | Tipo | Dirección | Justificación |
|----------|------|-----------|---------------|
| `Veterinarian → User` | `@OneToOne` | Unidireccional | Acceso a datos personales |
| `Veterinarian ↔ Appointment` | `@OneToMany` | Bidireccional | Ver nota sobre rendimiento |

##### ⚠️ Nota sobre rendimiento

Aunque la relación es bidireccional, **nunca** se debe usar `veterinarian.getAppointments()` sin filtrar: 

```java
// NUNCA hacer esto - puede cargar miles de registros
List<Appointment> todas = veterinarian.getAppointments();

// Siempre usar queries con filtros
List<Appointment> citasHoy = appointmentRepository
    .findByVeterinarianIdAndDateTimeBetween(vetId, startOfDay, endOfDay);
```

---

#### 2.2.5 Appointment

##### Definición

Representa una cita médica.  Es la entidad central que conecta `Pet`, `Veterinarian`, `MedicalTreatment` e `Invoice`.

##### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Long | PK autogenerada |
| `dateTime` | LocalDateTime | Fecha y hora de la cita |
| `diagnosis` | String | Notas del veterinario post-consulta |
| `status` | Enum | `PENDING`, `COMPLETED`, `CANCELLED` |

##### Relaciones

| Relación | Tipo | Dirección | Justificación |
|----------|------|-----------|---------------|
| `Appointment → Pet` | `@ManyToOne` | Bidireccional | Historial de citas por mascota |
| `Appointment → Veterinarian` | `@ManyToOne` | Bidireccional | Agenda del veterinario |
| `Appointment → MedicalTreatment` | `@ManyToOne` | **Unidireccional** | Ver sección 3.2 |
| `Appointment ↔ Invoice` | `@OneToOne` | Bidireccional | Una cita genera una factura |

##### Flujo de Estados

```
PENDING ────► COMPLETED ────► (Invoice generada)
    │
    └───────► CANCELLED
```

---

#### 2.2.6 MedicalTreatment

##### Definición

Catálogo de servicios/tratamientos que ofrece la clínica. Es seleccionado por el Owner al agendar una cita (motivo de consulta).

##### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Long | PK autogenerada |
| `name` | String | Nombre (Vacunación, Cirugía, etc.) |
| `description` | String | Descripción del servicio |
| `durationMinutes` | Integer | Duración estimada |
| `active` | boolean | Soft delete si se deja de ofrecer |

##### ¿Por qué NO tiene precio?

El precio lo decide el veterinario al finalizar la consulta, ya que puede variar según:
- Complejidad del caso
- Medicamentos utilizados
- Tiempo real empleado

```java
// El precio se establece en Invoice, no en MedicalTreatment
Invoice. builder()
    .amount(new BigDecimal("45.00"))  // Veterinario decide cuando despacha la factura
    .build();
```

---

#### 2.2.7 Invoice

##### Definición

Factura generada a partir de una cita completada. El veterinario la crea con el importe final.

##### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | Long | PK autogenerada |
| `issueDate` | LocalDateTime | Fecha de emisión |
| `amount` | BigDecimal | Importe total (puesto por el veterinario) |
| `status` | Enum | `UNPAID`, `PAID` |

##### ¿Por qué BigDecimal?

```java
private BigDecimal amount;  // Correcto para dinero
private double amount;      // NUNCA usar para dinero
```

`double` tiene errores de precisión en operaciones decimales. `BigDecimal` garantiza cálculos monetarios exactos.

##### Relación con Appointment

```java
@OneToOne
@JoinColumn(name = "appointment_id", unique = true)
private Appointment appointment;
```

`unique = true` garantiza que una cita solo pueda tener una factura a nivel de base de datos. 

---

### 2.3 Enums

#### AppointmentStatus

```java
public enum AppointmentStatus {
    PENDING,    // Cita agendada, pendiente de atender
    COMPLETED,  // Cita atendida por el veterinario
    CANCELLED   // Cita cancelada
}
```

#### InvoiceStatus

```java
public enum InvoiceStatus {
    UNPAID,  // Factura pendiente de pago
    PAID     // Factura pagada
}
```

#### Rol

```java
public enum Rol {
    ADMIN,  // Administrador del sistema
    VET,    // Veterinario
    OWNER   // Dueño de mascotas
}
```

---

## 3. Conceptos Clave de JPA

### 3.1 Relaciones Bidireccionales vs Unidireccionales

#### ¿Qué es bidireccional? 

Significa que puedes navegar en **ambas direcciones** desde Java: 

```java
// Bidireccional Owner ↔ Pet
owner.getPets();    // ✅ Owner → Pet
pet. getOwner();     // ✅ Pet → Owner

// Unidireccional Appointment → MedicalTreatment
appointment.getService();      // ✅ Appointment → Treatment
treatment.getAppointments();   // ❌ No existe
```

#### ¿Cuándo usar cada una?

| Criterio | Bidireccional | Unidireccional |
|----------|---------------|----------------|
| Colección pequeña (2-10 items) | ✅ | - |
| Colección potencialmente grande | - | ✅ |
| Necesitas cascade (guardar padre + hijos) | ✅ | - |
| Solo consultas con filtros | - | ✅ |
| Navegas frecuentemente en ambos sentidos | ✅ | - |

#### Identificar bidireccionalidad

La clave es `mappedBy`:

```java
// En Owner (lado "One")
@OneToMany(mappedBy = "owner")  // ← mappedBy indica bidireccional
private List<Pet> pets;

// En Pet (lado "Many")
@ManyToOne
@JoinColumn(name = "owner_id")
private Owner owner;
```

#### Relaciones en Petalth

| Relación | Tipo | Justificación |
|----------|------|---------------|
| `Owner ↔ Pet` | Bidireccional | Colección pequeña (2-5 mascotas), necesitas ambas navegaciones |
| `Pet ↔ Appointment` | Bidireccional | Ver historial de citas de una mascota |
| `Veterinarian ↔ Appointment` | Bidireccional | Aunque grande, útil para cascade |
| `Appointment → MedicalTreatment` | **Unidireccional** | Miles de citas por tratamiento, siempre se filtra |
| `Appointment ↔ Invoice` | Bidireccional | Verificar si cita tiene factura |

---

### 3.2 ¿Por qué MedicalTreatment → Appointment es Unidireccional?

Un tratamiento como "Vacunación" puede tener **miles de citas** a lo largo de los años: 

```java
// Si fuera bidireccional (PROBLEMA)
MedicalTreatment vacunacion = treatmentRepository.findByName("Vacunación");
List<Appointment> citas = vacunacion. getAppointments();
// ↑ ¡Podría cargar 50,000 citas en memoria! 

// Solución: Unidireccional + Query (CORRECTO)
List<Appointment> citasHoy = appointmentRepository
    . findByServiceNameAndDateTimeBetween("Vacunación", startOfDay, endOfDay);
```

---

### 3.3 ¿Dónde está la Foreign Key?

> En relaciones `@OneToMany` / `@ManyToOne`, la FK **siempre** está en el lado "Many". 

```
┌─────────────────┐          ┌─────────────────┐
│     OWNER       │          │       PET       │
├─────────────────┤          ├─────────────────┤
│ id (PK)         │◄────────┐│ id (PK)         │
│ phone           │         ││ name            │
│ address         │         ││ birth_date      │
│ user_id (FK)    │         ││ active          │
└─────────────────┘         ││ owner_id (FK) ──┘  ← FK aquí
                            └─────────────────┘
```

El campo `List<Pet> pets` en `Owner` **no genera columna** en la base de datos. Es solo una representación en memoria para navegar la relación.

---

### 3.4 Cascade Types

```java
@OneToMany(mappedBy = "owner", cascade = {CascadeType. PERSIST, CascadeType.MERGE})
private List<Pet> pets;
```

#### Tipos de Cascade

| Tipo | Efecto |
|------|--------|
| `PERSIST` | Al guardar Owner, guarda también los Pet nuevos |
| `MERGE` | Al actualizar Owner, actualiza también los Pet |
| `REMOVE` | Al eliminar Owner, elimina también los Pet |
| `ALL` | Todos los anteriores + REFRESH + DETACH |

#### ¿Por qué NO usamos CascadeType. REMOVE?

```java
// ❌ PROBLEMA con CascadeType. ALL o REMOVE
@OneToMany(cascade = CascadeType.ALL)
private List<Pet> pets;

ownerRepository.delete(owner);
// → Borra Owner
// → Borra todos los Pet (por cascade)
// → Las facturas pierden referencia a Pet 
```

**Solución:** Usar solo `PERSIST` y `MERGE`, y manejar borrados con **soft delete**:

```java
//  CORRECTO
@OneToMany(cascade = {CascadeType. PERSIST, CascadeType.MERGE})
private List<Pet> pets;
```

---

### 3.5 Helper Methods

En relaciones bidireccionales, **siempre** debes sincronizar ambos lados:

```java
// En Owner
public void addPet(Pet pet) {
    this.pets.add(pet);      // Lado Owner
    pet.setOwner(this);      // Lado Pet
}

public void removePet(Pet pet) {
    this.pets. remove(pet);
    pet.setOwner(null);
}
```

**¿Por qué son necesarios? **

Sin ellos, podrías tener inconsistencias: 

```java
//  Sin helper method - inconsistente
owner.getPets().add(pet);
// pet.getOwner() sigue siendo null! 

// ✅ Con helper method - consistente
owner.addPet(pet);
// pet.getOwner() ahora retorna owner
```

---

### 3.6 Soft Delete

#### ¿Qué es? 

En lugar de borrar físicamente un registro (`DELETE FROM`), se marca como inactivo:

```java
@Builder.Default
private boolean active = true;
```

#### Implementación en Repository

```java
public interface PetRepository extends JpaRepository<Pet, Long> {
    // Solo mascotas activas (para usuarios)
    List<Pet> findByOwnerIdAndActiveTrue(Long ownerId);
    
    // Todas las mascotas (para admin/reportes)
    List<Pet> findByOwnerId(Long ownerId);
}
```

#### Implementación en Service

```java
public void deletePet(Long petId) {
    Pet pet = petRepository.findById(petId)
        .orElseThrow(() -> new NotFoundException("Pet not found"));
    pet.setActive(false);  // Soft delete
    petRepository.save(pet);
}
```

#### Entidades con Soft Delete en Petalth

| Entidad | ¿Soft Delete?  | Razón |
|---------|---------------|-------|
| `User` | ✅ Sí | Consistencia con Owner/Veterinarian |
| `Pet` | ✅ Sí | Preservar facturas históricas |
| `Veterinarian` | ✅ Sí | Preservar facturas históricas |
| `MedicalTreatment` | ✅ Sí | Tratamientos pueden descontinuarse |
| `Appointment` | ❌ No | Usa `status = CANCELLED` |
| `Invoice` | ❌ No | Nunca se borran facturas (requisito legal) |
| `Owner` | ❌ No | Si se borra la cuenta, se puede borrar (las facturas quedan por Pet) |

---

## 4. Flujo MVP

### 4.1 Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FLUJO MVP                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  OWNER                                                               │
│  ──────                                                              │
│  1. Ve página "Mis Mascotas"                                         │
│  2. Click en mascota → Botón "Pedir Cita"                            │
│  3. Selecciona:  fecha, hora, veterinario, motivo (MedicalTreatment)  │
│  4. Se crea Appointment (status: PENDING)                            │
│                                                                      │
│  VETERINARIO                                                         │
│  ────────────                                                        │
│  1. Ve sus citas del día (status: PENDING)                           │
│  2. Atiende la cita                                                  │
│  3. Añade diagnosis + crea Invoice con amount                        │
│  4. Appointment (status: COMPLETED) + Invoice (status:  UNPAID)       │
│  5. Marca como pagado → Invoice (status:  PAID)                       │
│                                                                      │
│  ADMIN                                                               │
│  ─────                                                               │
│  1. CRUD de Veterinarios (soft delete)                               │
│  2. Ve todas las Invoices con paginación                             │
│  3. Filtra por estado (PAID/UNPAID), fecha, etc.                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Estados de una Cita

```
                    ┌──────────────────┐
                    │     PENDING      │
                    │  (Cita creada)   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              │              ▼
    ┌─────────────────┐      │    ┌─────────────────┐
    │   CANCELLED     │      │    │   COMPLETED     │
    │ (Owner cancela) │      │    │ (Vet atiende)   │
    └─────────────────┘      │    └────────┬────────┘
                             │             │
                             │             ▼
                             │    ┌─────────────────┐
                             │    │    INVOICE      │
                             │    │   (Generada)    │
                             │    └────────┬────────┘
                             │             │
                             │    ┌────────┴────────┐
                             │    │                 │
                             │    ▼                 ▼
                             │  UNPAID           PAID
                             │  (Pendiente)    (Pagado)
                             │
                             └─────────────────────────
```

---

## 5. Estructura del Proyecto


## 6. API Endpoints (MVP)

### 6.1 Autenticación

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| POST | `/api/auth/register` | Registro de usuario | Público |
| POST | `/api/auth/login` | Login | Público |

### 6.2 Mascotas

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/api/pets` | Listar mis mascotas | OWNER |
| GET | `/api/pets/{id}` | Ver detalle de mascota | OWNER |
| POST | `/api/pets` | Crear mascota | OWNER |
| PUT | `/api/pets/{id}` | Actualizar mascota | OWNER |
| DELETE | `/api/pets/{id}` | Soft delete mascota | OWNER |

### 6.3 Citas

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/api/appointments` | Listar mis citas | OWNER/VET |
| POST | `/api/appointments` | Crear cita | OWNER |
| PUT | `/api/appointments/{id}/complete` | Completar cita + crear invoice | VET |
| PUT | `/api/appointments/{id}/cancel` | Cancelar cita | OWNER |

### 6.4 Facturas

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/api/invoices` | Listar facturas (paginado) | ADMIN |
| PUT | `/api/invoices/{id}/pay` | Marcar como pagada | VET/ADMIN |

### 6.5 Veterinarios (Admin)

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/api/veterinarians` | Listar veterinarios | ADMIN |
| POST | `/api/veterinarians` | Crear veterinario | ADMIN |
| PUT | `/api/veterinarians/{id}` | Actualizar veterinario | ADMIN |
| DELETE | `/api/veterinarians/{id}` | Soft delete veterinario | ADMIN |

### 6.6 Tratamientos

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/api/treatments` | Listar tratamientos activos | OWNER |

---

## 7. Mejoras Futuras (Post-MVP)

- [ ] Añadir `Species` a Pet (perro, gato, ave, etc.)
- [ ] Campos de auditoría (`createdAt`, `updatedAt`) con `@CreatedDate`, `@LastModifiedDate`
- [ ] Snapshots en Invoice (datos desnormalizados para preservar información histórica)
- [ ] Sistema de notificaciones para recordatorios de citas
- [ ] Historial médico detallado por mascota
- [ ] Gestión de horarios/disponibilidad de veterinarios
- [ ] Dashboard con estadísticas para Admin

---

## 8. Referencias

- [Hibernate ORM Documentation](https://hibernate.org/orm/documentation/)
- [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/)
- [Vlad Mihalcea's Blog - JPA Best Practices](https://vladmihalcea. com/)