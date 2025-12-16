import React from "react";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  Divider,
  Tooltip,
} from "@mui/material";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CalculateIcon from "@mui/icons-material/Calculate";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import OMEQPage from "../features/omeq/pages/OMEQPage";
import StandardTekstPage from "../features/standardtekster/pages/StandardTekstPage";

const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 72;

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isSelected = (path: string) => {
    if (path === "/omeq") return location.pathname === "/" || location.pathname === "/omeq";
    return location.pathname === path;
  };

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const items = [
    { label: "OMEQ-beregning", path: "/omeq", icon: <CalculateIcon /> },
    { label: "Standardtekster", path: "/standardtekster", icon: <TextSnippetIcon /> },
    { label: "Felleskatalogen", path: "/felleskatalogen", icon: <MenuBookIcon /> },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          overflowX: "hidden",
          transition: "width 180ms ease",
        },
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-end",
          px: 1,
        }}
      >
        <Tooltip title={collapsed ? "Utvid meny" : "Skjul meny"}>
          <IconButton onClick={onToggle} aria-label={collapsed ? "Utvid meny" : "Skjul meny"}>
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Toolbar>

      <Divider />

      <List>
        {items.map((item) => (
          <Tooltip key={item.path} title={collapsed ? item.label : ""} placement="right">
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={() => navigate(item.path)}
              sx={{
                justifyContent: collapsed ? "center" : "flex-start",
                px: collapsed ? 1 : 2,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: collapsed ? 0 : 2,
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Drawer>
  );
}

function Layout() {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    return stored === "true";
  });
  React.useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <Box component="main" sx={{ flex: 1, p: 2 }}>
        <Routes>
          <Route path="/" element={<OMEQPage />} />
          <Route path="/omeq" element={<OMEQPage />} />
          <Route path="/standardtekster" element={<StandardTekstPage />} />
          <Route path="/felleskatalogen" element={<div>Felleskatalogen (kommer)</div>} />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
