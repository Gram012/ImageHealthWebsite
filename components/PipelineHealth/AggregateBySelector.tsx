/* eslint-disable @typescript-eslint/array-type */
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AggregateBy } from "@/services/analytics";

const options: AggregateBy[] = ["seconds", "minutes", "hours", "days", "months", "years"];

export default function AggregateBySelector({
    onChange,
    value = "days",
}: {
    value?: AggregateBy;
    onChange?: (v: AggregateBy) => void;
}) {
    const [local, setLocal] = useState<AggregateBy>(value);
    const set = (v: AggregateBy) => {
        setLocal(v);
        onChange?.(v);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">Aggregate by: {local}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={local} onValueChange={(v) => set(v as AggregateBy)}>
                    {options.map((v) => (
                        <DropdownMenuRadioItem key={v} value={v}>
                            {v[0].toUpperCase() + v.slice(1)}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
