-- =================================================================================
-- 1. TRATAMIENTOS / SERVICIOS MÉDICOS (Tabla: medical_treatment)
-- Necesario crear esto primero para asignarlo a las citas.
-- =================================================================================

INSERT INTO medical_treatment (id, name, description, duration_minutes, active) VALUES
(1, 'Consulta General', 'Revisión básica de salud y constantes', 30, true),
(2, 'Vacunación Rabia', 'Administración de vacuna anual obligatoria', 15, true),
(3, 'Cirugía Tejidos Blandos', 'Esterilizaciones y suturas complejas', 120, true),
(4, 'Limpieza Dental', 'Limpieza con ultrasonidos bajo sedación', 60, true),
(5, 'Fisioterapia', 'Rehabilitación post-operatoria', 45, false); -- SERVICIO INACTIVO (Para probar filtros)

ALTER SEQUENCE medical_treatment_id_seq RESTART WITH 6;


-- =================================================================================
-- 2. USUARIOS (Tabla: pealth_user)
-- Creamos una mezcla de Dueños y Veterinarios.
-- =================================================================================

-- VETERINARIOS (IDs 1, 2, 3)
INSERT INTO pealth_user (id, email, password, first_name, last_name, rol) VALUES
(1, 'ana@vet.com', '$2a$10$EqlAs...', 'Ana', 'Pérez', 'VET'), -- Especialista General
(2, 'carlos@vet.com', '$2a$10$EqlAs...', 'Carlos', 'Ruiz', 'VET'), -- Cirujano
(3, 'laura@vet.com', '$2a$10$EqlAs...', 'Laura', 'Gómez', 'VET'); -- Dentista

-- DUEÑOS (IDs 4, 5, 6, 7, 8)
INSERT INTO pealth_user (id, email, password, first_name, last_name, rol) VALUES
(4, 'luis@owner.com', '$2a$10$EqlAs...', 'Luis', 'Rodríguez', 'OWNER'), -- Tiene 2 perros
(5, 'maria@owner.com', '$2a$10$EqlAs...', 'María', 'López', 'OWNER'),    -- Tiene 1 gato
(6, 'pepe@owner.com', '$2a$10$EqlAs...', 'Pepe', 'García', 'OWNER'),     -- Cliente nuevo
(7, 'sofia@owner.com', '$2a$10$EqlAs...', 'Sofía', 'Martin', 'OWNER'),    -- Cliente recurrente
(8, 'admin@pealth.com', '$2a$10$EqlAs...', 'Super', 'Admin', 'ADMIN');    -- ADMIN

ALTER SEQUENCE pealth_user_id_seq RESTART WITH 9;


-- =================================================================================
-- 3. PERFILES ESPECÍFICOS (Tablas: veterinarian, owner)
-- Usamos @MapsId, así que los IDs coinciden con pealth_user
-- =================================================================================

-- Veterinarios
INSERT INTO veterinarian (user_id, speciality, active) VALUES (1, 'Medicina Interna', true);
INSERT INTO veterinarian (user_id, speciality, active) VALUES (2, 'Cirugía y Traumatología', true);
INSERT INTO veterinarian (user_id, speciality, active) VALUES (3, 'Odontología', true);

-- Dueños
INSERT INTO owner (user_id, phone, address) VALUES (4, '600111222', 'Calle Gran Vía 1, Madrid');
INSERT INTO owner (user_id, phone, address) VALUES (5, '600333444', 'Av. Diagonal 20, Barcelona');
INSERT INTO owner (user_id, phone, address) VALUES (6, '600555666', 'Calle Larios 5, Málaga');
INSERT INTO owner (user_id, phone, address) VALUES (7, '600777888', 'Plaza Mayor 10, Salamanca');


-- =================================================================================
-- 4. MASCOTAS (Tabla: pet)
-- =================================================================================

-- Mascotas de Luis (ID 4)
INSERT INTO pet (id, name, photo_url, birth_date, active, owner_id) VALUES
(1, 'Toby', 'url_toby.jpg', '2018-05-20', true, 4),
(2, 'Laika', 'url_laika.jpg', '2020-01-10', true, 4);

-- Mascota de María (ID 5)
INSERT INTO pet (id, name, photo_url, birth_date, active, owner_id) VALUES
(3, 'Michi', 'url_michi.jpg', '2021-08-15', true, 5);

-- Mascota de Pepe (ID 6)
INSERT INTO pet (id, name, photo_url, birth_date, active, owner_id) VALUES
(4, 'Rex', 'url_rex.jpg', '2022-11-01', true, 6);

-- Mascotas de Sofía (ID 7) - Tiene una mascota "borrada" (Fallecida o regalada)
INSERT INTO pet (id, name, photo_url, birth_date, active, owner_id) VALUES
(5, 'Luna', 'url_luna.jpg', '2019-03-30', true, 7),
(6, 'Firulais', 'url_firu.jpg', '2010-01-01', false, 7); -- MASCOTA INACTIVA

ALTER SEQUENCE pet_id_seq RESTART WITH 7;


-- =================================================================================
-- 5. CITAS (Tabla: appointment)
-- Escenarios variados para probar filtros y paginación.
-- ATENCIÓN: He cambiado 'reason' por 'medicaltreatment_id' según tu nueva entidad.
-- =================================================================================

-- --- HISTORIAL PASADO (2023) ---

-- 1. Cita completada con factura (Luis - Toby - Ana - Vacuna)
INSERT INTO appointment (id, date_time, diagnosis, status, pet_id, veterinarian_id, medicaltreatment_id) VALUES
(1, '2023-10-01 10:00:00', 'Paciente sano, vacuna aplicada sin reacción.', 'COMPLETED', 1, 1, 2);

-- 2. Cita completada con factura (María - Michi - Ana - Consulta)
INSERT INTO appointment (id, date_time, diagnosis, status, pet_id, veterinarian_id, medicaltreatment_id) VALUES
(2, '2023-11-05 11:00:00', 'Gastroenteritis leve. Dieta blanda.', 'COMPLETED', 3, 1, 1);

-- 3. Cita cancelada (Sofía - Luna - Carlos - Cirugía)
INSERT INTO appointment (id, date_time, diagnosis, status, pet_id, veterinarian_id, medicaltreatment_id) VALUES
(3, '2023-12-01 09:00:00', 'Cancelada por el propietario.', 'CANCELLED', 5, 2, 3);


-- --- MES PASADO / ACTUAL (Facturación pendiente o reciente) ---

-- 4. Cita completada RECIENTE (Luis - Laika - Carlos - Cirugía)
INSERT INTO appointment (id, date_time, diagnosis, status, pet_id, veterinarian_id, medicaltreatment_id) VALUES
(4, '2024-02-15 15:30:00', 'Sutura de herida en pata trasera. Todo bien.', 'COMPLETED', 2, 2, 3);

-- 5. Cita completada RECIENTE (Pepe - Rex - Laura - Dental)
INSERT INTO appointment (id, date_time, diagnosis, status, pet_id, veterinarian_id, medicaltreatment_id) VALUES
(5, '2024-02-20 10:00:00', 'Limpieza profunda realizada. Encías inflamadas.', 'COMPLETED', 4, 3, 4);

-- 6. Cita completada de la Mascota INACTIVA (Historial debe conservarse)
INSERT INTO appointment (id, date_time, diagnosis, status, pet_id, veterinarian_id, medicaltreatment_id) VALUES
(6, '2022-06-10 12:00:00', 'Chequeo geriátrico.', 'COMPLETED', 6, 1, 1);


-- --- FUTURO (Agenda - PENDING) ---

-- 7. Cita futura (Luis - Toby - Ana - Consulta)
INSERT INTO appointment (id, date_time, diagnosis, status, pet_id, veterinarian_id, medicaltreatment_id) VALUES
(7, '2025-10-20 09:30:00', null, 'PENDING', 1, 1, 1);

-- 8. Cita futura (Luis - Laika - Ana - Vacuna)
INSERT INTO appointment (id, date_time, diagnosis, status, pet_id, veterinarian_id, medicaltreatment_id) VALUES
(8, '2025-10-20 10:00:00', null, 'PENDING', 2, 1, 2);

-- 9. Cita futura (María - Michi - Laura - Dental)
INSERT INTO appointment (id, date_time, diagnosis, status, pet_id, veterinarian_id, medicaltreatment_id) VALUES
(9, '2025-10-21 16:00:00', null, 'PENDING', 3, 3, 4);

-- 10, 11, 12... Rellenar para probar PAGINACIÓN del Veterinario Carlos (ID 2)
INSERT INTO appointment (id, date_time, diagnosis, status, pet_id, veterinarian_id, medicaltreatment_id) VALUES
(10, '2025-11-01 09:00:00', null, 'PENDING', 4, 2, 3),
(11, '2025-11-02 09:00:00', null, 'PENDING', 1, 2, 3),
(12, '2025-11-03 09:00:00', null, 'PENDING', 3, 2, 3),
(13, '2025-11-04 09:00:00', null, 'PENDING', 5, 2, 3);

ALTER SEQUENCE appointment_id_seq RESTART WITH 14;


-- =================================================================================
-- 6. FACTURAS (Tabla: invoice)
-- Solo las citas COMPLETED suelen tener factura.
-- Algunas pagadas, otras pendientes de pago.
-- =================================================================================

-- Factura Pagada (Cita 1)
INSERT INTO invoice (id, issue_date, amount, status, appointment_id) VALUES
(1, '2023-10-01 10:30:00', 45.50, 'PAID', 1);

-- Factura Pagada (Cita 2)
INSERT INTO invoice (id, issue_date, amount, status, appointment_id) VALUES
(2, '2023-11-05 11:30:00', 30.00, 'PAID', 2);

-- Factura PENDIENTE DE PAGO (Cita 4 - Cirugía cara)
INSERT INTO invoice (id, issue_date, amount, status, appointment_id) VALUES
(3, '2024-02-15 16:00:00', 250.00, 'UNPAID', 4);

-- Factura PENDIENTE DE PAGO (Cita 5 - Dental)
INSERT INTO invoice (id, issue_date, amount, status, appointment_id) VALUES
(4, '2024-02-20 11:00:00', 80.00, 'UNPAID', 5);

-- Factura de mascota inactiva (historial conservado)
INSERT INTO invoice (id, issue_date, amount, status, appointment_id) VALUES
(5, '2022-06-10 12:30:00', 60.00, 'PAID', 6);

ALTER SEQUENCE invoice_id_seq RESTART WITH 6;