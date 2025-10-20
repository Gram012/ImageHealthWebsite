/* eslint-disable @typescript-eslint/array-type */
"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function PipelineStepHistogram({
    data,
    title = "Runs by pipeline step",
}: {
    data: { pipelineStep: string; count: number }[];
    title?: string;
}) {
    return (
        <section className="space-y-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="h-72 w-full">
                <ResponsiveContainer>
                    <BarChart data={data}>
                        {/* X-axis = buckets (pipeline_step) */}
                        <XAxis dataKey="pipelineStep" tick={{ fontSize: 12 }} interval={0} />
                        {/* Y-axis = counts */}
                        <YAxis />
                        <Tooltip />
                        <Bar
                            dataKey="count"
                            name="Runs"
                            type="monotone"
                            fill="#0000FF"
                            fillOpacity={0.5}
                            strokeWidth={2}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
