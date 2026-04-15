"use client";
import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronRight, Globe, Linkedin, UserPlus, X, Save, MapPin } from "lucide-react";
import { generateSearchQueries, parseLinkedInUrl, LOCATIONS } from "@/lib/searchQueries";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Props {
  jdSkills: string[];
  onAddCandidate: (data: any) => void;
}

export default function LinkedInSearch({ jdSkills, onAddCandidate }: Props) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["turkey"]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState({
    name: "", title: "", company: "", location: "", linkedin: "",
    skills: [] as string[], experience: 0, notes: "",
  });

  const queries = jdSkills.length > 0 ? generateSearchQueries(jdSkills, selectedLocations) : [];

  const toggleLocation = (id: string) => {
    setSelectedLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const handleQuickAdd = () => {
    if (!quickForm.name.trim()) return;
    onAddCandidate({ ...quickForm, status: "new", rating: 3 });
    setQuickForm({ name: "", title: "", company: "", location: "", linkedin: "", skills: [], experience: 0, notes: "" });
    setShowQuickAdd(false);
  };

  if (jdSkills.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Linkedin size={20} className="text-blue-600" />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-gray-900">{t("linkedin.title")}</h2>
            <p className="text-sm text-gray-500">
              {queries.length > 0
                ? `${queries.length} ${t("linkedin.subtitle")} - ${selectedLocations.length} ${t("linkedin.locations")}`
                : t("linkedin.selectMin")}
            </p>
          </div>
        </div>
        {isOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {/* Location Selector */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-gray-500" />
              <p className="text-sm font-medium text-gray-700">{t("linkedin.locationLabel")}</p>
              <span className="text-xs text-gray-400">({selectedLocations.length} {t("linkedin.selected")})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => toggleLocation(loc.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedLocations.includes(loc.id)
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  {t(`loc.${loc.id}`)}
                </button>
              ))}
            </div>
            {selectedLocations.length === 0 && (
              <p className="text-xs text-red-500 mt-1">{t("linkedin.selectMin")}</p>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            <p>{t("linkedin.info")}</p>
          </div>

          {/* Detected Skills */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">{t("linkedin.detectedSkills")}</p>
            <div className="flex flex-wrap gap-1">
              {jdSkills.map((skill) => (
                <span key={skill} className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-brand-100 text-brand-800 ring-1 ring-brand-300">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Search Queries */}
          {queries.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{t("linkedin.queries")} ({queries.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {queries.map((q) => (
                  <a
                    key={q.id}
                    href={q.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      {q.id === "linkedin-direct" ? (
                        <Linkedin size={16} className="text-blue-600" />
                      ) : (
                        <Globe size={16} className="text-gray-500 group-hover:text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{q.label}</p>
                        <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-500" />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{q.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Quick Add */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <UserPlus size={16} /> {t("linkedin.quickAdd")}
            </button>

            {showQuickAdd && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">{t("linkedin.quickAddTitle")}</p>
                  <button onClick={() => setShowQuickAdd(false)} className="p-1 hover:bg-gray-200 rounded"><X size={16} /></button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("linkedin.linkedinUrl")}</label>
                  <input
                    value={quickForm.linkedin}
                    onChange={(e) => {
                      const url = e.target.value;
                      const parsed = parseLinkedInUrl(url);
                      setQuickForm({ ...quickForm, linkedin: url });
                    }}
                    placeholder="https://linkedin.com/in/profil-adi"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("modal.name")} *</label>
                    <input value={quickForm.name} onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("modal.position")}</label>
                    <input value={quickForm.title} onChange={(e) => setQuickForm({ ...quickForm, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("modal.company")}</label>
                    <input value={quickForm.company} onChange={(e) => setQuickForm({ ...quickForm, company: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("modal.location")}</label>
                    <input value={quickForm.location} onChange={(e) => setQuickForm({ ...quickForm, location: e.target.value })} placeholder="Istanbul, Ankara..." className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("modal.experience")}</label>
                    <input type="number" value={quickForm.experience} onChange={(e) => setQuickForm({ ...quickForm, experience: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("linkedin.quickSkillAdd")}</label>
                  <div className="flex flex-wrap gap-1">
                    {jdSkills.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => {
                          if (!quickForm.skills.includes(skill)) setQuickForm({ ...quickForm, skills: [...quickForm.skills, skill] });
                          else setQuickForm({ ...quickForm, skills: quickForm.skills.filter((s) => s !== skill) });
                        }}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          quickForm.skills.includes(skill) ? "bg-brand-200 text-brand-800 ring-1 ring-brand-400" : "bg-gray-100 text-gray-600 hover:bg-brand-50"
                        }`}
                      >
                        {quickForm.skills.includes(skill) ? "✓ " : "+ "}{skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t("modal.notes")}</label>
                  <textarea value={quickForm.notes} onChange={(e) => setQuickForm({ ...quickForm, notes: e.target.value })} className="w-full h-16 px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-brand-500 outline-none" placeholder={t("linkedin.notesPlaceholder")} />
                </div>

                <button onClick={handleQuickAdd} disabled={!quickForm.name.trim()} className="w-full px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save size={16} /> {t("linkedin.saveToCrm")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
