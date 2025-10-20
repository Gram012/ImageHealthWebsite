/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/array-type */
// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import DateRangePicker from "@/components/PipelineHealth/Datepicker"; // expects onDateChange(fromISO, untilISO)
import AggregateBySelector from "@/components/PipelineHealth/AggregateBySelector";
import RunTimeHist from "@/components/PipelineHealth/RunTimeHist";
import PipelineStepHistogram from "@/components/PipelineHealth/PipelineStepHistogram";
import { getTableData } from "@/services/Database";

import type { AggregateBy } from "@/components/PipelineHealth/RunTimeHist";
import { filterRowsByRange, groupTimeSeries, failuresByPipelineStep, type Row } from "@/services/analytics";

// ------- small local helpers -------
const todayISO = new Date().toISOString().slice(0, 10);
const isoDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};

// ------- page component -------
export default function Page() {
    // raw DB rows
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // selectors
    const [from, setFrom] = useState<string>(isoDaysAgo(7)); // default: last 7 days
    const [until, setUntil] = useState<string>(todayISO);
    const [aggregateBy, setAggregateBy] = useState<AggregateBy>("hours");

    // fetch once
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const r = (await getTableData()) as Row[];
                setRows(r ?? []);
            } catch (e: any) {
                setError(e?.message ?? "Failed to fetch data");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // filter by date range
    const filtered = useMemo(() => filterRowsByRange(rows, from, until), [rows, from, until]);

    // time-based histogram buckets (mapped to RunTimeHist shape)
    const timeSeriesGrouped = useMemo(() => {
        const grouped = groupTimeSeries(filtered, aggregateBy);
        // groupTimeSeries returns an array; RunTimeHist expects a Record keyed by date label
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

    // totals for header
    const totals = useMemo(() => {
        const successfulRuns = filtered.filter((r) => r.step_message === "save").length;
        const failedRuns = filtered.length - successfulRuns;
        const totalRuns = filtered.length;
        const successRate = totalRuns ? (successfulRuns / totalRuns) * 100 : 0;
        const failureRate = totalRuns ? (failedRuns / totalRuns) * 100 : 0;
        return { successfulRuns, failedRuns, totalRuns, successRate, failureRate };
    }, [filtered]);

    // pipeline-step histogram (X = pipeline_step, Y = count)
    const stepBuckets = useMemo(
        () =>
            failuresByPipelineStep(filtered, (_r) => true /* count ALL runs by step */).map(
                ({ failures, pipelineStep }) => ({ pipelineStep, count: failures })
            ),

        // If you instead want ALL runs (success + failure) by step:
        // replace the line above with:
        // () => countByPipelineStep(filtered)
        [filtered]
    );

    return (
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <header className="flex flex-wrap gap-3 items-center">
                <DateRangePicker
                    onDateChange={(f, u) => {
                        setFrom(f);
                        setUntil(u);
                    }}
                />
                <AggregateBySelector value={aggregateBy} onChange={setAggregateBy} />
            </header>

            {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
            ) : error ? (
                <div className="text-sm text-red-600">Error: {error}</div>
            ) : (
                <>
                    {/* Time-based histogram (success/failure over time) */}
                    <section className="space-y-2">
                        <RunTimeHist aggregateBy={aggregateBy} timeSeriesData={timeSeriesGrouped} totals={totals} />
                    </section>

                    {/* Pipeline-step histogram: X=buckets (pipeline_step), Y=count */}
                    <section className="space-y-2">
                        <PipelineStepHistogram data={stepBuckets} title="Runs by pipeline step" />
                    </section>

                    {/* Details table */}
                    <section className="space-y-2">
                        <h2 className="text-lg font-semibold">Details</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="text-left">
                                    <tr>
                                        <th className="py-2 pr-4">ID</th>
                                        <th className="py-2 pr-4">Pipeline Step</th>
                                        <th className="py-2 pr-4">Status</th>
                                        <th className="py-2 pr-4">Proc Time</th>
                                        <th className="py-2 pr-4">Message</th>
                                        <th className="py-2 pr-4">Run Time</th>
                                        <th className="py-2 pr-4">Path</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200/50">
                                    {filtered.map((r) => (
                                        <tr key={r.image_id}>
                                            <td className="py-2 pr-4">{r.image_id}</td>
                                            <td className="py-2 pr-4">{r.pipeline_step}</td>
                                            <td className="py-2 pr-4">{r.status}</td>
                                            <td className="py-2 pr-4">{r.processing_time ?? "—"}</td>
                                            <td className="py-2 pr-4">{r.step_message ?? "—"}</td>
                                            <td className="py-2 pr-4">{r.time_of_run}</td>
                                            <td className="py-2 pr-4">{r.file_path}</td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td className="py-6 text-zinc-500" colSpan={7}>
                                                No rows in selected range.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </main>
    );
}
