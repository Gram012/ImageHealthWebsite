"use client";

import React from "react";

export default function VerboseLogPage() {
    const openLog = async () => {
        const res = await fetch("/api/verbose-log");
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "unknown" }));
            alert("Failed to fetch log: " + (err?.error || res.status));
            return;
        }

        const logText = await res.text();

        const newTab = window.open();
        if (!newTab) {
            alert("Popup blocked. Allow popups for this site.");
            return;
        }

        const escaped = logText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        newTab.document.write(`
      <html>
        <head>
          <title>Verbose Log</title>
          <meta charset="utf-8"/>
          <style>
            body {
              font-family: monospace;
              margin: 0;
              padding: 1rem;
              background: #0a0a0a;
              color: #e5e5e5;
            }
            pre {
              white-space: pre;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <pre>${escaped}</pre>
        </body>
      </html>
    `);
        newTab.document.close();
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                background: "#0a0a0a",
            }}
        >
            <button
                onClick={openLog}
                style={{
                    padding: "0.75rem 1.25rem",
                    borderRadius: 6,
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                }}
            >
                Open Verbose Log
            </button>
        </div>
    );
}
