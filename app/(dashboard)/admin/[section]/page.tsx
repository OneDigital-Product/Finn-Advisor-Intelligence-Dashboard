"use client";
import { useParams } from "next/navigation";
import AdminSettings from "@/pages/admin";
export default function AdminSectionPage() {
  const params = useParams() as { section: string };
  return <AdminSettings params={params} />;
}
