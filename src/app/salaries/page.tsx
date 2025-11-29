"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page redirects to /salary for backward compatibility
export default function SalariesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/salary");
  }, [router]);

  return null;
}
