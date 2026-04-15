"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Read from DOM as fallback (handles browser automation & autofill)
    const emailVal = (document.querySelector('input[type="email"]') as HTMLInputElement)?.value || email;
    const passVal = (document.querySelector('input[type="password"]') as HTMLInputElement)?.value || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: passVal }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Giriş başarısız");
        return;
      }

      // Redirect to dashboard
      router.push("/");
    } catch (err) {
      setError("Bir hata oluştu. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

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
              <LogIn size={24} /> Giriş Yap
            </h2>
            <p className="text-brand-100 text-sm mt-1">Hesabınıza giriş yaparak başlayın</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Adresiniz</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="isim@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-700 text-white font-medium py-3 rounded-lg hover:from-brand-700 hover:to-brand-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Hesabınız yok mu?{" "}
              <Link href="/register" className="text-brand-600 hover:text-brand-700 font-medium">
                Kayıt Ol
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Demo: yavuz@arkhetalent.com / password123</p>
        </div>
      </div>
    </div>
  );
}
