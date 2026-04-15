"use client";

interface Segment {
  label: string;
  count: number;
  color: string;
}

const COLORS = [
  "#4f46e5", "#059669", "#d97706", "#dc2626", "#db2777",
  "#7c3aed", "#0d9488", "#ea580c", "#65a30d", "#6b7280",
];

export function getDonutColor(index: number) {
  return COLORS[index % COLORS.length];
}

export default function DonutChart({ segments, size = 200 }: { segments: Segment[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ width: size, height: size }}>
        Veri yok
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const strokeW = size * 0.17;

  // Special case: single segment = full circle (SVG arc can't draw 360°)
  if (segments.length === 1) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={segments[0].color} strokeWidth={strokeW} />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="currentColor" fontSize="28" fontWeight="600" className="text-gray-900">
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="currentColor" fontSize="11" className="text-gray-400">
          Toplam
        </text>
      </svg>
    );
  }

  let cumAngle = -90;

  const arcs = segments.map((seg, i) => {
    const angle = (seg.count / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (cumAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;

    return (
      <path
        key={i}
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none"
        stroke={seg.color}
        strokeWidth={strokeW}
        className="transition-all duration-150 hover:opacity-80 cursor-pointer"
        onMouseEnter={(e) => {
          (e.currentTarget as SVGPathElement).style.strokeWidth = String(strokeW + 5);
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as SVGPathElement).style.strokeWidth = String(strokeW);
        }}
      >
        <title>{seg.label}: {seg.count} ({Math.round((seg.count / total) * 100)}%)</title>
      </path>
    );
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {arcs}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="currentColor" fontSize="28" fontWeight="600" className="text-gray-900">
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="currentColor" fontSize="11" className="text-gray-400">
        Toplam
      </text>
    </svg>
  );
}
