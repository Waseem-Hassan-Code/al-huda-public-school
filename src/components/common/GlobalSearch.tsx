"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  Popper,
  ClickAwayListener,
  Chip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  type: "student" | "teacher" | "voucher";
  title: string;
  subtitle: string;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data);
          setOpen(true);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    switch (result.type) {
      case "student":
        router.push(`/students/${result.id}`);
        break;
      case "teacher":
        router.push(`/teachers/${result.id}`);
        break;
      case "voucher":
        router.push(`/fees/vouchers/${result.id}`);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "student":
        return <SchoolIcon sx={{ color: "#1565c0" }} />;
      case "teacher":
        return <PersonIcon sx={{ color: "#2e7d32" }} />;
      case "voucher":
        return <ReceiptIcon sx={{ color: "#ed6c02" }} />;
      default:
        return <SearchIcon />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "student":
        return "Student";
      case "teacher":
        return "Teacher";
      case "voucher":
        return "Voucher";
      default:
        return type;
    }
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: "relative", width: "100%" }} ref={anchorRef}>
        <TextField
          size="small"
          placeholder="Search students, teachers, vouchers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? (
                  <CircularProgress size={20} sx={{ color: "#fff" }} />
                ) : (
                  <SearchIcon sx={{ color: "rgba(255,255,255,0.7)" }} />
                )}
              </InputAdornment>
            ),
            sx: {
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: 2,
              color: "#fff",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "transparent",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255,255,255,0.3)",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255,255,255,0.5)",
              },
              "& input::placeholder": {
                color: "rgba(255,255,255,0.7)",
                opacity: 1,
              },
            },
          }}
        />

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          style={{ width: anchorRef.current?.clientWidth, zIndex: 1300 }}
        >
          <Paper
            sx={{
              mt: 1,
              maxHeight: 400,
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              borderRadius: 2,
            }}
          >
            {results.length === 0 ? (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography color="text.secondary">No results found</Typography>
              </Box>
            ) : (
              <List dense>
                {results.map((result) => (
                  <ListItem
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                  >
                    <ListItemIcon>{getIcon(result.type)}</ListItemIcon>
                    <ListItemText
                      primary={result.title}
                      secondary={result.subtitle}
                    />
                    <Chip
                      label={getTypeLabel(result.type)}
                      size="small"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
