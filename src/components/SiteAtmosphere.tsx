"use client";

/**
 * Mounts the ambient forest layer + sound toggle site-wide, but never on the
 * internal /admin dashboard, which is intentionally left untouched.
 */

import { usePathname } from "next/navigation";
import ForestAtmosphere from "@/components/ForestAtmosphere";
import AmbientSound from "@/components/AmbientSound";

export default function SiteAtmosphere() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <>
      <ForestAtmosphere />
      <AmbientSound />
    </>
  );
}
