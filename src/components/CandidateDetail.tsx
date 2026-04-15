"use client";

import { X, MapPin, Briefcase, Mail, Phone, Linkedin, Clock } from "lucide-react";
import StatusBadge from "./StatusBadge";
import StarRating from "./StarRating";
import SkillTag from "./SkillTag";
import { Candidate } from "@/lib/types";
import { calculateMatchScore } from "@/lib/skills";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Props {
  candidate: Candidate;
  jdSkills: string[];
  onClose: () => void;
  onStatusChange: (status: string) => void;
}

export default function CandidateDetail({ candidate, jdSkills, onClose, onStatusChange }: Props) {
  const { t } = useLanguage();
  const skills: string[] = JSON.parse(candidate.skills || "[]");
  const matchScore = jdSkills.length > 0 ? calculateMatchScore(skills, jdSkills) : null;

  const statusLabels: Record<string, string> = {
    new: t("detail.statusNew"),
    contacted: t("detail.statusContacted"),
    interview: t("detail.statusInterview"),
    offered: t("detail.statusOffered"),
    placed: t("detail.statusPlaced"),
    rejected: t("detail.statusRejected"),
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{candidate.name}</h3>
            <p className="text-sm text-gray-500">{candidate.title} @ {candidate.company}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Temel Match Skoru (Statik) */}
          {matchScore !== null && (
            <div className={`p-3 rounded-lg ${matchScore >= 70 ? "bg-green-50" : matchScore >= 40 ? "bg-yellow-50" : "bg-red-50"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{t("detail.matchScore")}</span>
                <span className={`text-lg font-bold ${matchScore >= 70 ? "text-green-700" : matchScore >= 40 ? "text-yellow-700" : "text-red-700"}`}>
                  %{matchScore}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${matchScore >= 70 ? "bg-green-500" : matchScore >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${matchScore}%` }} />
              </div>
            </div>
          )}

          {/* İletişim Bilgileri */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600"><MapPin size={14} /> {candidate.location || "-"}</div>
            <div className="flex items-center gap-2 text-gray-600"><Briefcase size={14} /> {candidate.experience} {t("candidate.years")}</div>
            {candidate.email && <div className="flex items-center gap-2 text-gray-600"><Mail size={14} /> {candidate.email}</div>}
            {candidate.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={14} /> {candidate.phone}</div>}
          </div>

          {candidate.linkedin && (
            <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 text-sm hover:underline">
              <Linkedin size={14} /> LinkedIn
            </a>
          )}

          {/* Durum Değiştirme */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">{t("detail.changeStatus")}</p>
            <div className="flex flex-wrap gap-2">
              {["new", "contacted", "interview", "offered", "placed", "rejected"].map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    candidate.status === s ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {statusLabels[s] || s}
                </button>
              ))}
            </div>
          </div>

          {/* Değerlendirme & Yetenekler */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">{t("modal.rating")}</p>
              <StarRating rating={candidate.rating} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t("modal.skills")}</p>
              <div className="flex flex-wrap">{skills.map((skill) => <SkillTag key={skill} skill={skill} highlight={jdSkills.includes(skill)} />)}</div>
            </div>
          </div>

          {/* Notlar */}
          {candidate.notes && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">{t("modal.notes")}</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{candidate.notes}</p>
            </div>
          )}

          {/* Aktivite Kaydı */}
          {candidate.activities && candidate.activities.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t("detail.activityLog")}</p>
              <div className="space-y-2">
                {candidate.activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-2 text-sm">
                    <Clock size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-700">{act.content}</p>
                      <p className="text-xs text-gray-400">{new Date(act.createdAt).toLocaleDateString("tr-TR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}