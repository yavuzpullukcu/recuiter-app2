"use client";
import { useState, useEffect } from "react";
import { Users, Crown, ShieldCheck, AlertTriangle, RefreshCw, Check, X, Clock, UserCheck, UserX } from "lucide-react";

interface UserRow {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  isApproved: boolean;
  plan: string;
  status: string;
  expiresAt?: string;
  maxCandidates: number;
  maxJobs: number;
  usedCandidates: number;
  usedJobs: number;
}

const PLAN_COLORS: Record<string, string> = {
  starter:    "bg-gray-100 text-gray-700",
  pro:        "bg-brand-100 text-brand-700",
  enterprise: "bg-purple-100 text-purple-700",
  none:       "bg-red-100 text-red-600",
};

const PLAN_ICON: Record<string, string> = {
  starter: "⭐", pro: "🚀", enterprise: "👑", none: "—",
};

type Tab = "pending" | "all";

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 403) { setError("Bu sayfaya erişim yetkiniz yok."); return; }
      const data = await res.json();
      setUsers(data);
    } catch { setError("Veri yüklenemedi."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUsers();
    // Auto-switch to "all" tab if no pending users after load
  }, []);

  // Check URL param for quick approval link from email
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const approveId = params.get("approve");
    if (approveId) {
      handleApproval(parseInt(approveId), "approve");
      window.history.replaceState({}, "", "/admin");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSavePlan = async (userId: number, plan: string, status: string, expiresAt: string) => {
    setSaving(true);
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan, status, expiresAt }),
      });
      setEditingUser(null);
      fetchUsers();
    } finally { setSaving(false); }
  };

  const handleApproval = async (userId: number, action: "approve" | "reject") => {
    setApprovingId(userId);
    try {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      fetchUsers();
    } finally { setApprovingId(null); }
  };

  const pendingUsers = users.filter((u) => !u.isApproved);
  const approvedUsers = users.filter((u) => u.isApproved);

  const totalRevenue = approvedUsers.reduce((sum, u) => {
    if (u.status !== "active") return sum;
    return sum + (u.plan === "pro" ? 99 : u.plan === "enterprise" ? 299 : 29);
  }, 0);

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow border text-center max-w-md">
        <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Erişim Reddedildi</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-500">Lisans & Kullanıcı Yönetimi</p>
            </div>
          </div>
          <button onClick={fetchUsers} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} /> Yenile
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Toplam Kullanıcı", value: users.length, icon: Users, color: "text-brand-600 bg-brand-50" },
            { label: "Onay Bekleyen", value: pendingUsers.length, icon: Clock, color: pendingUsers.length > 0 ? "text-orange-600 bg-orange-50" : "text-gray-400 bg-gray-50" },
            { label: "Pro / Enterprise", value: approvedUsers.filter(u => ["pro","enterprise"].includes(u.plan)).length, icon: Crown, color: "text-purple-600 bg-purple-50" },
            { label: "Tahmini Gelir/Ay", value: `€${totalRevenue}`, icon: ShieldCheck, color: "text-brand-800 bg-brand-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                <s.icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setTab("pending")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                tab === "pending"
                  ? "text-brand-600 border-b-2 border-brand-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Clock size={14} />
              Onay Bekleyenler
              {pendingUsers.length > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {pendingUsers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("all")}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                tab === "all"
                  ? "text-brand-600 border-b-2 border-brand-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users size={14} />
              Tüm Kullanıcılar ({approvedUsers.length})
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400">Yükleniyor...</div>
          ) : tab === "pending" ? (
            /* ── PENDING APPROVALS ── */
            pendingUsers.length === 0 ? (
              <div className="p-12 text-center">
                <UserCheck size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Bekleyen onay yok</p>
                <p className="text-xs text-gray-300 mt-1">Yeni kayıtlar burada görünecek</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">Kullanıcı</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Kayıt Tarihi</th>
                    <th className="px-6 py-3 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pendingUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                            {(u.firstName || u.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : "—"}
                            </div>
                            <div className="text-xs text-orange-500 font-medium">Onay Bekliyor</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(u.createdAt).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApproval(u.id, "approve")}
                            disabled={approvingId === u.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <UserCheck size={13} />
                            Onayla
                          </button>
                          <button
                            onClick={() => handleApproval(u.id, "reject")}
                            disabled={approvingId === u.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <UserX size={13} />
                            Reddet
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            /* ── ALL APPROVED USERS ── */
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-6 py-3 text-left">Kullanıcı</th>
                  <th className="px-6 py-3 text-left">Plan</th>
                  <th className="px-6 py-3 text-left">Durum</th>
                  <th className="px-6 py-3 text-left">Kullanım</th>
                  <th className="px-6 py-3 text-left">Bitiş</th>
                  <th className="px-6 py-3 text-left">Kayıt</th>
                  <th className="px-6 py-3 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {approvedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-sm">
                        {u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : "—"}
                      </div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${PLAN_COLORS[u.plan]}`}>
                        {PLAN_ICON[u.plan]} {u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.status === "active" ? "bg-green-100 text-green-700" :
                        u.status === "paused" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-600"
                      }`}>
                        {u.status === "active" ? "✓ Aktif" : u.status === "paused" ? "⏸ Durduruldu" : "✗ İptal"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">{u.usedCandidates}</span>/{u.maxCandidates} aday
                      </div>
                      <div className="text-xs text-gray-400">
                        <span className="font-medium">{u.usedJobs}</span>/{u.maxJobs} ilan
                      </div>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${Math.min(100, (u.usedCandidates / u.maxCandidates) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {u.expiresAt ? new Date(u.expiresAt).toLocaleDateString("tr-TR") : "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-700 transition-colors"
                      >
                        Plan Düzenle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <EditPlanModal
          user={editingUser}
          onSave={handleSavePlan}
          onClose={() => setEditingUser(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

function EditPlanModal({ user, onSave, onClose, saving }: {
  user: UserRow;
  onSave: (userId: number, plan: string, status: string, expiresAt: string) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [plan, setPlan] = useState(user.plan === "none" ? "starter" : user.plan);
  const [status, setStatus] = useState(user.status === "none" ? "active" : user.status);
  const [expiresAt, setExpiresAt] = useState(
    user.expiresAt ? new Date(user.expiresAt).toISOString().split("T")[0] : ""
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-gray-900">Plan Düzenle</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Kullanıcı</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "starter", label: "Starter", price: "€29/mo" },
                { id: "pro", label: "Pro", price: "€99/mo" },
                { id: "enterprise", label: "Enterprise", price: "€299/mo" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={`p-3 rounded-lg text-center border-2 transition-all ${
                    plan === p.id ? "border-brand-600 bg-brand-50" : "border-gray-200 hover:border-brand-300"
                  }`}
                >
                  <div className="font-semibold text-sm">{p.label}</div>
                  <div className="text-xs text-gray-500">{p.price}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lisans Durumu</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none">
              <option value="active">✓ Aktif</option>
              <option value="paused">⏸ Durduruldu</option>
              <option value="cancelled">✗ İptal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lisans Bitiş Tarihi</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 rounded-lg text-sm hover:bg-gray-100">İptal</button>
          <button
            onClick={() => onSave(user.id, plan, status, expiresAt)}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Check size={14} /> {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
