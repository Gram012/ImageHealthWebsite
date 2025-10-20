/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/array-type */
"use server";

import { neon } from "@neondatabase/serverless";

const sql = neon(
    "postgresql://neondb_owner:npg_KX2l1sVWRuDB@ep-winter-unit-ad3tfw03-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
);

type Row = {
    image_id: number;
    file_path: string;
    status: string;
    processing_time: number | null;
    pipeline_step: string;
    step_message: string | null;
    time_of_run: string;
};

// type Date = {
//     year: number;
//     month: number;
//     day: number;
//     hour: number;
//     minuite: number;
//     second: number;
// };

export async function getTableData(): Promise<Row[]> {
    try {
        const rows = (await sql`
      SELECT image_id, file_path, status, processing_time, pipeline_step, step_message, time_of_run
      FROM panstarrs_pipeline.image_status
      ORDER BY image_id ASC
      LIMIT 100;
    `) as Row[];
        return rows;
    } catch (err) {
        console.error("Database error (getTableData):", err);
        return [];
    }
}

export async function getSuccessOrFail() {
    try {
        const rows = await getTableData();
        const success = rows.filter(r => r.step_message === "save").length;
        const total = rows.length;
        const failure = total - success;
        return { success, failure, total };
    } catch (err) {
        console.error("Error computing success/fail:", err);
        return { success: 0, failure: 0, total: 0 };
    }
}


