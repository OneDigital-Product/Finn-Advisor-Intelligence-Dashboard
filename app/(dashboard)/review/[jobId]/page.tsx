"use client";
import { useParams } from "next/navigation";
import ReviewQueuePage from "@/pages/review-queue";
export default function ReviewPage() {
  const params = useParams() as { jobId: string };
  return <ReviewQueuePage params={params} />;
}
