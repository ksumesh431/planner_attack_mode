export interface Task {
  id: number;
  date: string;
  what: string;
  howMuch: string;
  when: string;
  where: string;
  perceivedDifficulty: number;
  actualDifficulty: number | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  date: string;
  what: string;
  howMuch: string;
  when: string;
  where: string;
  perceivedDifficulty: number;
}

export interface UpdateTaskInput {
  what?: string;
  howMuch?: string;
  when?: string;
  where?: string;
  perceivedDifficulty?: number;
  actualDifficulty?: number;
  completed?: boolean;
}

export interface DaySummary {
  date: string;
  total: number;
  completed: number;
  avgPd: number | null;
  avgAd: number | null;
  hardTotal: number;
  hardCompleted: number;
}

export interface DailyStat {
  date: string;
  planned: number;
  completed: number;
  avgPd: number | null;
  avgAd: number | null;
  hardTotal: number;
  hardCompleted: number;
}

export interface StatsSummary {
  planned: number;
  completed: number;
  completionRate: number;
  avgPd: number | null;
  avgAd: number | null;
  avgPdCompleted: number | null;
  gap: number | null;
  hardTotal: number;
  hardCompleted: number;
  activeDays: number;
}

export interface Stats {
  summary: StatsSummary;
  daily: DailyStat[];
}

export interface TasksResponse {
  tasks: Task[];
}

export interface CalendarResponse {
  days: DaySummary[];
}

export interface AuthResponse {
  authenticated: boolean;
}
