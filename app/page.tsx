import { getTableData } from "@/services/Database";
import ClientDashboard from "@/components/Dashboard";

export default async function Page() {
    const rows = await getTableData(); // runs on server
    return <ClientDashboard initialRows={rows} />;
}
