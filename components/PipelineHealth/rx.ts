//Prob a not-soydev way to do this

// "use client";

// import { Result, Rx } from "@effect-rx/rx-react";
// import { FetchHttpClient } from "@effect/platform";
// import {
//     Array,
//     Cause,
//     Chunk,
//     DateTime,
//     Duration,
//     Effect,
//     Either,
//     Function,
//     Layer,
//     Match,
//     Number,
//     Option,
//     Predicate,
//     Record,
//     Sink,
//     Stream,
// } from "effect";

// import { rpcClient } from "@/app/api/client";
// import { ResultRow, RunsInTimeRangeRequest } from "@/services/Domain";

// /** Rx runtime. */
// const runtime = Rx.runtime(
//     Layer.provide(
//         FetchHttpClient.layer,
//         Layer.succeed(FetchHttpClient.RequestInit, {
//             cache: "no-store",
//         })
//     )
// );

// export const localeRx = Rx.fn<string, Cause.IllegalArgumentException, DateTime.TimeZone>(
//     (locale: string, _ctx: Rx.Context): Effect.Effect<DateTime.TimeZone, Cause.IllegalArgumentException, never> =>
//         Function.pipe(
//             DateTime.zoneMakeNamed(locale),
//             Either.fromOption(() => new Cause.IllegalArgumentException("Invalid timezone"))
//         )
// );

// export const fromRx = Rx.fn<Date | DateTime.DateTime | undefined, Cause.IllegalArgumentException, DateTime.Zoned>(
//     (input, ctx) =>
//         Effect.gen(function* () {
//             const locale = yield* ctx.result(localeRx);
//             const setZone = DateTime.setZone(locale);
//             const now = yield* DateTime.now;

//             const datetime = Function.pipe(
//                 Match.value(input),
//                 Match.when(Predicate.isDate, (d) => DateTime.make(d)),
//                 Match.when(DateTime.isDateTime, (d) => Option.some(d)),
//                 Match.when(Predicate.isUndefined, (_) => Option.some(now)),
//                 Match.exhaustive
//             );

//             if (Option.isNone(datetime)) {
//                 return yield* Effect.fail(new Cause.IllegalArgumentException("Invalid date"));
//             }

//             return setZone(datetime.value);
//         })
// );

// export const untilRx = Rx.fn<Date | DateTime.DateTime | undefined, Cause.IllegalArgumentException, DateTime.Zoned>(
//     (input, ctx) =>
//         Effect.gen(function* () {
//             const locale = yield* ctx.result(localeRx);
//             const setZone = DateTime.setZone(locale);
//             const now = yield* DateTime.now;

//             const datetime = Function.pipe(
//                 Match.value(input),
//                 Match.when(Predicate.isDate, (d) => DateTime.make(d)),
//                 Match.when(DateTime.isDateTime, (d) => Option.some(d)),
//                 Match.when(Predicate.isUndefined, (_) => Option.some(now)),
//                 Match.exhaustive
//             );

//             if (Option.isNone(datetime)) {
//                 return yield* Effect.fail(new Cause.IllegalArgumentException("Invalid date"));
//             }

//             return setZone(datetime.value);
//         })
// );

// export const includeEmptyBucketsRx = Rx.make<true | false>(false);
// export const activeLabelRx = Rx.make<string | undefined>(undefined);
// export const aggregateByRx = Rx.make<Exclude<DateTime.DateTime.UnitPlural, "millis">>("seconds");

// // export const steps2queryRx = Rx.make<HashSet.HashSet<string>>(
// //     HashSet.fromIterable(PipelineStepName)
// // );

// export const rowsRx: Rx.Rx<Result.Result<Array<ResultRow>, Cause.IllegalArgumentException>> = runtime.rx(
//     (ctx) =>
//         Effect.Do.pipe(
//             Effect.bind("from", () => ctx.result(fromRx).pipe(Effect.map(DateTime.toUtc))),
//             Effect.bind("until", () => ctx.result(untilRx).pipe(Effect.map(DateTime.toUtc))),
//             Effect.let("request", ({ from, until }) => new RunsInTimeRangeRequest({ from, until })),
//             Effect.bind("client", () => rpcClient),
//             Effect.flatMap(({ client, request }) => client(request)),
//             Effect.map(Record.values),
//             Effect.map(Array.flatten),
//             //Effect.map(Array.filter(({ pipelineStep }) => HashSet.has(ctx.get(steps2queryRx), pipelineStep)))
//         )
// );

// export const totalsRx = runtime.rx((ctx) =>
//     Effect.gen(function* () {
//         const rows = yield* ctx.result(rowsRx);
//         const total = rows.length;
//         const [failures, successes] = Array.partition(rows, ({ success }) => success);
//         const failureRate = Number.divide(failures.length, total).pipe(Option.getOrElse(() => 0)) * 100;
//         const successRate = Number.divide(successes.length, total).pipe(Option.getOrElse(() => 0)) * 100;
//         return {
//             failedRuns: failures.length,
//             successfulRuns: successes.length,
//             successRate,
//             failureRate,
//             totalRuns: total,
//         };
//     })
// );

// export const timeSeriesGroupedRx = runtime.rx((ctx) =>
//     Effect.gen(function* () {
//         const from = yield* ctx.result(fromRx);
//         const until = yield* ctx.result(untilRx);
//         const rows = yield* ctx.result(rowsRx);
//         const unit = ctx.get(aggregateByRx);
//         const includeEmptyBuckets = ctx.get(includeEmptyBucketsRx);

//         const zeroOutParts = Function.pipe(
//             Match.type<Exclude<DateTime.DateTime.UnitPlural, "millis">>(),
//             Match.when("seconds", () => DateTime.setPartsUtc({ millis: 0 })),
//             Match.when("minutes", () => DateTime.setPartsUtc({ millis: 0, seconds: 0 })),
//             Match.when("hours", () => DateTime.setPartsUtc({ millis: 0, seconds: 0, minutes: 0 })),
//             Match.when("days", () => DateTime.setPartsUtc({ millis: 0, seconds: 0, minutes: 0, hours: 0 })),
//             Match.when("weeks", () => DateTime.setPartsUtc({ millis: 0, seconds: 0, minutes: 0, hours: 0 })),
//             Match.when("months", () => DateTime.setPartsUtc({ millis: 0, seconds: 0, minutes: 0, hours: 0 })),
//             Match.when("years", () => DateTime.setPartsUtc({ millis: 0, seconds: 0, minutes: 0, hours: 0 })),
//             Match.exhaustive
//         );

//         const zeroBy = zeroOutParts(unit);
//         const iterateBy = DateTime.add({ [unit]: 1 });
//         const assignmentFunction = (row: ResultRow) => zeroBy(row.date);
//         const groupingFunc = Function.compose(assignmentFunction, DateTime.formatIso);
//         const groups = Array.groupBy(rows, groupingFunc);

//         const groupsWithAverages = Record.map(groups, (group) => {
//             const [failures, successes] = Array.partition(group, ({ success }) => success);
//             const cumFailTim = Number.sumAll(Array.map(failures, ({ processingTime }) => processingTime));
//             const cumSuccessTime = Number.sumAll(Array.map(successes, ({ processingTime }) => processingTime));
//             const avgFailTime = Number.divide(cumFailTim, failures.length).pipe(Option.getOrElse(() => 0));
//             const avgSuccessTime = Number.divide(cumSuccessTime, successes.length).pipe(Option.getOrElse(() => 0));
//             return {
//                 avgFailTime,
//                 avgSuccessTime,
//                 threshold: 30,
//                 entries: group,
//                 numberFailedRuns: successes.length,
//                 numberSuccessfulRuns: failures.length,
//             };
//         });

//         const emptyBucket = {
//             threshold: 30,
//             avgFailTime: 0,
//             avgSuccessTime: 0,
//             entries: Array.empty<ResultRow>(),
//             numberFailedRuns: 0,
//             numberSuccessfulRuns: 0,
//         };

//         if (!includeEmptyBuckets) {
//             return groupsWithAverages;
//         }

//         const buckets = yield* Function.pipe(
//             Stream.iterate(from, iterateBy),
//             Stream.takeWhile(DateTime.lessThanOrEqualTo(until)),
//             Stream.run(Sink.collectAll()),
//             Effect.map(Chunk.toReadonlyArray),
//             Effect.map(Array.sort(DateTime.Order)),
//             Effect.timeout(Duration.seconds(5)),
//             Effect.orDie
//         );

//         const bucketsWithAverages = Function.pipe(
//             buckets,
//             Array.map((bucketIdentifier) => {
//                 const key = Function.pipe(bucketIdentifier, zeroBy, DateTime.formatIso);
//                 const group = Record.get(groupsWithAverages, key).pipe(Option.getOrElse(() => emptyBucket));
//                 return [key, group] as const;
//             }),
//             Record.fromEntries
//         );

//         return bucketsWithAverages;
//     })
// );

// export const tableDataRx = runtime.rx((ctx) =>
//     Effect.gen(function* () {
//         const activeLabel = ctx.get(activeLabelRx);
//         const timeSeriesData = yield* ctx.result(timeSeriesGroupedRx);

//         const selectedRows = Function.pipe(
//             timeSeriesData,
//             Record.get(activeLabel ?? ""),
//             Option.getOrElse(() => ({ entries: Array.empty<ResultRow>() })),
//             ({ entries }) => entries
//         );

//         const simplifiedRows = selectedRows.map((row) => ({
//             run: row.date,
//             file: row.filepath,
//             message: row.completion,
//             schemaName: row.sourceTable,
//             processingTime: row.processingTime,
//             pipelineStepName: row.pipelineStep,
//         }));

//         return simplifiedRows;
//     })
// );
