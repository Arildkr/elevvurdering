"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function FeedbackRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/assignment/${id}/forbedre`);
  }, [id, router]);

  return null;
}
