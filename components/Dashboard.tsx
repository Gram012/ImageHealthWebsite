/* eslint-disable @typescript-eslint/array-type */
"use client";

import { useMemo, useState } from "react";
import DateRangePicker from "@/components/PipelineHealth/Datepicker";
import AggregateBySelector from "@/components/PipelineHealth/AggregateBySelector";
import RunTimeHist, { type AggregateBy } from "@/components/PipelineHealth/RunTimeHist";
import PipelineStepHistogram from "@/components/PipelineHealth/PipelineStepHistogram";
import { filterRowsByRange, groupTimeSeries, type Row } from "@/services/analytics";

/** Local helper: make X=pipeline_step, Y=count buckets */
function makeStepBuckets(
    rows: Row[],
    mode: "all" | "failures" | "successes" = "all"
): { pipelineStep: string; count: number }[] {
    const isSuccess = (r: Row) => r.step_message === "save";
    const counts = new Map<string, number>();
    for (const r of rows) {
        if (mode === "failures" && isSuccess(r)) continue;
        if (mode === "successes" && !isSuccess(r)) continue;
        counts.set(r.pipeline_step, (counts.get(r.pipeline_step) ?? 0) + 1);
    }
    return [...counts.entries()]
        .map(([pipelineStep, count]) => ({ pipelineStep, count }))
        .sort((a, b) => a.pipelineStep.localeCompare(b.pipelineStep));
}

const todayISO = new Date().toISOString().slice(0, 10);
const isoDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};

export default function ClientDashboard({ initialRows }: { initialRows: Row[] }) {
    // selectors
    const [from, setFrom] = useState<string>(isoDaysAgo(7)); // default last 7 days
    const [until, setUntil] = useState<string>(todayISO);
    const [aggregateBy, setAggregateBy] = useState<AggregateBy>("hours");
    const [stepMode, setStepMode] = useState<"all" | "failures" | "successes">("all");

    // filter rows by date range
    const filtered = useMemo(() => filterRowsByRange(initialRows ?? [], from, until), [initialRows, from, until]);

    // time-based histogram buckets -> shape expected by RunTimeHist
    const timeSeriesGrouped = useMemo(() => {
        const grouped = groupTimeSeries(filtered, aggregateBy);
        return grouped.reduce<
            Record<
                string,
                {
                    avgFailTime: number;
                    avgSuccessTime: number;
                    numberFailedRuns: number;
                    numberSuccessfulRuns: number;
                }
            >
        >((acc, b) => {
            acc[b.date] = {
                avgFailTime: b.avgFailTime,
                avgSuccessTime: b.avgSuccessTime,
                numberFailedRuns: b.numberOfFailedRuns,
                numberSuccessfulRuns: b.numberOfSuccessfulRuns,
            };
            return acc;
        }, {});
    }, [filtered, aggregateBy]);

    // totals for header in RunTimeHist
    const totals = useMemo(() => {
        const successfulRuns = filtered.filter((r) => r.step_message === "save").length;
        const totalRuns = filtered.length;
        const failedRuns = totalRuns - successfulRuns;
        const successRate = totalRuns ? (successfulRuns / totalRuns) * 100 : 0;
        const failureRate = totalRuns ? (failedRuns / totalRuns) * 100 : 0;
        return { successfulRuns, failedRuns, totalRuns, successRate, failureRate };
    }, [filtered]);

    // pipeline_step histogram data (X=bucket=step, Y=count)
    const stepBuckets = useMemo(() => makeStepBuckets(filtered, stepMode), [filtered, stepMode]);

    return (
        <main className="mx-auto px-8 py-8 space-y-8 w-full">
            {/* Controls */}
            <header className="flex flex-wrap items-center gap-3">
                <DateRangePicker
                    initialFrom={isoDaysAgo(7)}
                    initialUntil={todayISO}
                    onDateChange={(from, until) => {
                        // from/until are "YYYY-MM-DD" in America/Chicago.
                        setFrom(from);
                        setUntil(until);
                    }}
                />
                <AggregateBySelector value={aggregateBy} onChange={setAggregateBy} />

                {/* Simple toggle for the step histogram mode */}
                <div className="ml-auto flex items-center gap-1 text-sm">
                    <button
                        onClick={() => setStepMode("all")}
                        className={`rounded-md px-3 py-1 border ${
                            stepMode === "all" ? "bg-zinc-100 dark:bg-zinc-800" : "bg-transparent"
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setStepMode("successes")}
                        className={`rounded-md px-3 py-1 border ${
                            stepMode === "successes" ? "bg-zinc-100 dark:bg-zinc-800" : "bg-transparent"
                        }`}
                    >
                        Successes
                    </button>
                    <button
                        onClick={() => setStepMode("failures")}
                        className={`rounded-md px-3 py-1 border ${
                            stepMode === "failures" ? "bg-zinc-100 dark:bg-zinc-800" : "bg-transparent"
                        }`}
                    >
                        Failures
                    </button>
                </div>
            </header>

            {/* Time-based histogram */}
            <section className="space-y-2">
                <RunTimeHist
                    aggregateBy={aggregateBy}
                    timeSeriesData={timeSeriesGrouped}
                    totals={totals}
                    fromISO={from}
                    untilISO={until}
                />
            </section>

            {/* Pipeline step histogram: X=pipeline_step, Y=count */}
            <section className="space-y-2">
                <PipelineStepHistogram
                    data={stepBuckets}
                    title={
                        stepMode === "all"
                            ? "Runs by pipeline step (all)"
                            : stepMode === "successes"
                              ? "Runs by pipeline step (successes)"
                              : "Runs by pipeline step (failures)"
                    }
                />
            </section>

            {/* Details table */}
            <section className="space-y-2">
                <h2 className="text-lg font-semibold">Details</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-left">
                            <tr>
                                <th className="py-2 pr-4">Pipeline Step</th>
                                <th className="py-2 pr-4">Message</th>
                                <th className="py-2 pr-4">Machine</th>
                                <th className="py-2 pr-4">Start Time</th>
                                <th className="py-2 pr-4">Last Update</th>
                                <th className="py-2 pr-4">Duration</th>
                                <th className="py-2 pr-4">Path (/nas/)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200/50">
                            {filtered.map((row) => {
                                const chopTimezone = (dateStr: string) => {
                                    return dateStr.split(" GMT")[0];
                                };

                                return (
                                    <tr key={row.image_id}>
                                        <td className="py-2 pr-4">{row.pipeline_step}</td>
                                        <td className="py-2 pr-4">{row.step_message ?? "—"}</td>
                                        <td className="py-2 pr-4">{row.machine_name}</td>
                                        <td className="py-2 pr-4">{chopTimezone(String(row.processing_start))}</td>
                                        <td className="py-2 pr-4">{chopTimezone(String(row.processing_last))}</td>
                                        <td className="py-2 pr-4">{row.processing_time?.toFixed(1)}s</td>
                                        <td className="py-2 pr-4 truncate max-w-xs" title={row.file_path}>
                                            {row.file_path ? `.../${row.file_path.split("/").pop()}` : "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-6 text-zinc-500">
                                        No rows in selected range.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
