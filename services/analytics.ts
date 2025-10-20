/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/no-unused-expressions */
// src/lib/analytics.ts
export type Row = {
    image_id: number;
    file_path: string;
    status: string;
    processing_time: number | null;
    pipeline_step: string;
    step_message: string | null; // "save" => success
    time_of_run: string;         // "YY_MM_DD:HH:MM:SS"
};

export type AggregateBy = "seconds" | "minutes" | "hours" | "days" | "months" | "years";

export function parseTimeOfRunToDate(s: string): Date | null {
    const [datePart, timePart] = s.split(":");
    if (!datePart || !timePart) return null;
    const [yy, mm, dd] = datePart.split("_").map(Number);
    const [HH, MM, SS] = timePart.split(":").map(Number);
    if ([yy, mm, dd, HH, MM, SS].some(Number.isNaN)) return null;
    return new Date(2000 + yy, (mm - 1), dd, HH, MM, SS, 0); // local time
}

const dayStart = (iso: string) => new Date(iso + "T00:00:00");
const dayEnd = (iso: string) => new Date(iso + "T23:59:59.999");

export function filterRowsByRange(rows: Row[], fromISO: string, untilISO: string): Row[] {
    const from = dayStart(fromISO);
    const until = dayEnd(untilISO);
    return rows.filter(r => {
        const t = parseTimeOfRunToDate(r.time_of_run);
        return t && t >= from && t <= until;
    });
}

export function countByPipelineStep(
    rows: Row[],
    opts: { onlyFailures?: boolean; onlySuccesses?: boolean } = {}
): { pipelineStep: string; count: number }[] {
    const { onlyFailures = false, onlySuccesses = false } = opts;
    const isSuccess = (r: Row) => r.step_message === "save";
    const m = new Map<string, number>();

    for (const r of rows) {
        if (onlyFailures && isSuccess(r)) continue;
        if (onlySuccesses && !isSuccess(r)) continue;
        m.set(r.pipeline_step, (m.get(r.pipeline_step) ?? 0) + 1);
    }

    return [...m.entries()]
        .map(([pipelineStep, count]) => ({ pipelineStep, count }))
        .sort((a, b) => a.pipelineStep.localeCompare(b.pipelineStep)); // alpha by step
}

function floorTo(d: Date, by: AggregateBy): Date {
    const x = new Date(d);
    if (by === "years") { x.setMonth(0, 1); x.setHours(0, 0, 0, 0); }
    if (by === "months") { x.setDate(1); x.setHours(0, 0, 0, 0); }
    if (by === "days") { x.setHours(0, 0, 0, 0); }
    if (by === "hours") { x.setMinutes(0, 0, 0); }
    if (by === "minutes") { x.setSeconds(0, 0); }
    if (by === "seconds") { x.setMilliseconds(0); }
    return x;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const keyFor = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export type TimeBucket = {
    date: string;
    numberOfSuccessfulRuns: number;
    numberOfFailedRuns: number;
    avgSuccessTime: number; // <-- add
    avgFailTime: number;    // <-- add
};

export function groupTimeSeries(
    rows: Row[],
    by: AggregateBy,
    isSuccess: (r: Row) => boolean = (r) => r.step_message === "save"
): TimeBucket[] {
    const m = new Map<
        string,
        { sCount: number; fCount: number; sSum: number; fSum: number }
    >();

    for (const r of rows) {
        const t = parseTimeOfRunToDate(r.time_of_run);
        if (!t) continue;
        const k = keyFor(floorTo(t, by));
        const v = m.get(k) ?? { sCount: 0, fCount: 0, sSum: 0, fSum: 0 };

        if (isSuccess(r)) {
            v.sCount += 1;
            v.sSum += r.processing_time ?? 0;
        } else {
            v.fCount += 1;
            v.fSum += r.processing_time ?? 0;
        }
        m.set(k, v);
    }

    return [...m.entries()]
        .map(([date, v]) => ({
            date,
            numberOfSuccessfulRuns: v.sCount,
            numberOfFailedRuns: v.fCount,
            avgSuccessTime: v.sCount ? v.sSum / v.sCount : 0,
            avgFailTime: v.fCount ? v.fSum / v.fCount : 0,
        }))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function failuresByPipelineStep(
    rows: Row[],
    isSuccess: (r: Row) => boolean = (r) => r.step_message === "save"
): { pipelineStep: string; failures: number }[] {
    const m = new Map<string, number>();
    for (const r of rows) {
        if (!isSuccess(r)) m.set(r.pipeline_step, (m.get(r.pipeline_step) ?? 0) + 1);
    }
    return [...m.entries()]
        .map(([pipelineStep, failures]) => ({ pipelineStep, failures }))
        .sort((a, b) => a.pipelineStep.localeCompare(b.pipelineStep));
}
