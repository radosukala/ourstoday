import { formationTape } from "@/ledger/queries";
import { jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Recent PUBLIC canonical events. INTERNAL/PRIVATE never surface here. */
export async function GET() {
  try {
    const tape = await formationTape(50);
    return jsonOk({ events: tape });
  } catch {
    return jsonOk({ events: [], degraded: true });
  }
}
