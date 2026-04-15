"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    plan: "starter",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.email || !formData.password) {
      setError("Email ve şifre gereklidir");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    if (formData.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          plan: formData.plan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kayıt başarısız");
        return;
      }

      // Show pending approval screen
      if (data.pendingApproval) {
        setRegistered(true);
        return;
      }
      router.push("/");
    } catch (err) {
      setError("Bir hata oluştu. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-gray-50 to-brand-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Kayıt Başarılı! 🎉</h2>
          <p className="text-gray-600 mb-2">
            Başvurunuz alındı. Hesabınız admin onayından sonra aktif olacak.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Onaylandığında email adresinize bildirim gönderilecek.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors"
          >
            Giriş Sayfasına Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-gray-50 to-brand-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/arkhetalent-logo.svg"
            alt="Arkhetalent"
            className="h-12 mx-auto mb-4"
            style={{ filter: "brightness(0) invert(1)", mixBlendMode: "screen" }}
          />
          <h1 className="text-3xl font-bold text-gray-900">Arkhetalent</h1>
          <p className="text-sm text-gray-500 mt-1">IT Nearshore Recruitment CRM</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <UserPlus size={24} /> Kayıt Ol
            </h2>
            <p className="text-brand-100 text-sm mt-1">Yeni bir hesap oluşturun</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Yavuz"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Pullukcu"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Adresiniz</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="isim@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            {/* Plan selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan Seçin</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "starter", label: "Starter", price: "€29" },
                  { id: "pro", label: "Pro", price: "€99" },
                  { id: "enterprise", label: "Enterprise", price: "€299" },
                ].map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, plan: plan.id })}
                    className={`p-3 rounded-lg text-center transition-all ${
                      formData.plan === plan.id
                        ? "bg-brand-100 border-2 border-brand-600"
                        : "bg-gray-50 border-2 border-gray-200 hover:border-brand-300"
                    }`}
                  >
                    <div className="font-semibold text-sm text-gray-900">{plan.label}</div>
                    <div className="text-xs text-gray-500">{plan.price}/mo</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Şifreyi Onayla</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white font-medium py-3 rounded-lg hover:from-brand-700 hover:to-brand-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Zaten hesabınız var mı?{" "}
              <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
                Giriş Yap
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
