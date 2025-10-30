/* eslint-disable @typescript-eslint/no-explicit-any */
// Grab logfile from ariadne, display as HTML
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

export async function GET(_req: NextRequest) {
    const machine = "zeus";
    const remoteHost = "zeus.spa.umn.edu";
    const remotePath =
        "/mnt/waz/nas/turbo/pipeline/logging_folder/2025-10-28_21-51-44_Ariadne_verbose.log";

    try {
        // Run SSH command to get log content
        const { stderr, stdout } = await execAsync(
            `ssh -i ~/.ssh/remote_server_ed25519 ${machine}@${remoteHost} "cat ${remotePath}"`
        );

        if (stderr) {
            return NextResponse.json({ error: stderr }, { status: 500 });
        }

        // Return as plain text
        return new NextResponse(stdout, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
