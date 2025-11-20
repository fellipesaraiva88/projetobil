export enum ProjectStatus {
  PENDING = 'Pendente',
  IN_PROGRESS = 'Em Andamento',
  COMPLETED = 'Concluído',
}

export interface Material {
  id: string;
  projectId: string;
  name: string;
  cost: number;
  quantity: number;
  date: string;
}

export interface Payment {
  id: string;
  projectId: string;
  amount: number;
  date: string;
  note: string;
}

export interface Project {
  id: string;
  clientName: string;
  title: string; // e.g., "Sala e Cozinha"
  description: string;
  status: ProjectStatus;
  totalAgreedPrice: number;
  startDate: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
