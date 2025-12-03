"use client";

import React, { useEffect, useCallback } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store";
import { setUser } from "@/store/authSlice";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

interface MainLayoutProps {
  children: React.ReactNode;
}

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { sidebarOpen, sidebarCollapsed } = useAppSelector(
    (state) => state.ui as UIState
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Fetch latest user profile to get current avatar
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
    return null;
  }, []);

  useEffect(() => {
    if (session?.user) {
      // First set user from session
      const sessionUser = {
        id: (session.user as any).id,
        email: session.user.email || "",
        name: session.user.name || "",
        role: (session.user as any).role || "VIEWER",
        avatar: (session.user as any).avatar,
        teacherId: (session.user as any).teacherId,
        permissions: (session.user as any).permissions,
      };

      // Then fetch latest profile to get updated avatar
      fetchUserProfile().then((profile) => {
        if (profile) {
          dispatch(
            setUser({
              ...sessionUser,
              avatar: profile.avatar || sessionUser.avatar,
              name: profile.name || sessionUser.name,
            })
          );
        } else {
          dispatch(setUser(sessionUser));
        }
      });
    }
  }, [session, dispatch, fetchUserProfile]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f5f7fa",
        }}
      >
        <CircularProgress size={50} sx={{ color: "#1a237e" }} />
      </Box>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const currentDrawerWidth = sidebarCollapsed
    ? collapsedDrawerWidth
    : drawerWidth;

  return (
    <Box
      sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f7fa" }}
    >
      <Sidebar />
      <Topbar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 10,
          ml: sidebarOpen ? 0 : `-${currentDrawerWidth}px`,
          width: sidebarOpen ? `calc(100% - ${currentDrawerWidth}px)` : "100%",
          transition: "all 0.3s ease",
          minHeight: "100vh",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
