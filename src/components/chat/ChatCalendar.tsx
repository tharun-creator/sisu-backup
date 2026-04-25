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
  eachDayOfInterval,
  isBefore,
  startOfToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { APPOINTMENT_SLOT_TIMES } from '@/lib/datetime';

interface ChatCalendarProps {
  onSelect: (date: string, time: string) => void;
}

export function ChatCalendar({ onSelect }: ChatCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const times = [...APPOINTMENT_SLOT_TIMES];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const handleDateClick = (day: Date) => {
    if (isBefore(day, startOfToday())) return;
    if (!isSameMonth(day, monthStart)) return;
    setSelectedDate(day);
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      // Send ISO date string and time separately for reliable parsing
      const isoDate = format(selectedDate, 'yyyy-MM-dd');
      onSelect(isoDate, selectedTime);
    }
  };

  return (
    <div className="bg-white text-black rounded-3xl p-6 my-2 shadow-xl animate-in fade-in zoom-in-95 duration-300">
      {!selectedDate ? (
        <>
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xl font-bold tracking-tight">
              {format(currentMonth, 'MMMM yyyy')}
            </h4>
            <div className="flex gap-4">
              <button 
                onClick={(e) => { e.preventDefault(); setCurrentMonth(subMonths(currentMonth, 1)); }} 
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={(e) => { e.preventDefault(); setCurrentMonth(addMonths(currentMonth, 1)); }} 
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-2 mb-4 text-center">
            {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d, i) => (
              <div key={i} className="text-[11px] font-bold text-black/40 tracking-wider py-2">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isPast = isBefore(day, startOfToday());
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div key={i} className="flex justify-center items-center h-10">
                  {isCurrentMonth ? (
                    <button
                      disabled={isPast}
                      onClick={(e) => { e.preventDefault(); handleDateClick(day); }}
                      className={`
                        w-10 h-10 text-sm font-medium rounded-full transition-all flex items-center justify-center
                        ${isPast ? 'text-black/10 cursor-not-allowed' : 'text-black hover:bg-black/5'}
                        ${isSelected ? '!bg-blue-600 !text-white font-bold scale-110' : ''}
                        ${isToday && !isSelected ? 'border border-blue-600/30' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  ) : (
                    <div className="w-10 h-10" />
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between border-b border-black/5 pb-4">
            <div>
              <p className="text-sm font-bold text-black">
                {format(selectedDate, 'MMMM d, yyyy')}
              </p>
              <p className="text-[11px] text-black/40">Select a preferred time</p>
            </div>
            <button 
              onClick={(e) => { e.preventDefault(); setSelectedDate(null); setSelectedTime(null); }} 
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Change Date
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {times.map((t) => (
              <button
                key={t}
                onClick={(e) => { e.preventDefault(); setSelectedTime(t); }}
                className={`
                  py-3 px-4 text-xs font-bold rounded-2xl border transition-all flex items-center justify-center gap-2
                  ${selectedTime === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-black/5 border-transparent text-black/70 hover:bg-black/10'}
                `}
              >
                <Clock size={14} className={selectedTime === t ? 'text-white' : 'text-black/40'} /> {t}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <button
              disabled={!selectedTime}
              onClick={(e) => { e.preventDefault(); handleConfirm(); }}
              className="w-full bg-black text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-30 transition-all active:scale-[0.98] shadow-lg shadow-black/10"
            >
              Confirm Appointment
            </button>
            <p className="text-center text-[10px] text-black/40 mt-4">
              You picked {format(selectedDate, 'MMM d, yyyy')}{selectedTime ? ` at ${selectedTime}` : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
