export interface Todo {
  id: string;
  text: string;
  description: string;
  isImportant: boolean;
  completed: boolean;
  createdAt: string; // ISO date string
  listId: string;
  position?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  isImportant?: boolean;
}

export interface TodoList {
  id: string;
  name: string;
  createdAt: string; // ISO date string
}

export interface AppData {
  todos: Todo[];
  notes: Note[];
  lists: TodoList[];
  lastUpdated: string; // ISO date string
}

export interface CalendarDay {
  date: string; // ISO date string
  todoCount: number;
  noteCount: number;
}

export type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom'; 