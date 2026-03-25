"use client";
import { useParams } from "next/navigation";
import DiscoveryPage from "@/pages/discovery";
export default function DiscoveryWithIdPage() {
  const params = useParams() as { id: string };
  return <DiscoveryPage params={params} />;
}
