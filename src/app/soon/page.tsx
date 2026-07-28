import type { Metadata } from "next";
import ComingSoon from "@/components/soon/ComingSoon";
import "./soon.css";

export const metadata: Metadata = {
  title: { absolute: "SRT Cuts — Big things coming" },
  description: "SRT Cuts is between builds. Check back soon.",
};

export default function SoonPage() {
  return <ComingSoon />;
}
