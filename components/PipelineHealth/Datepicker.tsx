"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

interface DateRangePickerProps {
    onDateChange?: (from: string, until: string) => void;
}

export default function DateRangePicker({ onDateChange }: DateRangePickerProps) {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const formatDateForDisplay = (date: Date) => {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "America/Chicago",
        });
    };

    const formatDateForExport = (date: Date) => {
        return date
            .toLocaleDateString("en-US", {
                timeZone: "America/Chicago",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            })
            .split("/")
            .map((p) => p.padStart(2, "0"))
            .reverse()
            .join("-");
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek };
    };

    const handleDateClick = (day: number) => {
        const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

        if (!startDate || (startDate && endDate)) {
            setStartDate(selectedDate);
            setEndDate(null);
        } else {
            if (selectedDate < startDate) {
                const newEnd = startDate;
                setStartDate(selectedDate);
                setEndDate(newEnd);
                if (onDateChange) {
                    onDateChange(formatDateForExport(selectedDate), formatDateForExport(newEnd));
                }
            } else {
                setEndDate(selectedDate);
                if (onDateChange) {
                    onDateChange(formatDateForExport(startDate), formatDateForExport(selectedDate));
                }
            }
        }
    };

    const isDateInRange = (day: number) => {
        if (!startDate || !endDate) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return date >= startDate && date <= endDate;
    };

    const isDateSelected = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return (
            (startDate && date.toDateString() === startDate.toDateString()) ||
            (endDate && date.toDateString() === endDate.toDateString())
        );
    };

    const changeMonth = (delta: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2 bg-white"
            >
                <Calendar className="w-4 h-4 text-gray-600" />
                {startDate && endDate ? (
                    <span className="text-sm text-gray-700">
                        {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
                    </span>
                ) : (
                    <span className="text-sm text-gray-500">Select dates</span>
                )}
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
                            ←
                        </button>
                        <span className="font-semibold text-sm">
                            {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded">
                            →
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                            <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {emptyDays.map((i) => (
                            <div key={`empty-${i}`} />
                        ))}
                        {days.map((day) => (
                            <button
                                key={day}
                                onClick={() => handleDateClick(day)}
                                className={`
                  p-2 text-sm rounded hover:bg-indigo-100
                  ${isDateSelected(day) ? "bg-indigo-600 text-white hover:bg-indigo-700" : ""}
                  ${isDateInRange(day) && !isDateSelected(day) ? "bg-indigo-100" : ""}
                `}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="mt-4 w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Done
                    </button>
                </div>
            )}
        </div>
    );
}
