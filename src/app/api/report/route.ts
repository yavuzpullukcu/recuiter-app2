import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") || "tr";
  const de = lang === "de";

  const [candidates, assignments, contracts, jobs] = await Promise.all([
    prisma.candidate.findMany({ where: { userId } }),
    prisma.assignment.findMany({ where: { userId }, include: { candidate: true, project: { include: { company: true } } } }),
    prisma.contract.findMany({ where: { assignment: { userId } }, include: { assignment: { include: { candidate: true, project: { include: { company: true } } } } } }),
    prisma.job.findMany({ where: { userId }, include: { _count: { select: { candidates: true } } } }),
  ]);

  const total = candidates.length;
  const placed = candidates.filter((c) => c.status === "placed").length;
  const interview = candidates.filter((c) => c.status === "interview").length;
  const contacted = candidates.filter((c) => c.status === "contacted").length;
  const newCount = candidates.filter((c) => c.status === "new").length;
  const activeContracts = contracts.filter((c) => new Date(c.endDate) >= new Date());

  // Role distribution
  const roleCounts: Record<string, number> = {};
  candidates.forEach((c) => {
    const role = c.title || (de ? "Nicht angegeben" : "Belirtilmemiş");
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  const today = new Date().toLocaleDateString(de ? "de-DE" : "tr-TR", { year: "numeric", month: "long", day: "numeric" });
  const reportTitle = de ? "IT Nearshore Personalvermittlung – Bericht" : "IT Nearshore İşe Alım – Raporu";

  const statusRows = [
    [de ? "Neu" : "Yeni", newCount],
    [de ? "Kontaktiert" : "İletişimde", contacted],
    [de ? "Vorstellungsgespräch" : "Mülakat", interview],
    [de ? "Platziert" : "Yerleştirildi", placed],
    [de ? "Gesamt" : "Toplam", total],
  ];

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${reportTitle}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa; color: #1a1a2e; }
  .page { max-width: 900px; margin: 0 auto; padding: 40px; background: white; min-height: 100vh; }

  .header { background: linear-gradient(135deg, #00546f 0%, #00546f 50%, #1778bd 100%); color: white; padding: 36px 40px; border-radius: 16px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
  .header-left p { font-size: 13px; opacity: 0.75; }
  .header-right { text-align: right; }
  .header-right .logo { height: 40px; max-width: 200px; object-fit: contain; object-position: right; filter: brightness(0) invert(1); margin-bottom: 8px; }
  .header-right .date { font-size: 11px; opacity: 0.6; margin-top: 4px; }

  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card { background: white; border: 1px solid #e8ecf0; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .stat-card .value { font-size: 36px; font-weight: 800; color: #00546f; line-height: 1; margin-bottom: 6px; }
  .stat-card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .stat-card.accent { background: linear-gradient(135deg, #00546f, #1778bd); color: white; }
  .stat-card.accent .value { color: white; }
  .stat-card.accent .label { color: rgba(255,255,255,0.7); }
  .stat-card.green .value { color: #1778bd; }
  .stat-card.amber .value { color: #d97706; }

  .section { margin-bottom: 28px; }
  .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; border-bottom: 2px solid #e8ecf0; padding-bottom: 8px; margin-bottom: 16px; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #00546f; color: white; }
  thead th { padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  tbody tr:nth-child(even) { background: #f8f9fa; }
  tbody tr:hover { background: #e3f2f8; }
  tbody td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #e8ecf0; }

  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-gray { background: #f3f4f6; color: #374151; }

  .role-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
  .role-bar { display: flex; align-items: center; gap: 10px; flex: 1; }
  .role-bar .bar { height: 8px; border-radius: 4px; background: linear-gradient(90deg, #00546f, #1778bd); min-width: 4px; }
  .role-name { font-size: 13px; color: #374151; }
  .role-count { font-size: 13px; font-weight: 700; color: #00546f; background: #e3f2f8; padding: 2px 10px; border-radius: 10px; }

  .contract-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
  .contract-name { font-weight: 600; font-size: 14px; color: #1a1a2e; }
  .contract-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .contract-date { font-size: 12px; font-weight: 600; color: #059669; }

  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8ecf0; color: #9ca3af; font-size: 11px; }

  @media print {
    body { background: white; }
    .page { padding: 20px; box-shadow: none; }
    .print-btn { display: none; }
  }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #1778bd; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 100; }
  .print-btn:hover { background: #00546f; }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">⬇ ${de ? "PDF speichern" : "PDF Kaydet"}</button>
<div class="page">

  <div class="header">
    <div class="header-left">
      <h1>${reportTitle}</h1>
      <p>${de ? "Umfassender Überblick über Kandidaten, Verträge und Projekte" : "Adaylar, kontratlar ve projeler kapsamlı genel bakış"}</p>
    </div>
    <div class="header-right">
      <img src="/arkhetalent-logo.svg" alt="Arkhetalent" class="logo" />
      <div class="date">${today}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card accent">
      <div class="value">${total}</div>
      <div class="label">${de ? "Kandidaten gesamt" : "Toplam Aday"}</div>
    </div>
    <div class="stat-card green">
      <div class="value">${placed}</div>
      <div class="label">${de ? "Platziert" : "Yerleştirildi"}</div>
    </div>
    <div class="stat-card amber">
      <div class="value">${interview}</div>
      <div class="label">${de ? "Im Interview" : "Mülakata"}</div>
    </div>
    <div class="stat-card">
      <div class="value">${activeContracts.length}</div>
      <div class="label">${de ? "Aktive Verträge" : "Aktif Kontrat"}</div>
    </div>
  </div>

  <div class="two-col">
    <div class="section">
      <div class="section-title">${de ? "Status-Verteilung" : "Durum Dağılımı"}</div>
      <table>
        <thead><tr><th>${de ? "Status" : "Durum"}</th><th>${de ? "Anzahl" : "Adet"}</th><th>%</th></tr></thead>
        <tbody>
          ${statusRows.map(([label, count]) => `
          <tr>
            <td>${label}</td>
            <td><strong>${count}</strong></td>
            <td>${total ? Math.round((Number(count) / total) * 100) : 0}%</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">${de ? "Stellenverteilung" : "Pozisyon Dağılımı"}</div>
      ${Object.entries(roleCounts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([role, count]) => `
        <div class="role-row">
          <div class="role-bar">
            <div class="bar" style="width:${Math.round((count / total) * 140)}px"></div>
            <span class="role-name">${role}</span>
          </div>
          <span class="role-count">${count}</span>
        </div>
      `).join("")}
    </div>
  </div>

  ${activeContracts.length > 0 ? `
  <div class="section">
    <div class="section-title">${de ? "Aktive Verträge" : "Aktif Kontratlar"} (${activeContracts.length})</div>
    ${activeContracts.slice(0, 10).map((ct) => {
      const daysLeft = Math.ceil((new Date(ct.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const badgeClass = daysLeft <= 7 ? "badge-red" : daysLeft <= 30 ? "badge-amber" : "badge-green";
      const badgeText = daysLeft <= 0 ? (de ? "Abgelaufen" : "Süresi Doldu") : `${daysLeft} ${de ? "Tage" : "gün"}`;
      return `
      <div class="contract-card">
        <div>
          <div class="contract-name">${ct.assignment.candidate.name}</div>
          <div class="contract-meta">${ct.assignment.project.company.name} · ${ct.assignment.project.name}</div>
        </div>
        <div style="text-align:right">
          <div class="badge ${badgeClass}">${badgeText}</div>
          <div class="contract-date" style="margin-top:4px">${new Date(ct.endDate).toLocaleDateString(de ? "de-DE" : "tr-TR")}</div>
        </div>
      </div>`;
    }).join("")}
  </div>` : ""}

  ${jobs.length > 0 ? `
  <div class="section">
    <div class="section-title">${de ? "Aktive Stellenanzeigen" : "Aktif İş İlanları"}</div>
    <table>
      <thead><tr>
        <th>${de ? "Titel" : "Başlık"}</th>
        <th>${de ? "Unternehmen" : "Şirket"}</th>
        <th>${de ? "Kandidaten" : "Aday"}</th>
        <th>${de ? "Status" : "Durum"}</th>
      </tr></thead>
      <tbody>
        ${jobs.filter((j) => j.status === "active").slice(0, 10).map((j) => `
        <tr>
          <td><strong>${j.title}</strong></td>
          <td>${j.company || "-"}</td>
          <td>${(j as any)._count?.candidates || 0}</td>
          <td><span class="badge badge-green">${de ? "Aktiv" : "Aktif"}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <div class="footer">
    <strong>Arkhetalent</strong> · IT Nearshore Recruitment CRM · ${today}
  </div>
</div>
<script>
  // Auto-trigger print dialog if ?print=1
  if (new URLSearParams(window.location.search).get('print') === '1') {
    window.onload = () => setTimeout(() => window.print(), 500);
  }
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
