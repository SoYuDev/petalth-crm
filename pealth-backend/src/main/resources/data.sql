-- =================================================================================
-- 1. USUARIOS (Tabla: pealth_user)
-- Claves: ID autogenerado, pero lo forzamos para asegurar las relaciones FK.
-- Nota: Spring convierte camelCase (firstName) a snake_case (first_name).
-- =================================================================================

-- ID 1: Dueño (Luis)
INSERT INTO pealth_user (id, email, password, first_name, last_name, rol)
VALUES (1, 'luis@owner.com', '1234', 'Luis', 'García', 'OWNER');

-- ID 2: Veterinaria (Ana)
INSERT INTO pealth_user (id, email, password, first_name, last_name, rol)
VALUES (2, 'ana@vet.com', '1234', 'Ana', 'Pérez', 'VET');

-- ID 3: Dueña (Maria)
INSERT INTO pealth_user (id, email, password, first_name, last_name, rol)
VALUES (3, 'maria@owner.com', '1234', 'María', 'López', 'OWNER');

-- ID 4: Veterinario (Carlos)
INSERT INTO pealth_user (id, email, password, first_name, last_name, rol)
VALUES (4, 'carlos@vet.com', '1234', 'Carlos', 'Ruiz', 'VET');

-- ID 5: Admin
INSERT INTO pealth_user (id, email, password, first_name, last_name, rol)
VALUES (5, 'admin@pealth.com', '1234', 'Super', 'Admin', 'ADMIN');

-- Ajustamos la secuencia del ID de usuario para que el próximo insert (el 6) no falle
-- (Esto es específico de Postgres para cuando insertamos IDs manualmente)
ALTER SEQUENCE pealth_user_id_seq RESTART WITH 6;


-- =================================================================================
-- 2. PROPIETARIOS (Tabla: owner)
-- La PK es 'user_id' por el @MapsId. Debe coincidir con un ID de pealth_user.
-- =================================================================================

INSERT INTO owner (user_id, phone, address) VALUES (1, '600111222', 'Calle Gran Vía 1, Madrid');
INSERT INTO owner (user_id, phone, address) VALUES (3, '600333444', 'Av. Diagonal 20, Barcelona');


-- =================================================================================
-- 3. VETERINARIOS (Tabla: veterinarian)
-- La PK es 'user_id'. Solo tienes el campo 'speciality'.
-- =================================================================================

INSERT INTO veterinarian (user_id, speciality) VALUES (2, 'Medicina General');
INSERT INTO veterinarian (user_id, speciality) VALUES (4, 'Cirugía');


-- =================================================================================
-- 4. MASCOTAS (Tabla: pet)
-- =================================================================================

-- Mascotas de Luis (ID 1)
INSERT INTO pet (id, name, owner_id) VALUES (1, 'Toby', 1);
INSERT INTO pet (id, name, owner_id) VALUES (2, 'Laika', 1);

-- Mascota de Maria (ID 3)
INSERT INTO pet (id, name, owner_id) VALUES (3, 'Michi', 3);

ALTER SEQUENCE pet_id_seq RESTART WITH 4;


-- =================================================================================
-- 5. CITAS (Tabla: appointment)
-- Relaciona mascota (pet_id) con veterinario (veterinarian_id).
-- =================================================================================

-- Cita 1: Toby con Ana (General) - Completada
INSERT INTO appointment (id, date_time, reason, status, pet_id, veterinarian_id)
VALUES (1, '2023-10-01 10:00:00', 'Vacuna anual rabia', 'COMPLETED', 1, 2);

-- Cita 2: Laika con Carlos (Cirugía) - Pendiente
INSERT INTO appointment (id, date_time, reason, status, pet_id, veterinarian_id)
VALUES (2, '2025-12-20 17:30:00', 'Revisión pata trasera', 'PENDING', 2, 4);

-- Cita 3: Michi con Ana - Cancelada
INSERT INTO appointment (id, date_time, reason, status, pet_id, veterinarian_id)
VALUES (3, '2023-11-05 11:00:00', 'Vómitos constantes', 'CANCELLED', 3, 2);

ALTER SEQUENCE appointment_id_seq RESTART WITH 4;


-- =================================================================================
-- 6. FACTURAS (Tabla: invoice)
-- Relación 1:1 con appointment.
-- =================================================================================

-- Factura de la Cita 1
INSERT INTO invoice (id, issue_date, amount, status, appointment_id)
VALUES (1, '2023-10-01 10:30:00', 45.50, 'PAID', 1);

ALTER SEQUENCE invoice_id_seq RESTART WITH 2;