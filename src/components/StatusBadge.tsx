"use client";
import { STATUS_CONFIG } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {t(`status.${status}`)}
    </span>
  );
}
