"use client";
import { Eye, Edit3, Linkedin, Trash2, MapPin, Briefcase, Download, FileText } from "lucide-react";
import StatusBadge from "./StatusBadge";
import StarRating from "./StarRating";
import SkillTag from "./SkillTag";
import { Candidate } from "@/lib/types";
import { calculateMatchScore } from "@/lib/skills";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Props {
  candidate: Candidate;
  jdSkills: string[];
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CandidateCard({ candidate, jdSkills, onView, onEdit, onDelete }: Props) {
  const { t } = useLanguage();
  const skills: string[] = JSON.parse(candidate.skills || "[]");
  const matchScore = jdSkills.length > 0 ? calculateMatchScore(skills, jdSkills) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="font-semibold text-gray-900">{candidate.name}</h3>
            <StatusBadge status={candidate.status} />
            {matchScore !== null && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                matchScore >= 70 ? "bg-green-100 text-green-700" : matchScore >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
              }`}>
                %{matchScore} {t("candidate.match")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
            <span className="flex items-center gap-1"><Briefcase size={13} /> {candidate.title} @ {candidate.company}</span>
            <span className="flex items-center gap-1"><MapPin size={13} /> {candidate.location}</span>
            <span>{candidate.experience} {t("candidate.years")}</span>
          </div>
          <div className="flex flex-wrap mb-2">
            {skills.slice(0, 6).map((skill) => (
              <SkillTag key={skill} skill={skill} highlight={jdSkills.includes(skill)} />
            ))}
            {skills.length > 6 && <span className="text-xs text-gray-400 self-center ml-1">+{skills.length - 6}</span>}
          </div>
          <StarRating rating={candidate.rating} />
        </div>
        <div className="flex items-center gap-1 ml-3 shrink-0">
          <button onClick={onView} className="p-2 hover:bg-gray-100 rounded-lg" title={t("candidate.view")}><Eye size={16} className="text-gray-400" /></button>
          <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded-lg" title={t("candidate.edit")}><Edit3 size={16} className="text-gray-400" /></button>
            {/* @ts-ignore */}
            {(candidate as any).cvFile && (
            <>
              <a
                href={`/api/candidates/${candidate.id}/preview-cv`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-orange-50 rounded-lg"
                title="CV'yi Gözat"
              >
                <FileText size={16} className="text-orange-500" />
              </a>
              <a
                href={`/api/candidates/${candidate.id}/download-cv`}
                className="p-2 hover:bg-brand-50 rounded-lg"
                title="CV'yi İndir"
              >
                <Download size={16} className="text-brand-500" />
              </a>
            </>
          )}
          {candidate.linkedin && (
            <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-blue-50 rounded-lg" title="LinkedIn">
              <Linkedin size={16} className="text-blue-500" />
            </a>
          )}
          <button onClick={onDelete} className="p-2 hover:bg-red-50 rounded-lg" title={t("candidate.delete")}><Trash2 size={16} className="text-gray-400 hover:text-red-500" /></button>
        </div>
      </div>
    </div>
  );
}
