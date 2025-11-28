"use client";

import React from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Typography,
  Divider,
  Tooltip,
  Collapse,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Class as ClassIcon,
  Subject as SubjectIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  EventNote as EventNoteIcon,
  AssignmentTurnedIn as AssignmentIcon,
  Grade as GradeIcon,
  Schedule as ScheduleIcon,
  Report as ReportIcon,
  Settings as SettingsIcon,
  ManageAccounts as ManageAccountsIcon,
  History as HistoryIcon,
  ExpandLess,
  ExpandMore,
  Assessment as AssessmentIcon,
  AccountBalance as AccountBalanceIcon,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/store";
import { hasPermission, Permission } from "@/lib/permissions";

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path?: string;
  permission?: Permission;
  children?: MenuItem[];
}

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
}

interface AuthState {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
    permissions?: string[];
  } | null;
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation("common");
  const { sidebarOpen, sidebarCollapsed } = useAppSelector(
    (state) => state.ui as UIState
  );
  const { user } = useAppSelector((state) => state.auth as AuthState);

  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});

  const handleMenuToggle = (menuText: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuText]: !prev[menuText],
    }));
  };

  const menuItems: MenuItem[] = [
    {
      text: t("common.dashboard"),
      icon: <DashboardIcon />,
      path: "/dashboard",
      permission: Permission.VIEW_DASHBOARD,
    },
    {
      text: t("common.students"),
      icon: <SchoolIcon />,
      path: "/students",
      permission: Permission.VIEW_STUDENTS,
    },
    {
      text: t("common.teachers"),
      icon: <PersonIcon />,
      path: "/teachers",
      permission: Permission.VIEW_TEACHERS,
    },
    {
      text: "Academic",
      icon: <ClassIcon />,
      permission: Permission.VIEW_CLASSES,
      children: [
        {
          text: t("common.classes"),
          icon: <ClassIcon />,
          path: "/classes",
          permission: Permission.VIEW_CLASSES,
        },
        {
          text: t("common.sections"),
          icon: <PeopleIcon />,
          path: "/sections",
          permission: Permission.VIEW_SECTIONS,
        },
        {
          text: t("common.subjects"),
          icon: <SubjectIcon />,
          path: "/subjects",
          permission: Permission.VIEW_SUBJECTS,
        },
      ],
    },
    {
      text: t("common.fees"),
      icon: <PaymentIcon />,
      permission: Permission.VIEW_FEES,
      children: [
        {
          text: t("common.feeVouchers"),
          icon: <ReceiptIcon />,
          path: "/fees/vouchers",
          permission: Permission.VIEW_FEES,
        },
        {
          text: t("common.payments"),
          icon: <PaymentIcon />,
          path: "/fees/payments",
          permission: Permission.VIEW_FEES,
        },
        {
          text: "Fee Structure",
          icon: <AccountBalanceIcon />,
          path: "/fees/structure",
          permission: Permission.MANAGE_FEE_STRUCTURE,
        },
      ],
    },
    {
      text: t("common.attendance"),
      icon: <EventNoteIcon />,
      path: "/attendance",
      permission: Permission.VIEW_ATTENDANCE,
    },
    {
      text: t("common.exams"),
      icon: <AssignmentIcon />,
      permission: Permission.VIEW_EXAMS,
      children: [
        {
          text: "Examinations",
          icon: <AssignmentIcon />,
          path: "/exams",
          permission: Permission.VIEW_EXAMS,
        },
        {
          text: "Enter Marks",
          icon: <GradeIcon />,
          path: "/exams/marks",
          permission: Permission.ENTER_MARKS,
        },
        {
          text: t("common.results"),
          icon: <AssessmentIcon />,
          path: "/results",
          permission: Permission.VIEW_RESULTS,
        },
      ],
    },
    {
      text: t("common.timetable"),
      icon: <ScheduleIcon />,
      path: "/timetable",
      permission: Permission.VIEW_TIMETABLE,
    },
    {
      text: t("common.complaints"),
      icon: <ReportIcon />,
      path: "/complaints",
      permission: Permission.VIEW_COMPLAINTS,
    },
    {
      text: "Salary Management",
      icon: <AccountBalanceIcon />,
      path: "/salaries",
      permission: Permission.MANAGE_TEACHER_SALARY,
    },
    {
      text: t("common.reports"),
      icon: <AssessmentIcon />,
      path: "/reports",
      permission: Permission.VIEW_REPORTS,
    },
    {
      text: t("common.users"),
      icon: <ManageAccountsIcon />,
      path: "/users",
      permission: Permission.VIEW_USERS,
    },
    {
      text: "Transaction Logs",
      icon: <HistoryIcon />,
      path: "/logs",
      permission: Permission.VIEW_LOGS,
    },
    {
      text: t("common.settings"),
      icon: <SettingsIcon />,
      path: "/settings",
      permission: Permission.VIEW_SETTINGS,
    },
  ];

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter((item) => {
      if (item.children) {
        const filteredChildren = filterMenuItems(item.children);
        if (filteredChildren.length > 0) {
          item.children = filteredChildren;
          return true;
        }
        return false;
      }
      return (
        !item.permission ||
        (user?.role &&
          hasPermission(user.role, item.permission, user.permissions))
      );
    });
  };

  const filteredMenuItems = filterMenuItems([...menuItems]);

  const renderMenuItem = (item: MenuItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.path
      ? pathname === item.path || pathname?.startsWith(item.path + "/")
      : false;
    const isOpen = openMenus[item.text] ?? false;

    if (hasChildren) {
      return (
        <React.Fragment key={item.text}>
          <ListItem disablePadding sx={{ mb: 0.5, px: 1 }}>
            <Tooltip
              title={sidebarCollapsed ? item.text : ""}
              placement="right"
            >
              <ListItemButton
                onClick={() => handleMenuToggle(item.text)}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  pl: 2 + depth * 2,
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.1)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "rgba(255,255,255,0.7)",
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!sidebarCollapsed && (
                  <>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: "0.95rem",
                        fontWeight: 400,
                        color: "rgba(255,255,255,0.9)",
                      }}
                    />
                    {isOpen ? (
                      <ExpandLess sx={{ color: "rgba(255,255,255,0.7)" }} />
                    ) : (
                      <ExpandMore sx={{ color: "rgba(255,255,255,0.7)" }} />
                    )}
                  </>
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
          {!sidebarCollapsed && (
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {item.children!.map((child) =>
                  renderMenuItem(child, depth + 1)
                )}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    }

    return (
      <ListItem key={item.path} disablePadding sx={{ mb: 0.5, px: 1 }}>
        <Tooltip title={sidebarCollapsed ? item.text : ""} placement="right">
          <ListItemButton
            onClick={() => item.path && router.push(item.path)}
            sx={{
              borderRadius: 2,
              py: 1.5,
              pl: 2 + depth * 2,
              backgroundColor: isActive
                ? "rgba(255,255,255,0.15)"
                : "transparent",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
              },
              transition: "all 0.2s ease",
            }}
          >
            <ListItemIcon
              sx={{
                color: isActive ? "#90caf9" : "rgba(255,255,255,0.7)",
                minWidth: 40,
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!sidebarCollapsed && (
              <>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: "0.95rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#fff" : "rgba(255,255,255,0.9)",
                  }}
                />
                {isActive && (
                  <Box
                    sx={{
                      width: 4,
                      height: 20,
                      borderRadius: 2,
                      backgroundColor: "#90caf9",
                    }}
                  />
                )}
              </>
            )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const currentDrawerWidth = sidebarCollapsed
    ? collapsedDrawerWidth
    : drawerWidth;

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={sidebarOpen}
      sx={{
        width: currentDrawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: currentDrawerWidth,
          boxSizing: "border-box",
          background: "linear-gradient(180deg, #1565c0 0%, #0d47a1 100%)",
          color: "#fff",
          borderRight: "none",
          transition: "width 0.3s ease",
          overflowX: "hidden",
        },
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: sidebarCollapsed ? 1.5 : 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          minHeight: 72,
        }}
      >
        {sidebarCollapsed ? (
          <Avatar
            sx={{
              bgcolor: "#fff",
              color: "#1565c0",
              fontWeight: 700,
              width: 40,
              height: 40,
            }}
          >
            AH
          </Avatar>
        ) : (
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(90deg, #fff 0%, #90caf9 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1.2,
              }}
            >
              Al-Huda Public School
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.7)" }}
            >
              Management System
            </Typography>
          </Box>
        )}
      </Box>

      {/* Navigation Items */}
      <Box sx={{ flex: 1, py: 2, overflowY: "auto", overflowX: "hidden" }}>
        <List>{filteredMenuItems.map((item) => renderMenuItem(item))}</List>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

      {/* User Profile Section */}
      <Box
        sx={{
          p: sidebarCollapsed ? 1 : 2,
          cursor: "pointer",
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.05)",
          },
          transition: "all 0.2s ease",
        }}
        onClick={() => router.push("/profile")}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: sidebarCollapsed ? 0 : 2,
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
          }}
        >
          <Avatar
            src={user?.avatar || undefined}
            alt={user?.name || "User"}
            sx={{
              width: sidebarCollapsed ? 36 : 45,
              height: sidebarCollapsed ? 36 : 45,
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          >
            {user?.name?.charAt(0) || "U"}
          </Avatar>
          {!sidebarCollapsed && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "#fff",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.name || "User"}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
              >
                {user?.role?.replace("_", " ") || "User"}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
