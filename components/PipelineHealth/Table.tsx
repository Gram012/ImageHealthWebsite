"use client";

import { useRxSuspenseSuccess } from "@effect-rx/rx-react";
import { DateTime } from "effect";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { tableDataRx } from "@/components/PipelineHealth/rx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const getSciURL = (filePath: string | undefined): string => {
    // FIXME: handle undefined
    if (filePath === undefined) {
        return "";
    }

    const start = filePath.indexOf("telescope_");
    const end = filePath.lastIndexOf(".fits");
    if (start !== -1 && end !== -1 && end > start) {
        const ImgName = filePath.substring(start + "telescope_".length, end);
        return "http://popcorn.spa.umn.edu/center_cutouts/sci_cutouts/centcut_telescope_" + ImgName + ".webp";
    } else {
        return "http://popcorn.spa.umn.edu/center_cutouts/sci_cutouts/error";
    }
};

export const getDiffURL = (filePath: string | undefined): string => {
    // FIXME: handle undefined
    if (filePath === undefined) {
        return "";
    }

    const start = filePath.indexOf("telescope_");
    const end = filePath.lastIndexOf(".fits");
    if (start !== -1 && end !== -1 && end > start) {
        const ImgName = filePath.substring(start + "telescope_".length, end);
        return "http://popcorn.spa.umn.edu/center_cutouts/diff_cutouts/diff_centcut_telescope_" + ImgName + ".webp";
    } else {
        return "http://popcorn.spa.umn.edu/center_cutouts/sci_cutouts/error";
    }
};

export function RunsTable() {
    const tableData = useRxSuspenseSuccess(tableDataRx).value;

    return (
        <Table>
            <TableCaption>All runs for {"activeLabel"}</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processing Time</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead className="text-right">Verbose logs</TableHead>
                    <TableHead>Cutout</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tableData.map((row, index) => (
                    <TableRow key={index}>
                        <TableCell className="font-medium">{DateTime.formatIso(row.run)}</TableCell>
                        <TableCell>{row.pipelineStepName}</TableCell>
                        <TableCell>{row.processingTime}</TableCell>
                        <TableCell>{row.file}</TableCell>
                        <TableCell>
                            <Link
                                href={{
                                    pathname: `/verbose-logs/${row.file?.includes("tlenaii") ? "tlenaii" : "popcorn"}/${row.schemaName}`,
                                }}
                                target="_blank"
                            >
                                View logs
                            </Link>
                        </TableCell>
                        {/* Needs major overhaul...
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <ChevronDown />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <Link href={getSciURL(row.file)} target="_blank">
                                        <DropdownMenuItem>Sci</DropdownMenuItem>
                                    </Link>
                                    <Link href={getDiffURL(row.file)} target="_blank">
                                        <DropdownMenuItem>Diff</DropdownMenuItem>
                                    </Link>
                                    <Link href={getRefURL(row.file)} target="_blank">
                                        <DropdownMenuItem>Ref</DropdownMenuItem>
                                    </Link>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell> */}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
