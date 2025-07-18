'use client';

import { useState, useEffect } from 'react';
import { getCalendarDays } from '../lib/api';
import { CalendarDay } from '../lib/types';

interface CalendarProps {
  onDateSelect: (date: string) => void;
}

const Calendar = ({ onDateSelect }: CalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalendarDays = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const days = await getCalendarDays(year, month);
            setCalendarDays(days);
        } catch (err) {
            setError('Failed to fetch calendar data');
        } finally {
            setIsLoading(false);
        }
    };
    fetchCalendarDays();
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    onDateSelect(date);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDayOfMonth = new Date(year, currentDate.getMonth(), 1).getDay();
  const calendarGrid = [];

  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarGrid.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
  }

  calendarDays.forEach((day) => {
    const isSelected = day.date === selectedDate;
    const hasItems = day.todoCount > 0 || day.noteCount > 0;
    const dayNumber = new Date(day.date).getDate();
    
    calendarGrid.push(
      <div 
        key={day.date} 
        onClick={() => handleDateClick(day.date)}
        className={`h-10 w-10 rounded-full flex flex-col items-center justify-center cursor-pointer relative
          ${isSelected ? 'bg-gray-900 text-white' : hasItems ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
      >
        <span className="text-sm font-medium">{dayNumber}</span>
        {hasItems && !isSelected && (
          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-yellow-500"></span>
        )}
      </div>
    );
  });

  if (isLoading) {
    return <div className="text-center p-12">Loading calendar...</div>;
  }

  if (error) {
    return <div className="text-center p-12 text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 h-full lg:w-[20vw]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Calendar</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevMonth}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            &lt;
          </button>
          <span className="text-sm font-medium">{monthName} {year}</span>
          <button 
            onClick={handleNextMonth}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-xs font-medium text-gray-500 text-center">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {calendarGrid}
      </div>
    </div>
  );
};

export default Calendar; 