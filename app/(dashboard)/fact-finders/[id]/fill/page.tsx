"use client";
import { useParams } from "next/navigation";
import FactFinderFill from "@/pages/fact-finder-fill";
export default function FactFinderFillPage() {
  const params = useParams() as { id: string };
  return <FactFinderFill params={params} />;
}
