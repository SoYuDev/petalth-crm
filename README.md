# Petalth 🐾
> Veterinary Clinic Management System

**Petalth** is a full-stack web application designed to digitize and streamline the daily operations of a veterinary clinic. It handles users (owners and vets), pets, appointments, and invoices.

This project is currently under development as a Final Degree Project (TFG).

---

## 🛠️ Tech Stack

* **Backend:** Java 17+, Spring Boot 3, Spring Data JPA, Spring Security.
* **Database:** PostgreSQL.
* **Frontend:** Angular 17+ (Standalone Components).
* **Documentation:** Swagger UI / OpenAPI.
* **Tools:** Maven, Lombok.

## 🗂️ Core Architecture

The system is built around these main entities:
* **User:** Centralized authentication (Users can be Vets, Owners, or Admins).
* **Veterinarian & Owner:** Profiles linked to the User entity (1:1).
* **Pet:** Patients linked to Owners.
* **Appointment:** Links Pets to Veterinarians.
* **Invoice:** Linked 1:1 to Appointments.