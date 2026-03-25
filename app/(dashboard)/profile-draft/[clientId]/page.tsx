"use client";
import { useParams } from "next/navigation";
import ProfileDraftPage from "@/pages/profile-draft";
export default function ProfileDraft() {
  const params = useParams() as { clientId: string };
  return <ProfileDraftPage params={params} />;
}
