"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Divider,
  ListItemIcon,
  Select,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Button,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Translate as TranslateIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  DoneAll as DoneAllIcon,
  School as SchoolIcon,
  EventNote as EventNoteIcon,
} from "@mui/icons-material";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import UserAvatar from "@/components/common/UserAvatar";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  toggleSidebar,
  toggleSidebarCollapse,
  setLanguage,
} from "@/store/uiSlice";
import GlobalSearch from "@/components/common/GlobalSearch";

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  language: "en" | "ur";
}

interface AuthState {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
  } | null;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  sentBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function Topbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation("common");
  const { sidebarOpen, sidebarCollapsed, language } = useAppSelector(
    (state) => state.ui as UIState
  );
  const { user } = useAppSelector((state) => state.auth as AuthState);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Notification state
  const [notificationAnchor, setNotificationAnchor] =
    useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationOpen = Boolean(notificationAnchor);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
    fetchNotifications();
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PUT" });
      // Remove from list after marking as read
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const notification = notifications.find((n) => n.id === id);
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "STUDENT_REGISTERED":
        return <PersonAddIcon sx={{ color: "#4caf50" }} />;
      case "ATTENDANCE_MARKED":
      case "ATTENDANCE":
        return <EventNoteIcon sx={{ color: "#2196f3" }} />;
      case "FEE_GENERATED":
      case "FEE_DUE":
        return <SchoolIcon sx={{ color: "#ff9800" }} />;
      default:
        return <NotificationsIcon sx={{ color: "#9e9e9e" }} />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleMenuClose();
    router.push("/profile");
  };

  const handleSettings = () => {
    handleMenuClose();
    router.push("/settings");
  };

  const handleLogout = async () => {
    handleMenuClose();
    await signOut({ redirect: true, callbackUrl: "/login" });
  };

  const handleLanguageChange = (lang: "en" | "ur") => {
    dispatch(setLanguage(lang));
    i18n.changeLanguage(lang);
    document.dir = lang === "ur" ? "rtl" : "ltr";
  };

  const currentDrawerWidth = sidebarCollapsed
    ? collapsedDrawerWidth
    : drawerWidth;

  return (
    <AppBar
      position="fixed"
      sx={{
        width: sidebarOpen ? `calc(100% - ${currentDrawerWidth}px)` : "100%",
        ml: sidebarOpen ? `${currentDrawerWidth}px` : 0,
        background: "linear-gradient(90deg, #1a237e 0%, #283593 100%)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        transition: "all 0.3s ease",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        {/* Left Side */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}>
            <IconButton
              onClick={() => dispatch(toggleSidebar())}
              sx={{ color: "#fff" }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          {sidebarOpen && (
            <Tooltip title={sidebarCollapsed ? "Expand" : "Collapse"}>
              <IconButton
                onClick={() => dispatch(toggleSidebarCollapse())}
                sx={{ color: "#fff" }}
              >
                <MenuOpenIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Center - Global Search */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flex: 1,
            justifyContent: "center",
            maxWidth: 500,
            mx: 2,
          }}
        >
          <GlobalSearch />
        </Box>

        {/* Right Side */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Language Switcher */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 2,
              px: 1,
              py: 0.5,
            }}
          >
            <TranslateIcon sx={{ color: "#fff", fontSize: 20, mr: 1 }} />
            <Select
              value={language}
              onChange={(e) =>
                handleLanguageChange(e.target.value as "en" | "ur")
              }
              size="small"
              variant="standard"
              disableUnderline
              sx={{
                fontSize: "0.875rem",
                color: "#fff",
                "& .MuiSelect-select": {
                  py: 0,
                  pr: 3,
                },
                "& .MuiSelect-icon": {
                  color: "#fff",
                },
              }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="ur">اردو</MenuItem>
            </Select>
          </Box>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton onClick={handleNotificationOpen} sx={{ color: "#fff" }}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title="Account">
            <IconButton onClick={handleMenuOpen} sx={{ p: 0, ml: 1 }}>
              <UserAvatar
                src={user?.avatar}
                name={user?.name}
                size={40}
                sx={{
                  border: "2px solid rgba(255,255,255,0.5)",
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* User Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              minWidth: 220,
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              borderRadius: 2,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {user?.name || "User"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email || "user@email.com"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              backgroundColor: "#1a237e",
              color: "#fff",
              px: 1,
              py: 0.25,
              borderRadius: 1,
              display: "inline-block",
              mt: 0.5,
            }}
          >
            {user?.role?.replace("_", " ") || "User"}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          {t("common.profile")}
        </MenuItem>
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          {t("common.settings")}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          {t("common.logout")}
        </MenuItem>
      </Menu>

      {/* Notifications Popover */}
      <Popover
        open={notificationOpen}
        anchorEl={notificationAnchor}
        onClose={handleNotificationClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              width: 380,
              maxHeight: 500,
              borderRadius: 2,
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            position: "sticky",
            top: 0,
            bgcolor: "background.paper",
            zIndex: 1,
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Notifications
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                color="error"
                sx={{ ml: 1, height: 20, fontSize: "0.75rem" }}
              />
            )}
          </Typography>
          {notifications.length > 0 && (
            <Tooltip title="Mark all as read & clear">
              <IconButton size="small" onClick={handleMarkAllAsRead}>
                <DoneAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Notification List */}
        <Box sx={{ maxHeight: 400, overflow: "auto" }}>
          {loadingNotifications && notifications.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
              <NotificationsIcon
                sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
              />
              <Typography color="text.secondary">No notifications</Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      bgcolor: notification.isRead
                        ? "transparent"
                        : "action.hover",
                      "&:hover": {
                        bgcolor: "action.selected",
                      },
                      alignItems: "flex-start",
                      py: 1.5,
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() =>
                          handleDeleteNotification(notification.id)
                        }
                        sx={{ opacity: 0.6, "&:hover": { opacity: 1 } }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: "transparent",
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          fontWeight={notification.isRead ? 400 : 600}
                          sx={{ pr: 3 }}
                        >
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ display: "block", mt: 0.5 }}
                          >
                            {formatTimeAgo(notification.createdAt)}
                          </Typography>
                        </Box>
                      }
                      onClick={() => {
                        if (!notification.isRead) {
                          handleMarkAsRead(notification.id);
                        }
                      }}
                      sx={{ cursor: "pointer" }}
                    />
                  </ListItem>
                  {index < notifications.length - 1 && (
                    <Divider variant="inset" component="li" />
                  )}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </AppBar>
  );
}
