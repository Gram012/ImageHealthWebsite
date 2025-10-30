/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/array-type */
"use server";

import { Pool } from "pg";

// Replace with your server's IP, port, database, user, and password
const pool = new Pool({
    host: "wicapi.spa.umn.edu",       // e.g., "192.168.1.100"
    port: 5432,                    // default PostgreSQL port
    database: "turbo",
    user: "turbo",
    password: "TURBOTURBO",
    ssl: false                     // set to true if your DB requires SSL
});

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
        const res = await pool.query(`
            SELECT image_id, file_path, status, processing_start, processing_last, processing_time, machine_name, pipeline_step, step_message
            FROM panstarrs_pipeline.image_status
            ORDER BY image_id ASC;
        `);
        console.log(res.rows);
        return res.rows as Row[];
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
