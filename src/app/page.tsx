'use client';

import { useState, useEffect } from 'react';

interface Todo {
  id: string;
  text: string;
  description: string; // Added description field
  isImportant: boolean;
  completed: boolean;
  createdAt: Date;
}

const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newDescription, setNewDescription] = useState(''); // New state for description
  const [isImportant, setIsImportant] = useState(false);

  // Load todos from localStorage on mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('minimal-todos');
    if (savedTodos) {
      const parsedTodos = JSON.parse(savedTodos).map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt)
      }));
      setTodos(parsedTodos);
    }
  }, []);

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('minimal-todos', JSON.stringify(todos));
  }, [todos]);

  const handleAddTodo = () => {
    if (newTodo.trim()) {
      const todo: Todo = {
        id: Date.now().toString(),
        text: newTodo.trim(),
        description: newDescription.trim(), // Include description
        isImportant,
        completed: false,
        createdAt: new Date()
      };
      setTodos([todo, ...todos]);
      setNewTodo('');
      setNewDescription(''); // Reset description
      setIsImportant(false);
    }
  };

  const handleToggleComplete = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleToggleImportant = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, isImportant: !todo.isImportant } : todo
    ));
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  const importantTodos = todos.filter(todo => todo.isImportant && !todo.completed);
  const regularTodos = todos.filter(todo => !todo.isImportant && !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-7xl font-black text-gray-900 mb-4 tracking-tight">
            tasky
          </h1>
          <p className="text-xl text-gray-500 font-light">
            Welcome to the new era of productivity
          </p>
        </div>

        {/* Add Todo Form */}
        <div className="bg-gray-50 rounded-3xl p-8 mb-12 border border-gray-100">
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you need to do?"
              className="flex-1 bg-white text-gray-900 placeholder-gray-400 rounded-2xl px-6 py-4 text-lg font-medium border border-gray-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all duration-200"
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Add a description..."
              className="flex-1 bg-white text-gray-900 placeholder-gray-400 rounded-2xl px-6 py-4 text-lg font-medium border border-gray-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all duration-200"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsImportant(!isImportant)}
                className={`px-6 py-4 rounded-2xl font-semibold text-lg transition-all duration-200 ${
                  isImportant 
                    ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/25' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {isImportant ? '⭐ Important' : '⭐'}
              </button>
              <button
                onClick={handleAddTodo}
                className="px-8 py-4 bg-gray-900 text-white font-semibold text-lg rounded-2xl hover:bg-gray-800 transition-all duration-200"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Important Todos - BIG FONT SECTION */}
        {importantTodos.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl sm:text-5xl font-black text-gray-900">
                to review
              </h2>
              <div className="text-sm text-gray-500 font-medium">
                {importantTodos.length} critical
              </div>
            </div>
            <div className="space-y-6">
              {importantTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-3xl p-8 border border-yellow-200 hover:border-yellow-300 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => handleToggleComplete(todo.id)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        todo.completed 
                          ? 'bg-green-500 border-green-500' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {todo.completed && <span className="text-white text-sm">✓</span>}
                    </button>
                    <div className="flex-1">
                      <span className={`text-3xl sm:text-4xl font-black text-gray-900 ${
                        todo.completed ? 'line-through text-gray-400' : ''
                      }`}>
                        {todo.text}
                      </span>
                      <p className="text-lg text-gray-600 mt-2">
                        {todo.description}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleToggleImportant(todo.id)}
                        className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 transition-all duration-200"
                      >
                        ⭐
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="px-4 py-2 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-all duration-200"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Todos */}
        {regularTodos.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                in focus
              </h2>
              <div className="text-sm text-gray-500 font-medium">
                {regularTodos.length} tasks
              </div>
            </div>
            <div className="space-y-4">
              {regularTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleComplete(todo.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        todo.completed 
                          ? 'bg-green-500 border-green-500' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {todo.completed && <span className="text-white text-xs">✓</span>}
                    </button>
                    <div className="flex-1">
                      <span className={`text-lg font-medium text-gray-900 ${
                        todo.completed ? 'line-through text-gray-400' : ''
                      }`}>
                        {todo.text}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {todo.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleImportant(todo.id)}
                        className="px-3 py-1 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
                      >
                        ⭐
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="px-3 py-1 bg-red-100 text-red-600 font-medium rounded-lg hover:bg-red-200 transition-all duration-200"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="text-3xl font-black text-gray-900 mb-2">
              {importantTodos.length}
            </div>
            <div className="text-sm text-gray-500 font-medium">
              Critical tasks
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="text-3xl font-black text-gray-900 mb-2">
              {regularTodos.length}
            </div>
            <div className="text-sm text-gray-500 font-medium">
              Active tasks
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="text-3xl font-black text-gray-900 mb-2">
              {completedTodos.length}
            </div>
            <div className="text-sm text-gray-500 font-medium">
              Completed
            </div>
          </div>
        </div>

        {/* Completed Todos */}
        {completedTodos.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-700 mb-4">
              Completed ({completedTodos.length})
            </h2>
            <div className="space-y-3">
              {completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-500 line-through">
                        {todo.text}
                      </span>
                      <p className="text-sm text-gray-400 mt-1 line-through">
                        {todo.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="px-2 py-1 bg-gray-200 text-gray-500 text-sm rounded hover:bg-gray-300 transition-all duration-200"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {todos.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🎯</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No tasks yet!
            </h3>
            <p className="text-lg text-gray-500">
              Add your first task above to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoList;
