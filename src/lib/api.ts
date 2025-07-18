import { Todo, Note, TodoList, CalendarDay } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://tsky-sigma.vercel.app/';

async function fetcher(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('tasky_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${url}`, { ...options, headers });

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    error.message = await res.json();
    throw error;
  }

  return res.json();
}

// Auth
export const login = (password: string) => fetcher('/api/auth', { method: 'POST', body: JSON.stringify({ password }) });

// Todos
export const getTodos = (listId?: string, date?: string) => {
  const params = new URLSearchParams();
  if (listId) params.append('listId', listId);
  if (date) params.append('date', date);
  return fetcher(`/api/todos?${params.toString()}`);
};
export const addTodo = (todo: Omit<Todo, 'id' | 'createdAt'>) => fetcher('/api/todos', { method: 'POST', body: JSON.stringify(todo) });
export const updateTodo = (id: string, updates: Partial<Todo>) => fetcher(`/api/todos?id=${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteTodo = (id: string) => fetcher(`/api/todos?id=${id}`, { method: 'DELETE' });
export const reorderTodos = (todoIds: string[]) => fetcher('/api/todos/reorder', { method: 'PUT', body: JSON.stringify({ todoIds }) });

// Notes
export const getNotes = (date?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return fetcher(`/api/notes?${params.toString()}`);
};
export const addNote = (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => fetcher('/api/notes', { method: 'POST', body: JSON.stringify(note) });
export const updateNote = (id: string, updates: Partial<Note>) => fetcher(`/api/notes?id=${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteNote = (id: string) => fetcher(`/api/notes?id=${id}`, { method: 'DELETE' });

// Lists
export const getLists = () => fetcher('/api/lists');
export const addList = (name: string) => fetcher('/api/lists', { method: 'POST', body: JSON.stringify({ name }) });
export const updateList = (id: string, name: string) => fetcher(`/api/lists?id=${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
export const deleteList = (id: string) => fetcher(`/api/lists?id=${id}`, { method: 'DELETE' });

// Calendar
export const getCalendarDays = (year: number, month: number): Promise<CalendarDay[]> => {
    const params = new URLSearchParams();
    params.append('year', year.toString());
    params.append('month', month.toString());
    return fetcher(`/api/calendar?${params.toString()}`);
}; 