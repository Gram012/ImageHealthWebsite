/* eslint-disable @typescript-eslint/array-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/RunTimeHist.tsx
"use client";

import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
import { SigmaIcon } from "lucide-react";

/** Match your app’s AggregateBy options */
export type AggregateBy = "seconds" | "minutes" | "hours" | "days" | "months" | "years";

/** The grouped record you already produce upstream (by floored timestamp key) */
export type GroupedPoint = {
    avgFailTime: number;
    avgSuccessTime: number;
    numberFailedRuns: number;
    numberSuccessfulRuns: number;
};
export type TimeSeriesGrouped = Record<string, GroupedPoint>;

export type Totals = {
    successfulRuns: number;
    failedRuns: number;
    totalRuns: number;
    successRate: number; // 0..100
    failureRate: number; // 0..100
};

const chart1 = "sumOfSuccessAndFail" as const;
const chart2 = "averageSuccessProcessingTime" as const;
const chart3 = "averageFailureProcessingTime" as const;
const chart4 = "numberOfSuccessfulRuns" as const;
const chart5 = "numberOfFailedRuns" as const;
const chart6 = "averageProcessingTimeAllRuns" as const; // selector button for "all"
const chart7 = "numberOfAllRuns" as const;

export const chartConfigs = {
    [chart1]: {
        label: "Total",
        title: "sum success fail",
        color: "#FFFFFF",
        icon: SigmaIcon,
    },
    [chart2]: {
        color: "#00cc00",
        title: "Percent success",
        label: "Average successful processing time",
        icon: CheckIcon,
    },
    [chart3]: {
        color: "#FF0000",
        title: "Percent failure",
        label: "Average failed processing time",
        icon: Cross2Icon,
    },
    [chart5]: {
        color: "#FF0000",
        title: "Number of Failed Runs",
        label: "Number of Failed Runs",
        icon: Cross2Icon,
    },
    [chart4]: {
        color: "#00cc00",
        title: "Number of Successful Runs",
        label: "Number of Successful Runs",
        icon: CheckIcon,
    },
    [chart6]: {
        color: "#FFFFFF",
        title: "All Runs",
        label: "Average Processing Time",
    },
    [chart7]: {
        color: "#FFFFFF",
        title: "All Runs",
        label: "All Runs",
    },
} as const;

export type MappedData = Array<{
    date: string;
    [chart1]: number;
    [chart2]: number;
    [chart3]: number;
    [chart4]: number;
    [chart5]: number;
}>;

function pad(n: number, w = 2) {
    return String(n).padStart(w, "0");
}
function parseKeyToDate(k: string): Date | null {
    // Expect keys like "YYYY-MM-DD HH:MM:SS" (what your grouper emits).
    // Try to parse robustly; fallback to Date(k).
    // Format: 2025-10-20 14:05:00
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(k);
    if (m) {
        const [, Y, M, D, h, m2, s] = m.map(Number) as unknown as number[];
        return new Date(Y, (M as number) - 1, D as number, h as number, m2 as number, s as number);
    }
    const d = new Date(k);
    return isNaN(d.getTime()) ? null : d;
}

function formatTick(d: Date, by: AggregateBy): string {
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const Y = d.getFullYear();
    const M = d.getMonth();
    const DD = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());

    switch (by) {
        case "years":
            return `${Y}`;
        case "months":
            return `${monthNamesShort[M]} ${Y}`;
        case "days":
            return `${monthNamesShort[M]} ${DD}`;
        case "hours":
            return `${monthNamesShort[M]} ${DD} ${hh}:00`;
        case "minutes":
            return `${monthNamesShort[M]} ${DD} ${hh}:${mm}`;
        case "seconds":
            return `${monthNamesShort[M]} ${DD} ${hh}:${mm}:${ss}`;
        default:
            return `${monthNamesShort[M]} ${DD}`;
    }
}

function formatTooltipLabel(d: Date): string {
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const Y = d.getFullYear();
    const M = monthNamesShort[d.getMonth()];
    const DD = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${M} ${DD}, ${Y} ${hh}:${mm}:${ss}`;
}

function enumerateDayKeys(fromISO?: string, untilISO?: string): string[] {
    if (!fromISO || !untilISO) return [];

    const start = new Date(fromISO + "T00:00:00");
    const end = new Date(untilISO + "T00:00:00");

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return [];
    }

    const pad2 = (n: number) => String(n).padStart(2, "0");
    const out: string[] = [];

    // Iterate through each day in the range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateString = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} 00:00:00`;
        out.push(dateString);
    }

    return out;
}

export default function RunTimeHist({
    aggregateBy,
    fromISO,
    onActiveLabel,
    timeSeriesData,
    totals,
    untilISO,
}: {
    aggregateBy: AggregateBy;
    timeSeriesData: TimeSeriesGrouped;
    totals: Totals;
    onActiveLabel?: (label: string | undefined) => void;
    fromISO?: string; // "YYYY-MM-DD"
    untilISO?: string;
}) {
    const [activeChart, setActiveChart] = useState<"success" | "failure" | "all">("all");
    const activeChartKey = activeChart === "all" ? chart7 : activeChart === "success" ? chart4 : chart5;

    const chartTotals = useMemo(
        () => ({
            [chart1]: `${totals.successfulRuns + totals.failedRuns}`,
            [chart2]: `${totals.successRate.toFixed(1)}%`,
            [chart3]: `${totals.failureRate.toFixed(1)}%`,
            [chart4]: `${totals.successfulRuns}`,
            [chart5]: `${totals.failedRuns}`,
            [chart6]: "Show All",
            [chart7]: `${totals.totalRuns}`,
        }),
        [totals]
    );

    const chartData: MappedData = useMemo(() => {
        // For days aggregation, generate all dates in the range
        if (aggregateBy === "days" && fromISO && untilISO) {
            const allDates = enumerateDayKeys(fromISO, untilISO);
            return allDates.map((date) => {
                const existingData = timeSeriesData[date];
                return {
                    date,
                    [chart1]: existingData ? existingData.numberFailedRuns + existingData.numberSuccessfulRuns : 0,
                    [chart2]: existingData ? existingData.avgSuccessTime : 0,
                    [chart3]: existingData ? existingData.avgFailTime : 0,
                    [chart4]: existingData ? existingData.numberSuccessfulRuns : 0,
                    [chart5]: existingData ? existingData.numberFailedRuns : 0,
                };
            });
        }

        // Original logic for other aggregation types
        return Object.entries(timeSeriesData)
            .map(([key, v]) => ({
                date: key,
                [chart1]: v.numberFailedRuns + v.numberSuccessfulRuns,
                [chart2]: v.avgSuccessTime,
                [chart3]: v.avgFailTime,
                [chart4]: v.numberSuccessfulRuns,
                [chart5]: v.numberFailedRuns,
            }))
            .sort((a, b) => (a.date < b.date ? -1 : 1));
    }, [timeSeriesData, aggregateBy, fromISO, untilISO]);

    return (
        <Card>
            <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                    <CardTitle>
                        Showing the number of {activeChart} runs grouped by {aggregateBy}
                    </CardTitle>

                    <span className="text-xs text-muted-foreground">
                        {chartConfigs[chart2].title} = {chartTotals[chart2]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {chartConfigs[chart3].title} = {chartTotals[chart3]}
                    </span>
                    <span className="text-xs text-muted-foreground">Total Number of Runs = {chartTotals[chart7]}</span>
                </div>

                <div className="flex">
                    {[chart4, chart5, chart6].map((chart) => {
                        const tabActive =
                            (chart === chart6 && activeChart === "all") ||
                            (chart === chart4 && activeChart === "success") ||
                            (chart === chart5 && activeChart === "failure");

                        return (
                            <button
                                key={chart}
                                data-active={tabActive}
                                className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                                onClick={() =>
                                    chart === chart6
                                        ? setActiveChart("all")
                                        : chart === chart4
                                          ? setActiveChart("success")
                                          : setActiveChart("failure")
                                }
                            >
                                <span className="text-xs text-muted-foreground">{chartConfigs[chart].title}</span>
                                <span className="text-lg font-bold leading-none sm:text-3xl">{chartTotals[chart]}</span>
                            </button>
                        );
                    })}
                </div>
            </CardHeader>

            <CardContent className="px-2 sm:p-6">
                <ChartContainer config={chartConfigs} className="aspect-auto h-[350px] w-full">
                    <ResponsiveContainer>
                        <ComposedChart
                            accessibilityLayer
                            data={chartData}
                            onClick={(e: any) => onActiveLabel?.(e?.activeLabel)}
                            barCategoryGap="25%"
                            barGap={0}
                            margin={{
                                left: 12,
                                right: 12,
                                bottom: aggregateBy === "seconds" || aggregateBy === "minutes" ? 70 : 40,
                            }}
                        >
                            <CartesianGrid />
                            <XAxis
                                dataKey="date"
                                tickLine
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                angle={aggregateBy === "seconds" || aggregateBy === "minutes" ? -45 : 0}
                                textAnchor={aggregateBy === "seconds" || aggregateBy === "minutes" ? "end" : "middle"}
                                ticks={aggregateBy === "days" ? enumerateDayKeys(fromISO, untilISO) : undefined}
                                tickFormatter={(label: string) => {
                                    const d = parseKeyToDate(label);
                                    return d ? formatTick(d, aggregateBy) : label;
                                }}
                            />
                            <YAxis
                                allowDecimals={false}
                                tickLine
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(v) => `${v}`}
                            />

                            <Tooltip
                                content={
                                    <ChartTooltipContent
                                        className="w-[300px]"
                                        labelFormatter={(label: string) => {
                                            const d = parseKeyToDate(label);
                                            return d ? formatTooltipLabel(d) : label;
                                        }}
                                    />
                                }
                            />

                            <Legend
                                payload={[
                                    {
                                        id: activeChartKey,
                                        type: "square",
                                        value: chartConfigs[activeChartKey].label,
                                        color: chartConfigs[activeChartKey].color,
                                    },
                                ]}
                                verticalAlign="top"
                                align="left"
                                height={36}
                            />

                            {/* ALL = stacked success+fail bars, with dashed total line hidden (kept for parity) */}
                            {activeChart === "all" && (
                                <>
                                    <Bar
                                        key={`${chart7}.${chart4}-bar`}
                                        dataKey={chart4}
                                        name={chartConfigs[chart4].label}
                                        fill={chartConfigs[chart4].color}
                                        fillOpacity={0.5}
                                    />
                                    <Bar
                                        key={`${chart7}.${chart5}-bar`}
                                        dataKey={chart5}
                                        name={chartConfigs[chart5].label}
                                        fill={chartConfigs[chart5].color}
                                        fillOpacity={0.5}
                                    />
                                    <Line
                                        dataKey={chart1}
                                        type="monotone"
                                        stroke={chartConfigs[chart1].color}
                                        strokeWidth={1}
                                        strokeDasharray="3 3"
                                        dot={false}
                                        hide
                                    />
                                </>
                            )}

                            {/* SUCCESS or FAILURE = single series bar */}
                            {activeChart !== "all" && (
                                <Bar
                                    key={activeChart === "success" ? `${chart4}-bar` : `${chart5}-bar`}
                                    dataKey={activeChart === "success" ? chart4 : chart5}
                                    fill={
                                        activeChart === "success"
                                            ? chartConfigs[chart4].color
                                            : chartConfigs[chart5].color
                                    }
                                    fillOpacity={0.5}
                                />
                            )}

                            {/* keep these hidden lines to preserve hover behavior parity if needed */}
                            {activeChart === "success" ? (
                                <Line dataKey={chart2} hide />
                            ) : activeChart === "failure" ? (
                                <Line dataKey={chart3} hide />
                            ) : activeChart === "all" ? (
                                <Line dataKey={chart7} hide />
                            ) : null}
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
