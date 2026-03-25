"use client";
import { useParams } from "next/navigation";
import ReportEditor from "@/pages/report-editor";
export default function ReportEditorPage() {
  const params = useParams() as { reportId: string };
  return <ReportEditor params={params} />;
}
