import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendApprovalRequestEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, plan = "starter" } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email ve şifre gereklidir" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email zaten kayıtlı" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName || "",
        lastName: lastName || "",
        isApproved: false, // Requires admin approval
        subscription: {
          create: {
            plan: plan || "starter",
            maxCandidates: plan === "pro" ? 100 : plan === "enterprise" ? 999999 : 20,
            maxJobs: plan === "pro" ? 20 : plan === "enterprise" ? 999999 : 5,
            maxTeamMembers: plan === "pro" ? 5 : plan === "enterprise" ? 20 : 1,
            status: "active",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: { subscription: true },
    });

    // Notify admin via email (fire and forget — don't block response)
    sendApprovalRequestEmail({
      id: user.id,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
    }).catch((err) => console.error("Email send error:", err));

    return NextResponse.json(
      {
        message:
          "Kayıt başarılı! Hesabınız admin onayından sonra aktif olacak. Onay mailini bekleyin.",
        pendingApproval: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Kayıt işlemi başarısız oldu" },
      { status: 500 }
    );
  }
}
