"use client";

export default function SkillTag({ skill, highlight }: { skill: string; highlight?: boolean }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-1 mb-1 ${
        highlight ? "bg-brand-100 text-brand-800 ring-1 ring-brand-300" : "bg-gray-100 text-gray-600"
      }`}
    >
      {skill}
    </span>
  );
}
