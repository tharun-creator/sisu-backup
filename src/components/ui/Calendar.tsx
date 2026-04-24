'use client';

import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  appointments?: { date: string }[];
}

export default function Calendar({ selectedDate, onDateSelect, appointments = [] }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-xs font-bold text-white/40 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const rows: React.JSX.Element[] = [];
    let days: React.JSX.Element[] = [];

    calendarDays.forEach((day, i) => {
      const formattedDate = format(day, 'd');
      const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
      const isCurrentMonth = isSameMonth(day, monthStart);
      const dayAppointments = appointments.filter(appt => isSameDay(new Date(appt.date), day));

      days.push(
        <div
          key={day.toString()}
          className={`
            relative h-14 flex items-center justify-center cursor-pointer transition-all duration-200 rounded-xl
            ${!isCurrentMonth ? 'text-white/10 cursor-default' : 'text-white/80 hover:bg-white/5'}
            ${isSelected ? 'bg-white !text-black' : ''}
          `}
          onClick={() => isCurrentMonth && onDateSelect(day)}
        >
          <span className="text-sm font-medium">{formattedDate}</span>
          {dayAppointments.length > 0 && !isSelected && (
            <div className="absolute bottom-2 w-1 h-1 bg-accent rounded-full" />
          )}
        </div>
      );

      if ((i + 1) % 7 === 0) {
        rows.push(
          <div className="grid grid-cols-7" key={day.toString()}>
            {days}
          </div>
        );
        days = [];
      }
    });

    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <div className="w-full">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
