/* eslint-disable @typescript-eslint/array-type */
// components/Datepicker.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";

type Props = {
    /** Called with YYYY-MM-DD strings in America/Chicago time */
    onDateChange?: (from: string, until: string) => void;
    /** Optional initial range (YYYY-MM-DD) */
    initialFrom?: string;
    initialUntil?: string;
    /** Optional className for the trigger button */
    className?: string;
};

/** ---- formatting helpers ---- */

/** For UI labels, e.g. "Oct 20, 2025" */
function formatDateForDisplay(date: Date | null): string {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

/** For emitting to parent, YYYY-MM-DD in America/Chicago */
function formatDateForExport(date: Date): string {
    // toLocaleDateString "MM/DD/YYYY" -> split -> yyyy-mm-dd
    const [m, d, y] = date
        .toLocaleDateString("en-US", {
            timeZone: "America/Chicago",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        })
        .split("/");
    return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD (local) to a JS Date at local midnight */
function parseISODate(iso: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    const [, y, mo, d] = m.map(Number) as unknown as number[];
    return new Date(y as number, (mo as number) - 1, d as number, 0, 0, 0, 0);
}

/** ---- component ---- */

export default function DateRangePicker({ className, initialFrom, initialUntil, onDateChange }: Props) {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    // currentMonth is the first day of the visible month
    const initialMonth = useMemo(() => {
        const base = parseISODate(initialFrom ?? "") ?? new Date(); // fallback: today
        return new Date(base.getFullYear(), base.getMonth(), 1);
    }, [initialFrom]);

    const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);
    const popoverRef = useRef<HTMLDivElement | null>(null);

    // Initialize defaults & emit once on mount, if provided
    useEffect(() => {
        if (initialFrom && initialUntil) {
            const s = parseISODate(initialFrom);
            const e = parseISODate(initialUntil);
            if (s && e) {
                setStartDate(s);
                setEndDate(e);
                onDateChange?.(initialFrom, initialUntil);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close popover on outside click
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!popoverRef.current) return;
            if (popoverRef.current.contains(e.target as Node)) return;
            setIsOpen(false);
        }
        if (isOpen) document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [isOpen]);

    /** Calendar helpers */

    function getMonthMeta(date: Date) {
        const y = date.getFullYear();
        const m = date.getMonth();
        const first = new Date(y, m, 1);
        const last = new Date(y, m + 1, 0);
        return {
            daysInMonth: last.getDate(),
            startingDayOfWeek: first.getDay(), // 0..6 (Sun..Sat)
        };
    }

    function changeMonth(delta: number) {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    }

    function isSameDay(a: Date | null, b: Date | null) {
        return !!a && !!b && a.toDateString() === b.toDateString();
    }

    function isInRange(day: number) {
        if (!startDate || !endDate) return false;
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return d >= startDate && d <= endDate;
    }

    function isSelected(day: number) {
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return isSameDay(d, startDate) || isSameDay(d, endDate);
    }

    /** Handle day click to build a range */
    function handleDateClick(day: number) {
        const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

        // 1st click or restarting selection
        if (!startDate || (startDate && endDate)) {
            setStartDate(selected);
            setEndDate(null);
            return;
        }

        // 2nd click
        if (selected < startDate) {
            // swap
            setEndDate(startDate);
            setStartDate(selected);
            onDateChange?.(formatDateForExport(selected), formatDateForExport(startDate));
        } else {
            setEndDate(selected);
            onDateChange?.(formatDateForExport(startDate), formatDateForExport(selected));
        }
    }

    /** Render */

    const { daysInMonth, startingDayOfWeek } = getMonthMeta(currentMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: startingDayOfWeek }, (_, i) => i);

    return (
        <div className={`relative ${className ?? ""}`}>
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2 bg-white"
            >
                <Calendar className="w-4 h-4 text-gray-600" />
                {startDate && endDate ? (
                    <span className="text-sm text-gray-700">
                        {formatDateForDisplay(startDate)} → {formatDateForDisplay(endDate)}
                    </span>
                ) : (
                    <span className="text-sm text-gray-500">Select date range</span>
                )}
            </button>

            {isOpen && (
                <div
                    ref={popoverRef}
                    className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80"
                >
                    {/* header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={() => changeMonth(-1)}
                            className="p-1 hover:bg-gray-100 rounded"
                            aria-label="Previous month"
                        >
                            ←
                        </button>
                        <span className="font-semibold text-sm">
                            {currentMonth.toLocaleDateString("en-US", {
                                timeZone: "America/Chicago",
                                month: "long",
                                year: "numeric",
                            })}
                        </span>
                        <button
                            type="button"
                            onClick={() => changeMonth(1)}
                            className="p-1 hover:bg-gray-100 rounded"
                            aria-label="Next month"
                        >
                            →
                        </button>
                    </div>

                    {/* weekday headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                            <div key={d} className="text-center text-xs font-semibold text-gray-600 py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* days grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {blanks.map((i) => (
                            <div key={`blank-${i}`} />
                        ))}

                        {days.map((day) => {
                            const inRange = isInRange(day);
                            const selected = isSelected(day);
                            const isStart =
                                startDate &&
                                isSameDay(
                                    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
                                    startDate
                                );
                            const isEnd =
                                endDate &&
                                isSameDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), endDate);

                            return (
                                <button
                                    type="button"
                                    key={day}
                                    onClick={() => handleDateClick(day)}
                                    className={[
                                        "text-sm rounded-md py-1.5",
                                        "transition-colors",
                                        "border border-transparent",
                                        "hover:border-indigo-400 hover:bg-indigo-50",
                                        inRange ? "bg-indigo-100" : "",
                                        selected
                                            ? "bg-indigo-500 text-white hover:border-indigo-500 hover:bg-indigo-500"
                                            : "",
                                        isStart || isEnd ? "ring-2 ring-indigo-500" : "",
                                    ].join(" ")}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    {/* current selection summary */}
                    <div className="mt-3 text-xs text-gray-600">
                        {startDate && !endDate && (
                            <span>Start: {formatDateForDisplay(startDate)} — pick an end date…</span>
                        )}
                        {startDate && endDate && (
                            <span>
                                {formatDateForDisplay(startDate)} → {formatDateForDisplay(endDate)}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
