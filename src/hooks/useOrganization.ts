"use client";

import { useContext } from "react";
import { OrgContext } from "@/components/providers/OrgProvider";

export function useOrganization() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrganization must be used within OrgProvider");
  }
  return context;
}
