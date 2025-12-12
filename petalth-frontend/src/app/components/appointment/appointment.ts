export type AppointmentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
    id: number;
    dateTime:  string;
    serviceName: string;
    status: AppointmentStatus;
    petName: string;
    veterinarianName: string;
}