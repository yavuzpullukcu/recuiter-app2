import { NextRequest, NextResponse } from "next/server";

/**
 * Extract userId from request (set by middleware)
 */
export function getUserId(req: NextRequest): number | null {
  const userId = req.headers.get("x-user-id");
  return userId ? parseInt(userId) : null;
}

/**
 * Extract email from request (set by middleware)
 */
export function getUserEmail(req: NextRequest): string | null {
  return req.headers.get("x-user-email");
}

/**
 * Check user license limits
 */
export async function checkLicenseLimit(
  prisma: any,
  userId: number,
  resource: "candidates" | "jobs",
  currentCount: number
): Promise<{ allowed: boolean; message?: string }> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return { allowed: false, message: "Abonelik bulunamadı" };
  }

  const maxValue =
    resource === "candidates" ? subscription.maxCandidates : subscription.maxJobs;

  if (currentCount >= maxValue) {
    return {
      allowed: false,
      message: `${resource === "candidates" ? "Aday" : "İş İlanı"} limitinize (${maxValue}) ulaştınız. Planınızı yükseltin.`,
    };
  }

  return { allowed: true };
}

/**
 * Error response helper
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Success response helper
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}
