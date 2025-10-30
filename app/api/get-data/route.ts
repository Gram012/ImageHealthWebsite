import { getTableData } from "@/services/Database";

export async function GET() {
    try {
        const rows = await getTableData();
        return new Response(JSON.stringify(rows), { status: 200 });
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify([]), { status: 500 });
    }
}
