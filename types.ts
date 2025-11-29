export enum SessionType {
  INITIAL = 'Inicial',
  FOLLOW_UP = 'Seguimiento',
  CRISIS = 'Urgencia',
  CLOSURE = 'Cierre'
}

export interface ClinicalNote {
  id: string;
  date: string; // ISO string
  title: string;
  content: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  data: string; // Base64 Data URI
  uploadDate: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  startDate: string;
  active: boolean; // Status
  notes: string; // General context
  // Extended Information
  occupation?: string;
  address?: string;
  emergencyContact?: string;
  referralSource?: string;
  attachments?: Attachment[]; // List of full file objects
  clinicalNotes?: ClinicalNote[]; // History of notes
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string; // ISO string
  durationMinutes: number;
  type: SessionType;
  status: 'scheduled' | 'completed' | 'cancelled';
  sessionNotes?: string; // Clinical notes linked to specific appointment
  attachments?: string[]; // Mock file names (kept as string for appointments for now)
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  sub: string; // Google ID
}

export enum Tab {
  DASHBOARD = 'dashboard',
  PATIENTS = 'patients',
  CALENDAR = 'calendar',
  FINANCE = 'finance'
}