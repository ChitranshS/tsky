'use client';

import { AppData, Todo, Note, TodoList, CalendarDay, DateFilter } from './types';

// Initial empty data structure
const initialData: AppData = {
  todos: [],
  notes: [],
  lists: [
    {
      id: 'default',
      name: 'Default',
      createdAt: new Date().toISOString()
    }
  ],
  lastUpdated: new Date().toISOString()
};

// Helper to get data from localStorage
const getData = (): AppData => {
  if (typeof window === 'undefined') return initialData;
  
  const storedData = localStorage.getItem('tasky_data');
  if (!storedData) return initialData;
  
  try {
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error parsing stored data:', error);
    return initialData;
  }
};

// Helper to save data to localStorage
const saveData = (data: AppData): void => {
  if (typeof window === 'undefined') return;
  
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem('tasky_data', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

// Todo operations
export const getTodos = (listId?: string): Todo[] => {
  const data = getData();
  if (!listId) return data.todos;
  return data.todos.filter(todo => todo.listId === listId);
};

export const addTodo = (todo: Omit<Todo, 'id' | 'createdAt'>): Todo => {
  const data = getData();
  const newTodo: Todo = {
    ...todo,
    id: Date.now().toString(),
    createdAt: new Date().toISOString()
  };
  
  data.todos = [newTodo, ...data.todos];
  saveData(data);
  return newTodo;
};

export const updateTodo = (id: string, updates: Partial<Todo>): Todo | null => {
  const data = getData();
  const index = data.todos.findIndex(todo => todo.id === id);
  
  if (index === -1) return null;
  
  data.todos[index] = { ...data.todos[index], ...updates };
  saveData(data);
  return data.todos[index];
};

export const deleteTodo = (id: string): boolean => {
  const data = getData();
  const initialLength = data.todos.length;
  
  data.todos = data.todos.filter(todo => todo.id !== id);
  saveData(data);
  
  return data.todos.length < initialLength;
};

// Note operations
export const getNotes = (dateFilter?: DateFilter): Note[] => {
  const data = getData();
  if (!dateFilter || dateFilter === 'all') return data.notes;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  
  switch (dateFilter) {
    case 'today':
      return data.notes.filter(note => {
        const noteDate = new Date(note.createdAt);
        const noteDay = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate()).toISOString();
        return noteDay === today;
      });
      
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return data.notes.filter(note => new Date(note.createdAt) >= weekAgo);
      
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return data.notes.filter(note => new Date(note.createdAt) >= monthAgo);
      
    default:
      return data.notes;
  }
};

export const addNote = (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note => {
  const data = getData();
  const now = new Date().toISOString();
  
  const newNote: Note = {
    ...note,
    id: Date.now().toString(),
    createdAt: now,
    updatedAt: now
  };
  
  data.notes = [newNote, ...data.notes];
  saveData(data);
  return newNote;
};

export const updateNote = (id: string, updates: Partial<Note>): Note | null => {
  const data = getData();
  const index = data.notes.findIndex(note => note.id === id);
  
  if (index === -1) return null;
  
  data.notes[index] = { 
    ...data.notes[index], 
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  saveData(data);
  return data.notes[index];
};

export const deleteNote = (id: string): boolean => {
  const data = getData();
  const initialLength = data.notes.length;
  
  data.notes = data.notes.filter(note => note.id !== id);
  saveData(data);
  
  return data.notes.length < initialLength;
};

// List operations
export const getLists = (): TodoList[] => {
  const data = getData();
  return data.lists;
};

export const addList = (name: string): TodoList => {
  const data = getData();
  const newList: TodoList = {
    id: Date.now().toString(),
    name,
    createdAt: new Date().toISOString()
  };
  
  data.lists = [...data.lists, newList];
  saveData(data);
  return newList;
};

export const updateList = (id: string, name: string): TodoList | null => {
  const data = getData();
  const index = data.lists.findIndex(list => list.id === id);
  
  if (index === -1) return null;
  
  data.lists[index] = { ...data.lists[index], name };
  saveData(data);
  return data.lists[index];
};

export const deleteList = (id: string): boolean => {
  // Don't allow deleting the default list
  if (id === 'default') return false;
  
  const data = getData();
  const initialLength = data.lists.length;
  
  data.lists = data.lists.filter(list => list.id !== id);
  
  // Move todos from deleted list to default list
  data.todos = data.todos.map(todo => 
    todo.listId === id ? { ...todo, listId: 'default' } : todo
  );
  
  saveData(data);
  return data.lists.length < initialLength;
};

// Calendar operations
export const getCalendarDays = (year: number, month: number): CalendarDay[] => {
  const data = getData();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: CalendarDay[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    
    const todoCount = data.todos.filter(todo => {
      const todoDate = new Date(todo.createdAt);
      return todoDate.getFullYear() === year && 
             todoDate.getMonth() === month && 
             todoDate.getDate() === day;
    }).length;
    
    const noteCount = data.notes.filter(note => {
      const noteDate = new Date(note.createdAt);
      return noteDate.getFullYear() === year && 
             noteDate.getMonth() === month && 
             noteDate.getDate() === day;
    }).length;
    
    result.push({
      date: dateStr,
      todoCount,
      noteCount
    });
  }
  
  return result;
};

export const getItemsForDate = (date: string): { todos: Todo[], notes: Note[] } => {
  const data = getData();
  const targetDate = new Date(date);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();
  
  const todos = data.todos.filter(todo => {
    const todoDate = new Date(todo.createdAt);
    return todoDate.getFullYear() === year && 
           todoDate.getMonth() === month && 
           todoDate.getDate() === day;
  });
  
  const notes = data.notes.filter(note => {
    const noteDate = new Date(note.createdAt);
    return noteDate.getFullYear() === year && 
           noteDate.getMonth() === month && 
           noteDate.getDate() === day;
  });
  
  return { todos, notes };
};

// Export/Import data
export const exportData = (): string => {
  const data = getData();
  return JSON.stringify(data);
};

export const importData = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData) as AppData;
    
    // Validate data structure
    if (!data.todos || !data.notes || !data.lists) {
      throw new Error('Invalid data structure');
    }
    
    saveData(data);
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}; 