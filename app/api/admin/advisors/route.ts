import { NextResponse } from "next/server";
import { requireAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { z } from "zod";

const createAdvisorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required"),
  title: z.string().min(1, "Title is required"),
  phone: z.string().nullable().optional(),
});

export async function GET() {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const allAdvisors = await storage.getAllAdvisors();
    const advisorData = await Promise.all(
      allAdvisors.map(async (adv) => {
        const advClients = await storage.getClients(adv.id);
        let totalAum = 0;
        for (const c of advClients) {
          const accts = await storage.getAccountsByClient(c.id);
          totalAum += accts.reduce((sum, a) => sum + parseFloat(a.balance as string), 0);
        }
        return { ...adv, clientCount: advClients.length, totalAum };
      })
    );
    return NextResponse.json(advisorData);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdvisor();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = createAdvisorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const advisor = await storage.createAdvisor({
      name: parsed.data.name,
      email: parsed.data.email,
      title: parsed.data.title,
      phone: parsed.data.phone || null,
    });
    return NextResponse.json(advisor);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
