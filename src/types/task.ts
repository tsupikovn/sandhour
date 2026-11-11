export interface Task {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  targetDate: string;
  scheduledTime?: string;
  priority: number;
  inAttic: boolean;
  movedToAtticAt?: string;
  isPlan: boolean;
}

export interface CreateTaskInput {
  text: string;
  targetDate: string;
  scheduledTime?: string;
  priority?: number;
}
