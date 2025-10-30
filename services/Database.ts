/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/array-type */
"use server";

import { Pool } from "pg";
//import tunnel from "tunnel-ssh";
const tunnel = require("tunnel-ssh");

// Load SSH private key from Vercel environment variable
const sshConfig = {
    username: process.env.SSH_USER!,            // SSH username
    host: process.env.SSH_HOST!,               // SSH server IP
    port: 22,                                   // SSH port
    privateKey: Buffer.from(process.env.SSH_PRIVATE_KEY!, "utf-8"),
    dstHost: "127.0.0.1",                       // DB host from SSH server perspective
    dstPort: 5432,                              // DB port on server
    localHost: "127.0.0.1",                     // local endpoint
    localPort: 5432                             // local port your code will connect to
};

// PostgreSQL pool, connects to local end of SSH tunnel
const pool = new Pool({
    host: "127.0.0.1",
    port: 5432,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    ssl: false
});

// Start SSH tunnel
async function startTunnel(): Promise<void> {
    return new Promise((resolve, reject) => {
        tunnel(sshConfig, (err: unknown, _server: unknown) => {
            if (err) {
                console.error("SSH Tunnel error:", err);
                reject(err);
            } else {
                console.log("SSH Tunnel established");
                resolve();
            }
        });
    });
}

// Start tunnel immediately when module loads
startTunnel().catch(err => console.error("Failed to start SSH tunnel:", err));

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
