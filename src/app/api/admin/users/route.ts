import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";
import { sendApprovalConfirmEmail } from "@/lib/email";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yavuz@arkhetalent.com";

function isAdmin(req: NextRequest): boolean {
  const userEmail = req.headers.get("x-user-email");
  return userEmail === ADMIN_EMAIL;
}

// GET all users (admin only)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Admin yetkisi gerekli" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: {
      subscription: true,
      _count: { select: { candidates: true, jobs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt,
      isApproved: u.isApproved,
      plan: u.subscription?.plan || "none",
      status: u.subscription?.status || "none",
      expiresAt: u.subscription?.expiresAt,
      maxCandidates: u.subscription?.maxCandidates,
      maxJobs: u.subscription?.maxJobs,
      usedCandidates: u._count.candidates,
      usedJobs: u._count.jobs,
    }))
  );
}

// POST approve or reject a user (admin only)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Admin yetkisi gerekli" }, { status: 403 });
  }

  const { userId, action } = await req.json(); // action: "approve" | "reject"

  if (!userId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isApproved: action === "approve" },
  });

  // Send confirmation email to user on approval
  if (action === "approve") {
    sendApprovalConfirmEmail({
      firstName: user.firstName || user.email,
      email: user.email,
    }).catch((err) => console.error("Approval email error:", err));
  }

  return NextResponse.json({ success: true, userId, action });
}

// PATCH update user subscription (admin only)
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Admin yetkisi gerekli" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, plan, status, expiresAt } = body;

  const planLimits: Record<string, { maxCandidates: number; maxJobs: number; maxTeamMembers: number }> = {
    starter:    { maxCandidates: 20,     maxJobs: 5,      maxTeamMembers: 1 },
    pro:        { maxCandidates: 100,    maxJobs: 20,     maxTeamMembers: 5 },
    enterprise: { maxCandidates: 999999, maxJobs: 999999, maxTeamMembers: 20 },
  };

  const limits = planLimits[plan] || planLimits.starter;

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status: status || "active",
      maxCandidates: limits.maxCandidates,
      maxJobs: limits.maxJobs,
      maxTeamMembers: limits.maxTeamMembers,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    create: {
      userId,
      plan,
      status: status || "active",
      maxCandidates: limits.maxCandidates,
      maxJobs: limits.maxJobs,
      maxTeamMembers: limits.maxTeamMembers,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ success: true, subscription });
}
