"use client";
import { Star } from "lucide-react";

export default function StarRating({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} onClick={() => onChange?.(star)} className="focus:outline-none" disabled={!onChange}>
          <Star size={14} className={star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
        </button>
      ))}
    </div>
  );
}
