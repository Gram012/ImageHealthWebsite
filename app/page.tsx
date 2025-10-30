import ClientDashboard from "@/components/Dashboard";

export default async function Page() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/get-data`);
    const rows = (await res.json()) ?? [];
    return <ClientDashboard initialRows={rows} />;
}
