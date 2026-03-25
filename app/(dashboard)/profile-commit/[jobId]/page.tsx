"use client";
import { useParams } from "next/navigation";
import ProfileCommitPage from "@/pages/profile-commit";
export default function ProfileCommit() {
  const params = useParams() as { jobId: string };
  return <ProfileCommitPage params={params} />;
}
