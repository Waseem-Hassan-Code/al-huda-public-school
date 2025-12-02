"use client";

import { useSession } from "next-auth/react";
import { useMemo, useCallback } from "react";
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/permissions";

interface UsePermissionsReturn {
  // Permission checking
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  
  // User info
  role: string | null;
  userId: string | null;
  userPermissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Common permission checks
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canUpdate: (module: string) => boolean;
  canDelete: (module: string) => boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { data: session, status } = useSession();
  
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const role = session?.user?.role || null;
  const userId = session?.user?.id || null;
  const userPermissions = useMemo(() => 
    session?.user?.permissions || [], 
    [session?.user?.permissions]
  );

  const can = useCallback((permission: Permission): boolean => {
    if (!role) return false;
    return hasPermission(role, permission, userPermissions);
  }, [role, userPermissions]);

  const canAny = useCallback((permissions: Permission[]): boolean => {
    if (!role) return false;
    return hasAnyPermission(role, permissions, userPermissions);
  }, [role, userPermissions]);

  const canAll = useCallback((permissions: Permission[]): boolean => {
    if (!role) return false;
    return hasAllPermissions(role, permissions, userPermissions);
  }, [role, userPermissions]);

  // Helper functions for common permission patterns
  const canView = useCallback((module: string): boolean => {
    const permission = `${module}.view` as Permission;
    return can(permission);
  }, [can]);

  const canCreate = useCallback((module: string): boolean => {
    const permission = `${module}.create` as Permission;
    return can(permission);
  }, [can]);

  const canUpdate = useCallback((module: string): boolean => {
    const permission = `${module}.update` as Permission;
    return can(permission);
  }, [can]);

  const canDelete = useCallback((module: string): boolean => {
    const permission = `${module}.delete` as Permission;
    return can(permission);
  }, [can]);

  return {
    can,
    canAny,
    canAll,
    role,
    userId,
    userPermissions,
    isLoading,
    isAuthenticated,
    canView,
    canCreate,
    canUpdate,
    canDelete,
  };
}

// Permission Guard Component
interface PermissionGuardProps {
  permission?: Permission;
  permissions?: Permission[];
  mode?: "any" | "all";
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGuard({
  permission,
  permissions,
  mode = "any",
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { can, canAny, canAll, isLoading } = usePermissions();

  if (isLoading) {
    return null;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions) {
    hasAccess = mode === "all" ? canAll(permissions) : canAny(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Conditional Button/Action Component
interface ConditionalActionProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ConditionalAction({
  permission,
  children,
  fallback = null,
}: ConditionalActionProps) {
  const { can } = usePermissions();

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default usePermissions;
