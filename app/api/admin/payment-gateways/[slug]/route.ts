import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/auth-guards";
import { getGateway, updateGateway } from "@/lib/admin/payment-gateways";
import type { GatewayStatus } from "@/components/admin/payment-gateways/types";

type Ctx = { params: Promise<{ slug: string }> };

// GET /api/admin/payment-gateways/[slug] — one gateway (secrets masked).
export async function GET(_request: Request, { params }: Ctx) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }
  const { slug } = await params;
  const gateway = await getGateway(slug);
  if (!gateway) return Response.json({ error: "Gateway not found." }, { status: 404 });
  return Response.json({ gateway });
}

function coerceStatus(value: unknown): GatewayStatus | undefined {
  if (value === "active") return "active";
  if (value === "inactive") return "inactive";
  return undefined;
}

function coerceCredentials(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string") out[key] = raw;
  }
  return out;
}

// PUT/PATCH /api/admin/payment-gateways/[slug] — update status + changed credentials.
async function update(request: Request, params: Ctx["params"]) {
  if (!(await getAdminSession())) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const payload = (body ?? {}) as Record<string, unknown>;

  // Reject a present-but-invalid status rather than silently no-op'ing it.
  if (
    payload.status !== undefined &&
    payload.status !== "active" &&
    payload.status !== "inactive"
  ) {
    return Response.json(
      { error: "status must be 'active' or 'inactive'." },
      { status: 400 },
    );
  }

  const result = await updateGateway(slug, {
    status: coerceStatus(payload.status),
    credentials: coerceCredentials(payload.credentials),
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.notFound ? 404 : 400 });
  }

  revalidatePath("/admin/payment-gateways");
  return Response.json({ gateway: result.gateway });
}

export function PUT(request: Request, { params }: Ctx) {
  return update(request, params);
}

export function PATCH(request: Request, { params }: Ctx) {
  return update(request, params);
}
