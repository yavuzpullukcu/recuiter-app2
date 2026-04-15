"use client";
import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Clock, Users, Briefcase, ArrowLeft, Crown, Zap, Star } from "lucide-react";

interface UserData {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  plan: string;
  subscription: {
    plan?: string;
    maxCandidates?: number;
    maxJobs?: number;
    status?: string;
    expiresAt?: string;
  };
  usage: {
    candidates: number;
    jobs: number;
  };
}

const PLAN_DETAILS: Record<string, { label: string; icon: React.ElementType; color: string; price: string; features: string[] }> = {
  starter: {
    label: "Starter",
    icon: Star,
    color: "text-gray-600 bg-gray-100",
    price: "€29/ay",
    features: ["20 aday profili", "5 iş ilanı", "1 kullanıcı", "CV yönetimi", "LinkedIn arama"],
  },
  pro: {
    label: "Pro",
    icon: Zap,
    color: "text-brand-600 bg-brand-100",
    price: "€99/ay",
    features: ["100 aday profili", "20 iş ilanı", "5 kullanıcı", "CV yönetimi", "LinkedIn arama", "Rapor & Export", "Firma & Proje Yönetimi"],
  },
  enterprise: {
    label: "Enterprise",
    icon: Crown,
    color: "text-purple-600 bg-purple-100",
    price: "€299/ay",
    features: ["Sınırsız aday", "Sınırsız iş ilanı", "20 kullanıcı", "Tüm özellikler", "Öncelikli destek", "Özel entegrasyonlar"],
  },
};

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={`font-semibold ${isAtLimit ? "text-red-600" : isNearLimit ? "text-amber-600" : "text-gray-800"}`}>
          {used} / {max === 999999 ? "∞" : max}
        </span>
      </div>
      {max < 999999 && (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-400" : "bg-brand-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {max < 999999 && (
        <p className="text-xs text-gray-400">{max - used > 0 ? `${max - used} adet daha ekleyebilirsiniz` : "Limite ulaştınız"}</p>
      )}
    </div>
  );
}

export default function LicensePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { if (data?.user) setUserData(data.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Yükleniyor...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Oturum bulunamadı.</div>
      </div>
    );
  }

  const plan = userData.subscription?.plan || userData.plan || "starter";
  const planInfo = PLAN_DETAILS[plan] || PLAN_DETAILS.starter;
  const PlanIcon = planInfo.icon;
  const status = userData.subscription?.status || "none";
  const expiresAt = userData.subscription?.expiresAt;
  const maxCandidates = userData.subscription?.maxCandidates ?? 20;
  const maxJobs = userData.subscription?.maxJobs ?? 5;

  const daysLeft = expiresAt
    ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const statusConfig = {
    active: { label: "Aktif", icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200" },
    paused: { label: "Durduruldu", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
    cancelled: { label: "İptal Edildi", icon: AlertCircle, color: "text-red-600 bg-red-50 border-red-200" },
    none: { label: "Lisans Yok", icon: AlertCircle, color: "text-gray-500 bg-gray-50 border-gray-200" },
  }[status] || { label: status, icon: AlertCircle, color: "text-gray-500 bg-gray-50 border-gray-200" };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} /> Geri
          </a>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${planInfo.color}`}>
            <PlanIcon size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lisansım</h1>
            <p className="text-sm text-gray-500">Abonelik ve kullanım detayları</p>
          </div>
        </div>

        {/* Plan Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${planInfo.color}`}>
                    <PlanIcon size={14} /> {planInfo.label}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
                    <StatusIcon size={12} /> {statusConfig.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{planInfo.price}</p>
              </div>
              <div className="text-right">
                {expiresAt && daysLeft !== null && (
                  <div>
                    <p className="text-xs text-gray-400">Bitiş tarihi</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {new Date(expiresAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className={`text-xs mt-0.5 font-medium ${daysLeft <= 7 ? "text-red-500" : daysLeft <= 30 ? "text-amber-500" : "text-brand-600"}`}>
                      {daysLeft > 0 ? `${daysLeft} gün kaldı` : "Süresi doldu"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Usage meters */}
          <div className="px-6 py-5 space-y-5">
            <h3 className="text-sm font-semibold text-gray-700">Kullanım</h3>
            <UsageBar
              used={userData.usage.candidates}
              max={maxCandidates}
              label="Aday Profilleri"
            />
            <UsageBar
              used={userData.usage.jobs}
              max={maxJobs}
              label="İş İlanları"
            />
          </div>
        </div>

        {/* Plan features */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Planınıza dahil olanlar</h3>
          <ul className="space-y-2.5">
            {planInfo.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                <CheckCircle size={15} className="text-brand-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Upgrade CTA (shown if not on enterprise) */}
        {plan !== "enterprise" && (
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">Daha fazlasına mı ihtiyacınız var?</h3>
                <p className="text-sm text-brand-100 mb-4">
                  {plan === "starter"
                    ? "Pro plana geçerek 100 aday, 20 ilan ve çok daha fazlasına erişin."
                    : "Enterprise plana geçerek sınırsız aday ve özel destek alın."}
                </p>
                <a
                  href="mailto:yavuz@arkhetalent.com?subject=Plan Yükseltme Talebi"
                  className="inline-flex items-center gap-2 bg-white text-brand-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  <Crown size={14} />
                  {plan === "starter" ? "Pro'ya Yükselt" : "Enterprise'a Geç"}
                </a>
              </div>
              <div className="text-brand-300 hidden sm:block">
                <Crown size={48} />
              </div>
            </div>
          </div>
        )}

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Hesap Bilgileri</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Ad Soyad</span>
              <span className="text-sm font-medium text-gray-800">
                {userData.firstName ? `${userData.firstName} ${userData.lastName || ""}`.trim() : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">E-posta</span>
              <span className="text-sm font-medium text-gray-800">{userData.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Lisans ID</span>
              <span className="text-xs font-mono text-gray-400">#{userData.id}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              Lisans değişikliği veya fatura için{" "}
              <a href="mailto:yavuz@arkhetalent.com" className="text-brand-600 hover:underline">yavuz@arkhetalent.com</a>{" "}
              adresine yazabilirsiniz.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
