'use client';

import { useState, useEffect, useRef } from 'react';
import { getTodos, addTodo, updateTodo, deleteTodo, reorderTodos } from '../lib/api';
import { Todo } from '../lib/types';
import ReactMarkdown from 'react-markdown';

interface TodoListProps {
  selectedDate?: string;
  selectedList?: string;
  isCompactMode?: boolean;
}

const TodoList = ({ selectedDate, selectedList, isCompactMode }: TodoListProps) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedTodo, setDraggedTodo] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editText, setEditText] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImportant, setEditImportant] = useState(false);
  const descriptionEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTodos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedTodos = await getTodos(selectedList, selectedDate);
        // Sort by position if available, otherwise by creation date
        const sortedTodos = [...fetchedTodos].sort((a, b) => {
          if (a.position !== undefined && b.position !== undefined) {
            return a.position - b.position;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setTodos(sortedTodos);
      } catch (err) {
        setError('Failed to fetch todos');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTodos();
  }, [selectedDate, selectedList]);

  const handleAddTodo = async () => {
    if (newTodo.trim()) {
      const todo: Omit<Todo, 'id' | 'createdAt'> = {
        text: newTodo.trim(),
        description: newDescription.trim(),
        isImportant,
        completed: false,
        listId: selectedList || 'default',
        position: 0, // New todos go to the top
      };

      try {
        const newTodoItem = await addTodo(todo);
        
        // Update positions of all todos
        const updatedTodos = [newTodoItem, ...todos];
        const todoIds = updatedTodos.map(t => t.id);
        
        // Update UI immediately
        setTodos(updatedTodos.map((t, index) => ({...t, position: index})));
        
        // Send reorder request to backend
        await reorderTodos(todoIds);
        
        setNewTodo('');
        setNewDescription('');
        setIsImportant(false);
      } catch (err) {
        setError('Failed to add todo');
      }
    }
  };

  const handleToggleComplete = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    try {
      await updateTodo(id, { completed: !todo.completed });
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t
        )
      );
    } catch (err) {
      setError('Failed to update todo');
    }
  };

  const handleToggleImportant = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    try {
      await updateTodo(id, { isImportant: !todo.isImportant });
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, isImportant: !t.isImportant } : t
        )
      );
    } catch (err) {
      setError('Failed to update todo');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError('Failed to delete todo');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  const handleDragStart = (e: React.DragEvent, todoId: string, todoType: 'important' | 'regular') => {
    setDraggedTodo(todoId);
    setIsDragging(true);
    e.dataTransfer.setData('todoId', todoId);
    e.dataTransfer.setData('todoType', todoType);
    
    // Set a custom drag image if needed
    const dragImage = document.createElement('div');
    dragImage.style.width = '10px';
    dragImage.style.height = '10px';
    dragImage.style.opacity = '0';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTodo(null);
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent, targetTodoId: string) => {
    e.preventDefault();
    
    const sourceId = e.dataTransfer.getData('todoId');
    const sourceType = e.dataTransfer.getData('todoType') as 'important' | 'regular';
    
    if (!sourceId || sourceId === targetTodoId) return;
    
    // Get the current lists based on type
    let importantTodosList = todos.filter(t => t.isImportant && !t.completed);
    let regularTodosList = todos.filter(t => !t.isImportant && !t.completed);
    let completedTodosList = todos.filter(t => t.completed);
    
    // Find the source todo
    const sourceTodo = todos.find(t => t.id === sourceId);
    if (!sourceTodo) return;
    
    // Find the target todo
    const targetTodo = todos.find(t => t.id === targetTodoId);
    if (!targetTodo) return;
    
    // Handle reordering within the same list type
    if (
      (sourceTodo.isImportant && targetTodo.isImportant && !sourceTodo.completed && !targetTodo.completed) ||
      (!sourceTodo.isImportant && !targetTodo.isImportant && !sourceTodo.completed && !targetTodo.completed) ||
      (sourceTodo.completed && targetTodo.completed)
    ) {
      // Determine which list to reorder
      let listToReorder = sourceTodo.isImportant && !sourceTodo.completed 
        ? importantTodosList 
        : sourceTodo.completed 
          ? completedTodosList 
          : regularTodosList;
      
      // Remove the source from its current position
      listToReorder = listToReorder.filter(t => t.id !== sourceId);
      
      // Find the index of the target
      const targetIndex = listToReorder.findIndex(t => t.id === targetTodoId);
      
      // Insert the source at the target position
      listToReorder.splice(targetIndex, 0, sourceTodo);
      
      // Update the positions
      const updatedListToReorder = listToReorder.map((t, index) => ({...t, position: index}));
      
      // Combine all lists back together
      let updatedTodos: Todo[];
      
      if (sourceTodo.isImportant && !sourceTodo.completed) {
        updatedTodos = [...updatedListToReorder, ...regularTodosList, ...completedTodosList];
      } else if (sourceTodo.completed) {
        updatedTodos = [...importantTodosList, ...regularTodosList, ...updatedListToReorder];
      } else {
        updatedTodos = [...importantTodosList, ...updatedListToReorder, ...completedTodosList];
      }
      
      // Update UI immediately
      setTodos(updatedTodos);
      
      // Send reorder request to backend
      const todoIds = updatedTodos.map(t => t.id);
      try {
        await reorderTodos(todoIds);
      } catch (err) {
        setError('Failed to reorder todos');
        // Revert to original order if the API call fails
        const fetchedTodos = await getTodos(selectedList, selectedDate);
        setTodos(fetchedTodos);
      }
    }
    
    setDraggedTodo(null);
    setIsDragging(false);
  };

  // Move a todo up in the list
  const handleMoveTodoUp = async (todoId: string) => {
    const todoIndex = todos.findIndex(t => t.id === todoId);
    if (todoIndex <= 0) return; // Already at the top
    
    const todo = todos[todoIndex];
    
    // Find the previous todo of the same type
    let prevIndex = todoIndex - 1;
    while (prevIndex >= 0) {
      const prevTodo = todos[prevIndex];
      if (
        (todo.isImportant && prevTodo.isImportant && !todo.completed && !prevTodo.completed) ||
        (!todo.isImportant && !prevTodo.isImportant && !todo.completed && !prevTodo.completed) ||
        (todo.completed && prevTodo.completed)
      ) {
        break;
      }
      prevIndex--;
    }
    
    if (prevIndex < 0) return; // No suitable previous todo found
    
    // Swap the todos
    const updatedTodos = [...todos];
    [updatedTodos[prevIndex], updatedTodos[todoIndex]] = [updatedTodos[todoIndex], updatedTodos[prevIndex]];
    
    // Update positions
    const reorderedTodos = updatedTodos.map((t, index) => ({...t, position: index}));
    
    // Update UI immediately
    setTodos(reorderedTodos);
    
    // Send reorder request to backend
    const todoIds = reorderedTodos.map(t => t.id);
    try {
      await reorderTodos(todoIds);
    } catch (err) {
      setError('Failed to reorder todos');
      // Revert to original order if the API call fails
      const fetchedTodos = await getTodos(selectedList, selectedDate);
      setTodos(fetchedTodos);
    }
  };
  
  // Move a todo down in the list
  const handleMoveTodoDown = async (todoId: string) => {
    const todoIndex = todos.findIndex(t => t.id === todoId);
    if (todoIndex === -1 || todoIndex >= todos.length - 1) return; // Not found or already at the bottom
    
    const todo = todos[todoIndex];
    
    // Find the next todo of the same type
    let nextIndex = todoIndex + 1;
    while (nextIndex < todos.length) {
      const nextTodo = todos[nextIndex];
      if (
        (todo.isImportant && nextTodo.isImportant && !todo.completed && !nextTodo.completed) ||
        (!todo.isImportant && !nextTodo.isImportant && !todo.completed && !nextTodo.completed) ||
        (todo.completed && nextTodo.completed)
      ) {
        break;
      }
      nextIndex++;
    }
    
    if (nextIndex >= todos.length) return; // No suitable next todo found
    
    // Swap the todos
    const updatedTodos = [...todos];
    [updatedTodos[nextIndex], updatedTodos[todoIndex]] = [updatedTodos[todoIndex], updatedTodos[nextIndex]];
    
    // Update positions
    const reorderedTodos = updatedTodos.map((t, index) => ({...t, position: index}));
    
    // Update UI immediately
    setTodos(reorderedTodos);
    
    // Send reorder request to backend
    const todoIds = reorderedTodos.map(t => t.id);
    try {
      await reorderTodos(todoIds);
    } catch (err) {
      setError('Failed to reorder todos');
      // Revert to original order if the API call fails
      const fetchedTodos = await getTodos(selectedList, selectedDate);
      setTodos(fetchedTodos);
    }
  };

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setEditText(todo.text);
    setEditDescription(todo.description);
    setEditImportant(todo.isImportant);
    
    // Set content in the contentEditable div after a brief delay
    setTimeout(() => {
      if (descriptionEditableRef.current) {
        descriptionEditableRef.current.innerText = todo.description;
      }
    }, 100);
  };

  const handleSaveEdit = async () => {
    if (!editingTodo || !editText.trim()) return;

    try {
      await updateTodo(editingTodo.id, {
        text: editText.trim(),
        description: editDescription.trim(),
        isImportant: editImportant,
      });
      
      setTodos((prev) =>
        prev.map((t) =>
          t.id === editingTodo.id 
            ? { ...t, text: editText.trim(), description: editDescription.trim(), isImportant: editImportant }
            : t
        )
      );
      
      setEditingTodo(null);
      setEditText('');
      setEditDescription('');
      setEditImportant(false);
    } catch (err) {
      setError('Failed to update todo');
    }
  };

  const handleCancelEdit = () => {
    setEditingTodo(null);
    setEditText('');
    setEditDescription('');
    setEditImportant(false);
    
    // Clear the contentEditable div
    if (descriptionEditableRef.current) {
      descriptionEditableRef.current.innerText = '';
    }
  };

  // Enhanced content editing functions for description
  const handleDescriptionChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newDescription = e.currentTarget.innerText;
    setEditDescription(newDescription);
  };

  const insertText = (text: string) => {
    if (!descriptionEditableRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const textNode = document.createTextNode(text);
    range.deleteContents();
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Update content state
    setEditDescription(descriptionEditableRef.current.innerText);
    descriptionEditableRef.current.focus();
  };

  const insertBold = () => {
    if (!descriptionEditableRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      // If text is selected, wrap it with **
      const newText = `**${selectedText}**`;
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
    } else {
      // If no text selected, insert ** at cursor
      const textNode = document.createTextNode('**bold text**');
      range.insertNode(textNode);
      // Position cursor between ** and **
      range.setStart(textNode, 2);
      range.setEnd(textNode, textNode.length - 2);
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
    setEditDescription(descriptionEditableRef.current.innerText);
    descriptionEditableRef.current.focus();
  };

  const insertItalic = () => {
    if (!descriptionEditableRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      // If text is selected, wrap it with *
      const newText = `*${selectedText}*`;
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
    } else {
      // If no text selected, insert * at cursor
      const textNode = document.createTextNode('*italic text*');
      range.insertNode(textNode);
      // Position cursor between * and *
      range.setStart(textNode, 1);
      range.setEnd(textNode, textNode.length - 1);
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
    setEditDescription(descriptionEditableRef.current.innerText);
    descriptionEditableRef.current.focus();
  };

  const insertBulletPoint = () => {
    insertText('• ');
  };

  const insertNumberedList = () => {
    insertText('1. ');
  };

  const insertQuote = () => {
    insertText('> ');
  };

  const insertCodeBlock = () => {
    insertText('```\n\n```');
  };

  const insertHeading1 = () => {
    insertText('# ');
  };

  const insertHeading2 = () => {
    insertText('## ');
  };

  const insertHeading3 = () => {
    insertText('### ');
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const tabNode = document.createTextNode('\t');
      range.deleteContents();
      range.insertNode(tabNode);
      range.setStartAfter(tabNode);
      range.setEndAfter(tabNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Update content state
      if (descriptionEditableRef.current) {
        setEditDescription(descriptionEditableRef.current.innerText);
      }
    } else if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
      // Cmd+B or Ctrl+B for bold
      e.preventDefault();
      insertBold();
    } else if (e.key === 'i' && (e.metaKey || e.ctrlKey)) {
      // Cmd+I or Ctrl+I for italic
      e.preventDefault();
      insertItalic();
    }
  };

  const importantTodos = todos.filter((todo) => todo.isImportant && !todo.completed);
  const regularTodos = todos.filter((todo) => !todo.isImportant && !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);

  if (isLoading) {
    return <div className="text-center p-12">Loading todos...</div>;
  }

  if (error) {
    return <div className="text-center p-12 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
    
        {/* Add Todo Form */}
        <div className="bg-gray-50 rounded-3xl p-4 sm:p-6 lg:p-8 mb-8 sm:mb-12 border border-gray-100">
          <div className="text-center mb-8 sm:mb-16">
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black text-gray-900 mb-4 tracking-tight">tasky</h1>
            <p className="text-lg sm:text-xl text-gray-500 font-light">Welcome to the new era of productivity</p>
          </div>
          <div className="flex flex-col gap-3 sm:gap-4">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you need to do?"
              className="flex-1 bg-white text-gray-900 placeholder-gray-400 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-medium border border-gray-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all duration-200"
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Add a description..."
              className="flex-1 bg-white text-gray-900 placeholder-gray-400 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-medium border border-gray-200 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all duration-200"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setIsImportant(!isImportant)}
                className={`px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-semibold text-base sm:text-lg transition-all duration-200 ${
                  isImportant
                    ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/25'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {isImportant ? '⭐ Important' : '⭐'}
              </button>
              <button
                onClick={handleAddTodo}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white font-semibold text-base sm:text-lg rounded-2xl hover:bg-gray-800 transition-all duration-200"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Important Todos */}
        {importantTodos.length > 0 && (
          <div className="mb-12 sm:mb-16">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-gray-900">
              to review
            </h2>
            <div className="text-xs sm:text-sm text-gray-500 font-medium">
              {importantTodos.length} critical
            </div>
          </div>
          <div className="space-y-4 sm:space-y-6">
            {importantTodos.map((todo) => (
              <div
                key={todo.id}
                className={`bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-yellow-200 hover:border-yellow-300 transition-all duration-200 group ${draggedTodo === todo.id ? 'opacity-50' : ''} ${isDragging ? 'cursor-move' : ''}`}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, todo.id, 'important')}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, todo.id)}
              >
                {editingTodo?.id === todo.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-white text-lg sm:text-2xl lg:text-3xl font-black text-gray-900 rounded-xl px-4 py-2 border border-gray-200 focus:border-yellow-400 focus:outline-none"
                      placeholder="Todo text..."
                    />
                    
                    {/* Formatting Toolbar */}
                    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertHeading1}
                          title="Heading 1"
                        >
                          <span className="font-bold text-xs">H1</span>
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertHeading2}
                          title="Heading 2"
                        >
                          <span className="font-bold text-xs">H2</span>
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertHeading3}
                          title="Heading 3"
                        >
                          <span className="font-bold text-xs">H3</span>
                        </button>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertBold}
                          title="Bold"
                        >
                          <span className="font-bold text-xs">B</span>
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertItalic}
                          title="Italic"
                        >
                          <span className="italic text-xs">I</span>
                        </button>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertBulletPoint}
                          title="Bullet List"
                        >
                          <span className="text-xs">•</span>
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertNumberedList}
                          title="Numbered List"
                        >
                          <span className="text-xs">1.</span>
                        </button>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertQuote}
                          title="Quote"
                        >
                          <span className="text-xs">"</span>
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertCodeBlock}
                          title="Code Block"
                        >
                          <span className="font-mono text-xs">{`{}`}</span>
                        </button>
                      </div>
                    </div>
                    
                    <div
                      ref={descriptionEditableRef}
                      contentEditable
                      onInput={handleDescriptionChange}
                      onKeyDown={handleDescriptionKeyDown}
                      className="w-full bg-white text-sm sm:text-lg text-gray-600 rounded-xl px-4 py-2 border border-gray-200 focus:border-yellow-400 focus:outline-none min-h-[80px] whitespace-pre-wrap focus:bg-gray-50/50 transition-colors"
                      suppressContentEditableWarning={true}
                      data-placeholder="Description..."
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editImportant}
                          onChange={() => setEditImportant(!editImportant)}
                          className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Important</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 text-sm font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
                    <button
                      onClick={() => handleToggleComplete(todo.id)}
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        todo.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
                    >
                      {todo.completed && <span className="text-white text-xs sm:text-sm">✓</span>}
                    </button>
                    <div className="flex-1">
                      <span className={`text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-black text-gray-900 ${
                        todo.completed ? 'line-through text-gray-400' : ''
                      }`}>
                        {todo.text}
                      </span>
                      {todo.description && (
                        <div className="text-sm sm:text-lg text-gray-600 mt-1 sm:mt-2">
                          <ReactMarkdown 
                            components={{
                              p: ({children}) => <div className="whitespace-pre-wrap mb-2">{children}</div>,
                              h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                              h2: ({children}) => <h2 className="text-base font-bold mb-1">{children}</h2>,
                              h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                              ul: ({children}) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                              li: ({children}) => <li className="whitespace-pre-wrap">{children}</li>,
                              blockquote: ({children}) => (
                                <blockquote className="border-l-4 border-gray-300 pl-2 py-1 my-2 bg-gray-50 italic">
                                  {children}
                                </blockquote>
                              ),
                              code: ({children, className}) => {
                                if (className) {
                                  // Code block
                                  return (
                                    <pre className="bg-gray-100 p-2 rounded my-2 overflow-x-auto">
                                      <code className="text-xs font-mono">{children}</code>
                                    </pre>
                                  );
                                }
                                // Inline code
                                return <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
                              },
                            }}
                          >
                            {todo.description}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleMoveTodoUp(todo.id)}
                          className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-600 font-medium rounded-t-lg hover:bg-gray-200 transition-all duration-200 text-xs sm:text-sm"
                          aria-label="Move todo up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveTodoDown(todo.id)}
                          className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-600 font-medium rounded-b-lg hover:bg-gray-200 transition-all duration-200 text-xs sm:text-sm"
                          aria-label="Move todo down"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        onClick={() => handleEditTodo(todo)}
                        className="px-2 sm:px-4 py-1 sm:py-2 bg-blue-500 text-white font-semibold rounded-lg sm:rounded-xl hover:bg-blue-600 transition-all duration-200 text-xs sm:text-sm"
                        aria-label="Edit todo"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggleImportant(todo.id)}
                        className="px-2 sm:px-4 py-1 sm:py-2 bg-yellow-500 text-white font-semibold rounded-lg sm:rounded-xl hover:bg-yellow-600 transition-all duration-200 text-xs sm:text-sm"
                        aria-label="Toggle important"
                      >
                        ⭐
                      </button>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="px-2 sm:px-4 py-1 sm:py-2 bg-red-500 text-white font-semibold rounded-lg sm:rounded-xl hover:bg-red-600 transition-all duration-200 text-xs sm:text-sm"
                        aria-label="Delete todo"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
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
                  className={`bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 hover:border-gray-200 transition-all duration-200 group ${draggedTodo === todo.id ? 'opacity-50' : ''} ${isDragging ? 'cursor-move' : ''}`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, todo.id, 'regular')}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, todo.id)}
                >
                  {editingTodo?.id === todo.id ? (
                                      // Edit Mode
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-white text-lg font-medium text-gray-900 rounded-xl px-4 py-2 border border-gray-200 focus:border-purple-400 focus:outline-none"
                      placeholder="Todo text..."
                    />
                    
                    {/* Formatting Toolbar */}
                    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertHeading1}
                          title="Heading 1"
                        >
                          <span className="font-bold text-xs">H1</span>
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertHeading2}
                          title="Heading 2"
                        >
                          <span className="font-bold text-xs">H2</span>
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertHeading3}
                          title="Heading 3"
                        >
                          <span className="font-bold text-xs">H3</span>
                        </button>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertBold}
                          title="Bold"
                        >
                          <span className="font-bold text-xs">B</span>
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertItalic}
                          title="Italic"
                        >
                          <span className="italic text-xs">I</span>
                        </button>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertBulletPoint}
                          title="Bullet List"
                        >
                          <span className="text-xs">•</span>
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertNumberedList}
                          title="Numbered List"
                        >
                          <span className="text-xs">1.</span>
                        </button>
                      </div>
                      <div className="w-px h-4 bg-gray-300"></div>
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertQuote}
                          title="Quote"
                        >
                          <span className="text-xs">"</span>
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-white transition-all" 
                          type="button" 
                          onClick={insertCodeBlock}
                          title="Code Block"
                        >
                          <span className="font-mono text-xs">{`{}`}</span>
                        </button>
                      </div>
                    </div>
                    
                    <div
                      ref={descriptionEditableRef}
                      contentEditable
                      onInput={handleDescriptionChange}
                      onKeyDown={handleDescriptionKeyDown}
                      className="w-full bg-white text-sm text-gray-600 rounded-xl px-4 py-2 border border-gray-200 focus:border-purple-400 focus:outline-none min-h-[80px] whitespace-pre-wrap focus:bg-gray-50/50 transition-colors"
                      suppressContentEditableWarning={true}
                      data-placeholder="Description..."
                    />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editImportant}
                            onChange={() => setEditImportant(!editImportant)}
                            className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Important</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-all"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleComplete(todo.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          todo.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
                      >
                        {todo.completed && <span className="text-white text-xs">✓</span>}
                      </button>
                      <div className="flex-1">
                        <span className={`text-lg font-medium text-gray-900 ${
                          todo.completed ? 'line-through text-gray-400' : ''
                        }`}>
                          {todo.text}
                        </span>
                        {todo.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            <ReactMarkdown 
                              components={{
                                p: ({children}) => <div className="whitespace-pre-wrap mb-2">{children}</div>,
                                h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                h2: ({children}) => <h2 className="text-base font-bold mb-1">{children}</h2>,
                                h3: ({children}) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                ul: ({children}) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                li: ({children}) => <li className="whitespace-pre-wrap">{children}</li>,
                                blockquote: ({children}) => (
                                  <blockquote className="border-l-4 border-gray-300 pl-2 py-1 my-2 bg-gray-50 italic">
                                    {children}
                                  </blockquote>
                                ),
                                code: ({children, className}) => {
                                  if (className) {
                                    // Code block
                                    return (
                                      <pre className="bg-gray-100 p-2 rounded my-2 overflow-x-auto">
                                        <code className="text-xs font-mono">{children}</code>
                                      </pre>
                                    );
                                  }
                                  // Inline code
                                  return <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
                                },
                              }}
                            >
                              {todo.description}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveTodoUp(todo.id)}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-600 font-medium rounded-t-lg hover:bg-gray-200 transition-all duration-200"
                            aria-label="Move todo up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveTodoDown(todo.id)}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-600 font-medium rounded-b-lg hover:bg-gray-200 transition-all duration-200"
                            aria-label="Move todo down"
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          onClick={() => handleEditTodo(todo)}
                          className="px-3 py-1 bg-blue-100 text-blue-600 font-medium rounded-lg hover:bg-blue-200 transition-all duration-200"
                          aria-label="Edit todo"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleToggleImportant(todo.id)}
                          className="px-3 py-1 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
                          aria-label="Mark as important"
                        >
                          ⭐
                        </button>
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="px-3 py-1 bg-red-100 text-red-600 font-medium rounded-lg hover:bg-red-200 transition-all duration-200"
                          aria-label="Delete todo"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
                  className={`bg-gray-50 rounded-xl p-4 border border-gray-100 ${draggedTodo === todo.id ? 'opacity-50' : ''} ${isDragging ? 'cursor-move' : ''}`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, todo.id, 'regular')}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, todo.id)}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleComplete(todo.id)}
                      className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-all duration-200"
                      aria-label="Mark as incomplete"
                    >
                      <span className="text-white text-xs">✓</span>
                    </button>
                    <div className="flex-1">
                      <span className="text-gray-500 line-through">
                        {todo.text}
                      </span>
                      {todo.description && (
                        <p className="text-sm text-gray-400 mt-1 line-through">
                          {todo.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleMoveTodoUp(todo.id)}
                          className="px-1 py-0.5 bg-gray-200 text-gray-500 text-xs rounded-t hover:bg-gray-300 transition-all duration-200"
                          aria-label="Move todo up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveTodoDown(todo.id)}
                          className="px-1 py-0.5 bg-gray-200 text-gray-500 text-xs rounded-b hover:bg-gray-300 transition-all duration-200"
                          aria-label="Move todo down"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="px-2 py-1 bg-gray-200 text-gray-500 text-sm rounded hover:bg-gray-300 transition-all duration-200"
                        aria-label="Delete todo"
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
            {/* Task Summary */}
            {!isCompactMode && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8 mx-2 sm:mx-10">
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{importantTodos.length}</div>
              <div className="text-xs sm:text-sm text-gray-500 font-medium">Critical tasks</div>
            </div>
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{regularTodos.length}</div>
              <div className="text-xs sm:text-sm text-gray-500 font-medium">Active tasks</div>
            </div>
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{completedTodos.length}</div>
              <div className="text-xs sm:text-sm text-gray-500 font-medium">Completed</div>
            </div>
          </div>
        )}


        {/* Empty State */}
        {todos.length === 0 && !isLoading && (
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
  );
};

export default TodoList; 