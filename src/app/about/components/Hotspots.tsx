"use client";

import { hotspots as hotspotData, members as membersData } from "../content/members";
import type { MemberId } from "../content/members";
import { useMemo } from "react";

type HotspotsProps = {
  onOpen: (memberId: MemberId) => void;
};

export default function Hotspots({ onOpen }: HotspotsProps) {
  const memberMap = useMemo(() => {
    const map = new Map(membersData.map((m) => [m.id, m] as const));
    return map;
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="relative w-full h-full">
        {hotspotData.map((spot) => {
          const member = memberMap.get(spot.memberId);
          if (!member) return null;
          return (
            <div key={spot.memberId} className="absolute" style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%`, transform: "translate(-50%, -50%)" }}>
              <button
                type="button"
                aria-label={spot.ariaLabel}
                className="pointer-events-auto h-12 w-12 rounded-full border-2 border-white/80 bg-white/20 backdrop-blur-sm hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                onClick={() => onOpen(spot.memberId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(spot.memberId);
                  }
                }}
              />
              <div className="pointer-events-none mt-2 select-none text-center text-sm text-white/90 opacity-0 transition-opacity duration-150 [button:focus+&]:opacity-100 [button:hover+&]:opacity-100">
                <span className="rounded bg-black/60 px-2 py-1">
                  {member.name} — {member.role}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


