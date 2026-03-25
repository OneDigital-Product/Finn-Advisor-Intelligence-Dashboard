"use client";
import { useParams } from "next/navigation";
import ClientDetail from "@/pages/client-detail";
export default function ClientDetailPage() {
  const params = useParams() as { id: string };
  return <ClientDetail params={params} />;
}
