"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MemberId } from "../content/members";
import { members as membersData } from "../content/members";

type BioModalProps = {
  openMemberId: MemberId | null;
  onClose: () => void;
};

export default function BioModal({ openMemberId, onClose }: BioModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const member = useMemo(() => membersData.find((m) => m.id === openMemberId) || null, [openMemberId]);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!member) return;
    const previousActive = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        // Basic focus trap
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a, button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const isShift = e.shiftKey;
        const active = document.activeElement as HTMLElement | null;
        if (!isShift && active === last) {
          e.preventDefault();
          first.focus();
        } else if (isShift && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previousActive?.focus();
    };
  }, [member, onClose]);

  useEffect(() => {
    if (!member?.portraitSrcs?.length) return;
    setPhotoIndex(0);
    const interval = window.setInterval(() => {
      setPhotoIndex((idx) => (idx + 1) % member.portraitSrcs.length);
    }, 2500);
    return () => window.clearInterval(interval);
  }, [member]);

  if (!member) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bio-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        aria-label="Close bio"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-xl rounded-lg bg-gray-900 p-5 text-gray-200 shadow-xl md:max-w-2xl max-h-[85vh] overflow-auto"
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 id="bio-title" className="text-2xl font-semibold tracking-tight">
            {member.name} — {member.role}
          </h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="ml-4 inline-flex h-10 items-center justify-center rounded-md border border-gray-700 px-3 text-sm font-medium text-gray-200 hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Close
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-[160px,1fr]">
          {/* Portrait rotator (single image render to keep a11y clean) */}
          <div className="aspect-[3/4] w-full overflow-hidden rounded-md bg-gray-800">
            {member.portraitSrcs?.length ? (
              <img
                key={member.portraitSrcs[photoIndex]}
                src={member.portraitSrcs[photoIndex]}
                alt={`${member.name} portrait`}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : null}
          </div>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: member.bioHtml }} />
        </div>
      </div>
    </div>
  );
}


