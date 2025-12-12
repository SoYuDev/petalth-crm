# Petalth Frontend Notes

Documentación técnica del desarrollo Frontend (Angular 17+) para la integración con el Backend Spring Boot.

## 1. Arquitectura y Configuración

El proyecto utiliza **Standalone Components**, eliminando los módulos tradicionales. La configuración global (como el cliente HTTP) se define en `app.config.ts`.

-   **Configuración HTTP:** Se utiliza `importProvidersFrom(HttpClientModule)` para habilitar las peticiones REST en toda la aplicación.

## 2. Consumo de API (Service Layer)

Siguiendo el principio de separación de responsabilidades, la lógica de comunicación se encapsula en servicios, no en componentes.

**`VeterinarianService`**

-   Utiliza la inyección de dependencias moderna con `inject(HttpClient)`.
-   Expone el método `getAll()` que retorna un `Observable` apuntando a `http://localhost:8080/api/veterinarians/`.

```typescript
getAll() {
  return this.http.get<Veterinarian[]>('http://localhost:8080/api/veterinarians/');
}
```

## 3. Modelo de Datos (Interfaces)

Se ha creado una interfaz TypeScript espejo del DTO de Java para asegurar el tipado estricto.

```typescript
// Mapea el VeterinarianDTO del backend
export interface Veterinarian {
    id: number;
    fullName: string;
    speciality: string;
}
```

## 4. Lógica del Componente (Patrón Observer)

En el `VeterinarianComponent`, implementamos la lógica de suscripción manual para obtener los datos.

**Implementación del Patrón Observer**
En lugar de usar pipes asíncronos en el HTML, hemos optado por suscribirnos explícitamente en el código TypeScript (`ngOnInit`). Esto nos permite controlar el flujo exacto de la información:

-   **Observable:** El servicio retorna un flujo de datos (la llamada HTTP).
-   **Suscriptor (Observer):** El componente se "suscribe" a ese flujo mediante el método `.subscribe()`.
-   **Ejecución:**
    -   `next`: Cuando el Backend responde con éxito, actualizamos la variable local `this.veterinarians`.
    -   `error`: Capturamos cualquier fallo de conexión para depuración.

```typescript
ngOnInit(): void {
  this.service.getAll().subscribe({
    next: (data) => {
      this.veterinarians = data; // Actualización reactiva de la vista
      console.log('Datos recibidos:', data);
    },
    error: (e) => console.error(e)
  });
}
```
