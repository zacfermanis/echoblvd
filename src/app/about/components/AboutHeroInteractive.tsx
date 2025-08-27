"use client";

import { useCallback, useState } from "react";
import type { MemberId } from "../content/members";
import Hotspots from "./Hotspots";
import BioModal from "./BioModal";

export default function AboutHeroInteractive() {
  const [openMemberId, setOpenMemberId] = useState<MemberId | null>(null);
  const open = useCallback((memberId: MemberId) => setOpenMemberId(memberId), []);
  const close = useCallback(() => setOpenMemberId(null), []);

  return (
    <>
      <Hotspots onOpen={open} />
      <BioModal openMemberId={openMemberId} onClose={close} />
    </>
  );
}


