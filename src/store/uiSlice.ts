import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  language: "en" | "ur";
  theme: "light" | "dark";
  expandedMenus: Record<string, boolean>;
}

const initialState: UIState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  language: "en",
  theme: "light",
  expandedMenus: {},
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebarCollapse: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setLanguage: (state, action: PayloadAction<"en" | "ur">) => {
      state.language = action.payload;
    },
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
    toggleExpandedMenu: (state, action: PayloadAction<string>) => {
      const menuKey = action.payload;
      state.expandedMenus[menuKey] = !state.expandedMenus[menuKey];
    },
    setExpandedMenu: (
      state,
      action: PayloadAction<{ key: string; expanded: boolean }>
    ) => {
      state.expandedMenus[action.payload.key] = action.payload.expanded;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapse,
  setSidebarCollapsed,
  setLanguage,
  setTheme,
  toggleExpandedMenu,
  setExpandedMenu,
} = uiSlice.actions;
export default uiSlice.reducer;
