"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface OrgContextValue {
  currentOrg: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  switchOrg: (orgId: string) => void;
  refreshOrgs: () => Promise<void>;
}

export const OrgContext = createContext<OrgContextValue | null>(null);

function getOrgIdCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )org_id=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setOrgIdCookie(orgId: string) {
  document.cookie = `org_id=${encodeURIComponent(orgId)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrgs = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      setIsLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from("org_members")
      .select("org_id, role, organizations(id, name, slug)")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setOrganizations([]);
      setCurrentOrg(null);
      setIsLoading(false);
      return;
    }

    const orgs: Organization[] = memberships
      .map((m) => {
        const org = m.organizations as unknown as {
          id: string;
          name: string;
          slug: string;
        } | null;
        if (!org) return null;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: m.role,
        };
      })
      .filter((o): o is Organization => o !== null);

    setOrganizations(orgs);

    // Determine current org from cookie
    const cookieOrgId = getOrgIdCookie();
    const matchingOrg = orgs.find((o) => o.id === cookieOrgId);

    if (matchingOrg) {
      setCurrentOrg(matchingOrg);
    } else if (orgs.length > 0) {
      // Default to first org
      setCurrentOrg(orgs[0]);
      setOrgIdCookie(orgs[0].id);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const switchOrg = useCallback(
    (orgId: string) => {
      const org = organizations.find((o) => o.id === orgId);
      if (org) {
        setCurrentOrg(org);
        setOrgIdCookie(orgId);
        // Reload to refetch data scoped to new org
        window.location.reload();
      }
    },
    [organizations]
  );

  return (
    <OrgContext.Provider
      value={{
        currentOrg,
        organizations,
        isLoading,
        switchOrg,
        refreshOrgs: fetchOrgs,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}
