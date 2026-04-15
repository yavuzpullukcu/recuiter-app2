"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Download, RotateCcw, AlertTriangle, TrendingUp,
  Users, Building2, CreditCard, UserX
} from "lucide-react";
import DonutChart, { getDonutColor } from "./DonutChart";

interface Contract {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  contractFile?: string;
  renewalCount: number;
  assignment: {
    id: number;
    weeklyHours: number;
    hourlyRate: number;
    currency: string;
    candidate: { id: number; name: string; type: string; title: string | null };
    project: { id: number; name: string; company: { id: number; name: string } };
  };
}

interface CandidateStats {
  total: number;
  internal: number;
  external: number;
  assigned: number;
  unassigned: number;
  roles: { role: string; count: number; color: string }[];
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string, de = false) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(de ? "de-DE" : "tr-TR");
}

const PIPELINE_STATUS_STYLES: Record<string, string> = {
  "İşe Yerleşti":      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "Teklif Yapıldı":    "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "Final Mülakatı":    "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  "Teknik Test Aşaması": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "1. Mülakat Planlandı": "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  "Olumsuz / Red":     "bg-red-50 text-red-600 ring-1 ring-red-200",
};

function PipelineStatusBadge({ status }: { status?: string | null }) {
  const s = status || "CV Gönderildi";
  const cls = PIPELINE_STATUS_STYLES[s] || "bg-gray-100 text-gray-600 ring-1 ring-gray-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {s}
    </span>
  );
}

export default function StaffingDashboard({ locale = "tr" }: { locale?: string }) {
  const de = locale === "de";
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [contractsRes, candidatesRes, assignmentsRes] = await Promise.all([
        fetch("/api/contracts"),
        fetch("/api/candidates"),
        fetch("/api/assignments"),
      ]);
      const contractsData = await contractsRes.json();
      const candidatesData = await candidatesRes.json();
      const assignmentsData = await assignmentsRes.json();

      setContracts(contractsData);
      setAssignments(assignmentsData);

      const assignedIds = new Set(assignmentsData.map((a: any) => a.candidateId));
      const roleCounts: Record<string, number> = {};
      candidatesData.forEach((c: any) => {
        const role = c.title || "Belirtilmemiş";
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
      const roles = Object.entries(roleCounts)
        .map(([role, count], i) => ({ role, count, color: getDonutColor(i) }))
        .sort((a, b) => b.count - a.count);

      setStats({
        total: candidatesData.length,
        internal: candidatesData.filter((c: any) => c.type === "internal").length,
        external: candidatesData.filter((c: any) => c.type !== "internal").length,
        assigned: assignedIds.size,
        unassigned: candidatesData.length - assignedIds.size,
        roles,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRenew = async (contractId: number) => {
    await fetch(`/api/contracts/${contractId}`, { method: "PUT" });
    fetchData();
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    if (!confirm(de ? "Zuweisung wirklich entfernen?" : "Bu atamayı kaldırmak istediğinize emin misiniz?")) return;
    await fetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
    fetchData();
  };

  const handleExportPDF = () => window.open(`/api/report?lang=${locale}`, "_blank");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-400">
        Yükleniyor...
      </div>
    );
  }

  const activeContracts = contracts.filter((c) => daysUntil(c.endDate) >= 0);
  const expiringContracts = contracts.filter((c) => { const d = daysUntil(c.endDate); return d >= 0 && d <= 30; });
  const expiredContracts = contracts.filter((c) => daysUntil(c.endDate) < 0);

  const statItems = [
    { label: de ? "Kandidaten gesamt" : "Toplam Aday", value: stats?.total ?? 0, icon: Users, color: "text-[#045b7c]", bg: "bg-[#045b7c]/8" },
    { label: de ? "In Prozessen" : "Aktif Süreçler", value: stats?.assigned ?? 0, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: de ? "Intern" : "Dahili Ekip", value: stats?.internal ?? 0, icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
    { label: de ? "Nearshore Pool" : "Nearshore Havuzu", value: stats?.external ?? 0, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-5">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {statItems.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon size={16} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900 leading-none mb-0.5">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pipeline Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {de ? "Bewerber Pipeline" : "Aday Gönderim & Süreç Takibi"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{assignments.length} aktif süreç</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{de ? "Kandidat" : "Aday"}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{de ? "Projekt" : "Firma / Proje"}</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{de ? "Kontakt" : "İrtibat"}</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{de ? "Status" : "Durum"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
                    Henüz bir aday gönderim kaydı bulunamadı.
                  </td>
                </tr>
              ) : assignments.map((as: any) => (
                <tr key={as.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#045b7c]/10 text-[#045b7c] flex items-center justify-center text-xs font-semibold shrink-0">
                        {as.candidate?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{as.candidate?.name}</p>
                        <p className="text-xs text-gray-400">{as.candidate?.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-gray-700">{as.project?.name}</p>
                    <p className="text-xs text-gray-400">{as.project?.company?.name}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-gray-700">{as.contactPerson || "—"}</p>
                    <p className="text-xs text-gray-400">{as.contactTitle || "HR / Yetkili"}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <PipelineStatusBadge status={as.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Donut */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {de ? "Rollenverteilung" : "Pozisyon Dağılımı"}
          </h3>
          <div className="flex items-center gap-5">
            <DonutChart
              segments={(stats?.roles || []).map((r) => ({ label: r.role, count: r.count, color: r.color }))}
              size={140}
            />
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {(stats?.roles || []).slice(0, 6).map((r) => (
                <div key={r.role} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-xs text-gray-600 truncate flex-1">{r.role}</span>
                  <span className="text-xs font-medium text-gray-900">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Role density */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {de ? "Detaillierte Liste" : "Rol Yoğunluğu"}
            </h3>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={12} />
              {de ? "Bericht" : "Rapor"}
            </button>
          </div>
          <div className="space-y-2">
            {(stats?.roles || []).map((r) => {
              const pct = stats ? Math.round((r.count / stats.total) * 100) : 0;
              return (
                <div key={r.role} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-28 truncate">{r.role}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: r.color }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-6 text-right">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Contract Warnings (only if data exists) ── */}
      {(expiringContracts.length > 0 || expiredContracts.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {expiringContracts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-900">
                  {de ? `Verlängerung fällig (${expiringContracts.length})` : `Yaklaşan Bitiş (${expiringContracts.length})`}
                </h3>
              </div>
              <div className="space-y-2">
                {expiringContracts.map((ct) => {
                  const d = daysUntil(ct.endDate);
                  return (
                    <div key={ct.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ct.assignment.candidate.name}</p>
                        <p className="text-xs text-gray-400">{ct.assignment.project.company.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d <= 7 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                          {d}g
                        </span>
                        <button onClick={() => handleRenew(ct.id)} className="p-1.5 bg-[#045b7c] text-white rounded-lg hover:bg-[#03455e] transition-colors">
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {expiredContracts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserX size={14} className="text-red-600" />
                <h3 className="text-sm font-semibold text-red-900">
                  {de ? `Abgelaufen (${expiredContracts.length})` : `Süresi Doldu (${expiredContracts.length})`}
                </h3>
              </div>
              <div className="space-y-2">
                {expiredContracts.map((ct) => (
                  <div key={ct.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ct.assignment.candidate.name}</p>
                      <p className="text-xs text-gray-400">{ct.assignment.project.company.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRenew(ct.id)} className="px-2.5 py-1 bg-[#045b7c] text-white text-xs font-medium rounded-lg hover:bg-[#03455e] transition-colors">
                        Yenile
                      </button>
                      <button onClick={() => handleRemoveAssignment(ct.assignment.id)} className="px-2.5 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors">
                        Kaldır
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Active Contracts Table (only if data exists) ── */}
      {activeContracts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {de ? "Aktive Verträge" : "Aktif Finansal Kontratlar"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Yerleşen adayların kayıtları</p>
            </div>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={12} />
              {de ? "Bericht" : "Finans Raporu"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Danışman</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Firma</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Bitiş</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Dosya</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeContracts.map((ct) => {
                  const d = daysUntil(ct.endDate);
                  return (
                    <tr key={ct.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-semibold">
                            {ct.assignment.candidate.name[0]}
                          </div>
                          <span className="font-medium text-gray-900">{ct.assignment.candidate.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-gray-700">{ct.assignment.project.company.name}</p>
                        <p className="text-xs text-gray-400">{ct.assignment.project.name}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">{formatDate(ct.endDate, de)}</td>
                      <td className="px-5 py-3 text-center">
                        {ct.contractFile ? (
                          <a href={ct.contractFile} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#045b7c] border border-[#045b7c]/20 rounded-lg hover:bg-[#045b7c]/5 transition-colors">
                            <Download size={11} /> İndir
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${d <= 30 ? "bg-red-50 text-red-600 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}>
                          {d <= 0 ? "Süresi Doldu" : d <= 30 ? `${d}g kaldı` : "Aktif"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
