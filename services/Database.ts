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
    processing_start: string;
    processing_last: string;
    processing_time: number | null;
    machine_name: string;
    pipeline_step: string;
    step_message: string | null;
    log_path: string | null;
};

export async function getTableData(): Promise<Row[]> {
    try {
        const rows = (await sql`
      SELECT image_id, file_path, status, processing_start, processing_last, processing_time, machine_name, pipeline_step, step_message
      FROM panstarrs_pipeline.image_status
      ORDER BY image_id ASC;
    `) as Row[];
        console.log(rows);
        return rows;
    } catch (err) {
        console.error("Database error (getTableData):", err);
        return [];
    }
}

export async function getSuccessOrFail() {
    try {
        const rows = await getTableData();
        const success = rows.filter(r => r.step_message === "Saved the image").length;
        const total = rows.length;
        const failure = total - success;
        return { success, failure, total };
    } catch (err) {
        console.error("Error computing success/fail:", err);
        return { success: 0, failure: 0, total: 0 };
    }
}
