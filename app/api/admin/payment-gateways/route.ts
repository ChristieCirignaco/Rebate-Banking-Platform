import { getAdminSession } from "@/lib/auth-guards";
import { getGateways } from "@/lib/admin/payment-gateways";

// GET /api/admin/payment-gateways — list the configured gateways (secrets masked).
export async function GET() {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }
  const gateways = await getGateways();
  return Response.json({ gateways });
}
