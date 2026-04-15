import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email ve şifre gereklidir" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email veya şifre hatalı" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Email veya şifre hatalı" },
        { status: 401 }
      );
    }

    // Check approval (skip for admin)
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "yavuz@arkhetalent.com";
    if (!user.isApproved && user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Hesabınız henüz onaylanmadı. Admin onayı bekleniyor.", pendingApproval: true },
        { status: 403 }
      );
    }

    // Check subscription status
    if (!user.subscription || user.subscription.status !== "active") {
      return NextResponse.json(
        { error: "Aboneliğiniz aktif değil. Lütfen iletişime geçin." },
        { status: 403 }
      );
    }

    // Create token
    const token = createToken(user.id, user.email);

    const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscription: {
            plan: user.subscription.plan,
            maxCandidates: user.subscription.maxCandidates,
            maxJobs: user.subscription.maxJobs,
          },
        },
      },
      { status: 200 }
    );

    response.cookies.set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Giriş işlemi başarısız oldu" },
      { status: 500 }
    );
  }
}
