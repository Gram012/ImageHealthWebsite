import { DateTime, Duration, Effect, Function, Option } from "effect";

import { PipelineHealth } from "@/components/Layout";
import { ModeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function Page() {
    const timezone = DateTime.zoneMakeNamed("America/Chicago").pipe(Option.getOrThrow);

    const serverUntil = Function.pipe(
        Effect.runSync(DateTime.now),
        DateTime.subtractDuration(Duration.millis(0)),
        DateTime.setZone(timezone)
    );

    const serverFrom = Function.pipe(
        Effect.runSync(DateTime.now),
        DateTime.subtractDuration(Duration.hours(72)),
        DateTime.setZone(timezone)
    );

    return (
        <>
            <div className="fixed bottom-5 right-5 z-50">
                <ModeToggle />
            </div>

            <PipelineHealth
                timezone={DateTime.zoneToString(timezone)}
                serverFrom={DateTime.formatIsoZoned(serverFrom)}
                serverUntil={DateTime.formatIsoZoned(serverUntil)}
            />
        </>
    );
}
