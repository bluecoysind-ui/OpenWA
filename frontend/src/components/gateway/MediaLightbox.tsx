import { useEffect } from "react";

export type LightboxItem = { id: string; url: string; alt?: string };

export function MediaLightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNavigate(Math.min(items.length - 1, (index ?? 0) + 1));
      if (e.key === "ArrowLeft") onNavigate(Math.max(0, (index ?? 0) - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onNavigate]);

  if (index === null || items.length === 0) return null;
  const item = items[index];
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-night/90 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" className="absolute top-4 right-4 rounded-lg bg-white/10 px-3 py-1 text-sm" onClick={onClose}>
        Close
      </button>
      {index > 0 ? (
        <button
          type="button"
          className="absolute left-4 rounded-lg bg-white/10 px-3 py-2"
          onClick={() => onNavigate(index - 1)}
        >
          ‹
        </button>
      ) : null}
      <img src={item.url} alt={item.alt ?? ""} className="max-h-[85vh] max-w-full object-contain" />
      {index < items.length - 1 ? (
        <button
          type="button"
          className="absolute right-4 rounded-lg bg-white/10 px-3 py-2"
          onClick={() => onNavigate(index + 1)}
        >
          ›
        </button>
      ) : null}
      <div className="absolute bottom-4 text-xs text-muted">{index + 1} / {items.length}</div>
    </div>
  );
}
