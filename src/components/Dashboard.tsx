'use client';

import { useState } from 'react';
import TodoList from './TodoList';
import Calendar from './Calendar';
import Notes from './Notes';
import Lists from './Lists';

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const [selectedTodoDate, setSelectedTodoDate] = useState<string | undefined>(undefined);
  const [selectedList, setSelectedList] = useState<string | undefined>('default');
  const [isCompactMode, setIsCompactMode] = useState(false);

  const handleDateSelect = (date: string) => {
    setSelectedTodoDate(date);
    setSelectedList(undefined); // Clear list selection when date is selected
  };

  const handleListSelect = (listId: string) => {
    setSelectedList(listId === 'all' ? undefined : listId);
    setSelectedTodoDate(undefined); // Clear date selection when list is selected
  };

  const handleToggleCompactMode = () => {
    setIsCompactMode((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">tasky</h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={handleToggleCompactMode}
                className={`px-3 py-2 sm:px-4 sm:py-2 text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                  isCompactMode 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
                aria-label="Toggle compact mode"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">{isCompactMode ? 'Wide Mode' : 'Compact Mode'}</span>
                <span className="sm:hidden">{isCompactMode ? 'Wide' : 'Compact'}</span>
              </button>
              <button
                onClick={onLogout}
                className="px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className={`grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 ${isCompactMode ? 'max-w-4xl mx-auto' : 'lg:grid-cols-12'}`}>
          {/* Left Sidebar - Calendar */}
          {!isCompactMode && (
            <div className="lg:col-span-3 order-1 lg:order-1">
              <div className="mb-6 lg:mb-10">
                <Calendar onDateSelect={handleDateSelect} />
              </div>
            </div>
          )}
          
          {/* Main Content - Todo List */}
          <div className={`${isCompactMode ? "w-full" : "lg:col-span-6"} order-2 lg:order-2`}>
            <TodoList selectedDate={selectedTodoDate} selectedList={selectedList} isCompactMode={isCompactMode} />
          </div>
          
          {/* Right Sidebar - Lists and Notes */}
          {!isCompactMode && (
            <div className="lg:col-span-3 order-3 lg:order-3">
              <div className="mb-6">
                <Lists onListSelect={handleListSelect} selectedList={selectedList} />
              </div>
              <Notes />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 