import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Checkbox,
  TextField,
} from "@mui/material";
import HamburgerMenu from "../components/HamburgerMenu";
import { useAuth } from "../contexts/AuthContext";
import {
  getUserHabits,
  updateHabitCheckedDays,
  updateHabitReadingData,
} from "../lib/supabase";

function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadHabits = async () => {
      if (user?.id) {
        try {
          setLoading(true);
          setError(null);
          const userHabits = await getUserHabits(user.id);
          setHabits(userHabits);
        } catch (err) {
          console.error("Error loading habits:", err);
          setError("Failed to load your habits. Please try again.");
        } finally {
          setLoading(false);
        }
      } else {
        setHabits([]);
      }
    };

    loadHabits();
  }, [user?.id]);

  const handleHabitClick = (habit) => {
    navigate(`/habit/${habit.habit_id}/tracker`);
  };

  // Check if today is checked for a habit (for daily habits)
  const isTodayChecked = (habit) => {
    const checkedDays = habit.habit_data?.checkedDays || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split("T")[0];
    return checkedDays.includes(todayKey);
  };

  // Get today's reading value for a habit (for reading habits)
  const getTodayReadingValue = (habit) => {
    const readingData = habit.habit_data?.readingData || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split("T")[0];
    return readingData[todayKey] || "";
  };

  // Check if today has reading progress (total pages > 0) for reading habits
  const isTodayReadingChecked = (habit) => {
    const readingData = habit.habit_data?.readingData || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split("T")[0];
    const dayReadingData = readingData[todayKey];

    if (!dayReadingData) return false;

    // Calculate total pages read today
    let totalPages = 0;
    if (typeof dayReadingData === "number") {
      // Old format: assume it's pages
      totalPages = dayReadingData;
    } else if (Array.isArray(dayReadingData)) {
      // New format: array of { bookId, value, pagesRead }
      totalPages = dayReadingData.reduce((sum, entry) => {
        return sum + (entry.pagesRead || 0);
      }, 0);
    } else if (dayReadingData.pagesRead) {
      // Single book entry with pagesRead
      totalPages = dayReadingData.pagesRead;
    }

    return totalPages > 0;
  };

  // Handle today checkbox toggle (for daily habits)
  const handleTodayToggle = async (habit, event) => {
    event.stopPropagation(); // Prevent navigation when clicking checkbox

    const checkedDays = new Set(habit.habit_data?.checkedDays || []);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split("T")[0];

    // Toggle today's date
    if (checkedDays.has(todayKey)) {
      checkedDays.delete(todayKey);
    } else {
      checkedDays.add(todayKey);
    }

    // Update local state immediately for responsive UI
    const updatedHabits = habits.map((h) => {
      if (h.habit_id === habit.habit_id) {
        return {
          ...h,
          habit_data: {
            ...h.habit_data,
            checkedDays: Array.from(checkedDays),
          },
        };
      }
      return h;
    });
    setHabits(updatedHabits);

    // Save to database
    try {
      await updateHabitCheckedDays(habit.habit_id, checkedDays);
    } catch (err) {
      console.error("Error updating today's check:", err);
      // Revert on error
      setHabits(habits);
    }
  };

  // Handle today reading value change (for reading habits)
  const handleTodayReadingChange = async (habit, value) => {
    const readingData = { ...(habit.habit_data?.readingData || {}) };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().split("T")[0];

    const numValue = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      return; // Invalid input
    }

    if (numValue === 0) {
      delete readingData[todayKey];
    } else {
      readingData[todayKey] = numValue;
    }

    // Update local state immediately for responsive UI
    const updatedHabits = habits.map((h) => {
      if (h.habit_id === habit.habit_id) {
        return {
          ...h,
          habit_data: {
            ...h.habit_data,
            readingData: readingData,
          },
        };
      }
      return h;
    });
    setHabits(updatedHabits);

    // Save to database
    try {
      await updateHabitReadingData(habit.habit_id, readingData);
    } catch (err) {
      console.error("Error updating today's reading:", err);
      // Revert on error
      setHabits(habits);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate streak for a habit
  const calculateStreak = (habit) => {
    const isReading = habit.habit_data?.frequency === "reading";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);

      const creationDate = new Date(habit.created_at);
      creationDate.setHours(0, 0, 0, 0);

      // Stop if we've gone before the creation date
      if (checkDate < creationDate) {
        break;
      }

      const dateKey = checkDate.toISOString().split("T")[0];

      if (isReading) {
        // For reading, check if there's any reading data for this day
        const readingData = habit.habit_data?.readingData || {};
        const dayReadingData = readingData[dateKey];
        let hasReading = false;

        if (dayReadingData) {
          if (typeof dayReadingData === "number") {
            // Old format: just a number
            hasReading = dayReadingData > 0;
          } else if (Array.isArray(dayReadingData)) {
            // New format: array of { bookId, value, pagesRead }
            hasReading = dayReadingData.some((entry) => {
              // Check if there's any pagesRead > 0 or value > 0
              return (
                (entry.pagesRead && entry.pagesRead > 0) ||
                (entry.value && entry.value > 0)
              );
            });
          } else if (dayReadingData.value) {
            // Single book entry
            hasReading =
              (dayReadingData.pagesRead && dayReadingData.pagesRead > 0) ||
              (dayReadingData.value && dayReadingData.value > 0);
          }
        }

        if (hasReading) {
          streak++;
        } else {
          break;
        }
      } else {
        // For daily, check if day is checked
        const checkedDays = habit.habit_data?.checkedDays || [];
        if (checkedDays.includes(dateKey)) {
          streak++;
        } else {
          break;
        }
      }
    }
    return streak;
  };

  // Calculate completion rate for a habit
  const calculateCompletionRate = (habit) => {
    const isReading = habit.habit_data?.frequency === "reading";
    const creationDate = new Date(habit.created_at);
    creationDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysSinceCreation =
      Math.ceil((today - creationDate) / (1000 * 60 * 60 * 24)) + 1; // +1 to include creation day

    if (daysSinceCreation <= 0) return 0;

    if (isReading) {
      // For reading, count days with any reading data
      const readingData = habit.habit_data?.readingData || {};
      const daysWithReading = Object.keys(readingData).filter((dateKey) => {
        const dayReadingData = readingData[dateKey];
        if (!dayReadingData) return false;

        // Handle different data formats
        if (typeof dayReadingData === "number") {
          return dayReadingData > 0;
        } else if (Array.isArray(dayReadingData)) {
          // New format: array of { bookId, value, pagesRead }
          return dayReadingData.some((entry) => {
            return (
              (entry.pagesRead && entry.pagesRead > 0) ||
              (entry.value && entry.value > 0)
            );
          });
        } else if (dayReadingData.value) {
          // Single book entry
          return (
            (dayReadingData.pagesRead && dayReadingData.pagesRead > 0) ||
            (dayReadingData.value && dayReadingData.value > 0)
          );
        }
        return false;
      }).length;
      const completionRate = Math.round(
        (daysWithReading / daysSinceCreation) * 100
      );
      return Math.min(completionRate, 100); // Cap at 100%
    } else {
      // For daily, count checked days
      const checkedDays = habit.habit_data?.checkedDays || [];
      const completionRate = Math.round(
        (checkedDays.length / daysSinceCreation) * 100
      );
      return Math.min(completionRate, 100); // Cap at 100%
    }
  };

  // CircularProgress with label component
  const CircularProgressWithLabel = ({ value, size = 60 }) => {
    return (
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress
          variant="determinate"
          value={value}
          size={size}
          thickness={4}
          sx={{
            color: "#667eea",
            "& .MuiCircularProgress-circle": {
              strokeLinecap: "round",
            },
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="caption"
            component="div"
            sx={{ fontWeight: 600, fontSize: "0.75rem" }}
            className="app-text-primary"
          >
            {`${value}%`}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box className="page-container">
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ textAlign: "center", mb: 6, mt: 4 }}>
          <Card
            className="app-card"
            sx={{
              maxWidth: "700px",
              mx: "auto",
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              position: "relative",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 1,
              }}
            >
              <HamburgerMenu />
            </Box>
            <CardContent className="app-card-content-large">
              <Typography
                variant={isMobile ? "h3" : "h2"}
                component="h1"
                className="app-title"
                sx={{ mb: 3, fontWeight: 700 }}
              >
                Build Your Habits
              </Typography>

              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/create")}
                sx={{
                  px: 4,
                  py: 3,
                  fontSize: "1.1rem",
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 600,
                  minHeight: "56px",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                  },
                }}
              >
                Create Habit
              </Button>

              {/* User Habits - show when authenticated */}
              {user && (
                <Box sx={{ mt: 4 }}>
                  <Typography
                    variant="h6"
                    className="app-text-primary"
                    sx={{ mb: 2, textAlign: "center", fontWeight: 600 }}
                  >
                    My Habits
                  </Typography>

                  {loading && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        p: 3,
                      }}
                    >
                      <CircularProgress />
                    </Box>
                  )}

                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  {!loading && !error && habits.length === 0 && (
                    <Box sx={{ p: 3, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        You haven't created any habits yet. Create your first
                        habit to get started!
                      </Typography>
                    </Box>
                  )}

                  {!loading && !error && habits.length > 0 && (
                    <List sx={{ maxWidth: "500px", mx: "auto" }}>
                      {habits.map((habit) => {
                        const streak = calculateStreak(habit);
                        const completionRate = calculateCompletionRate(habit);
                        const isReading =
                          habit.habit_data?.frequency === "reading";

                        return (
                          <ListItem key={habit.habit_id} disablePadding>
                            <ListItemButton
                              onClick={() => handleHabitClick(habit)}
                              sx={{
                                borderRadius: 2,
                                mb: 1,
                                border: "1px solid #e2e8f0",
                                "&:hover": {
                                  backgroundColor: "rgba(102, 126, 234, 0.08)",
                                  borderColor: "#667eea",
                                },
                              }}
                            >
                              {/* Stats Section */}
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 2,
                                  mr: 2,
                                  alignItems: "flex-start",
                                }}
                              >
                                {/* Streak */}
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    minWidth: 50,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      mb: 0.5,
                                      fontSize: "0.7rem",
                                      height: "1.2rem",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    Streak
                                  </Typography>
                                  <Typography
                                    variant="h6"
                                    className="app-text-primary"
                                    fontWeight={700}
                                  >
                                    {streak}
                                  </Typography>
                                </Box>

                                {/* Completion Circle */}
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    minWidth: 70,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      mb: 0.5,
                                      fontSize: "0.7rem",
                                      height: "1.2rem",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    Completion
                                  </Typography>
                                  <CircularProgressWithLabel
                                    value={completionRate}
                                    size={50}
                                  />
                                </Box>
                              </Box>

                              {/* Habit Info */}
                              <ListItemText
                                primary={
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight="medium"
                                    className="app-text-primary"
                                  >
                                    {habit.habit_data?.name || "Untitled Habit"}
                                  </Typography>
                                }
                                secondary={
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      Frequency:{" "}
                                      {habit.habit_data?.frequency || "daily"}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: "block", mt: 0.5 }}
                                    >
                                      Created: {formatDate(habit.created_at)}
                                    </Typography>
                                  </Box>
                                }
                              />

                              {/* Today - Checkbox for both daily and reading habits */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  ml: 2,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isReading) {
                                    // For reading habits, navigate to tracker
                                    handleHabitClick(habit);
                                  }
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ fontSize: "0.875rem" }}
                                >
                                  Today
                                </Typography>
                                {isReading ? (
                                  <Checkbox
                                    checked={isTodayReadingChecked(habit)}
                                    onChange={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleHabitClick(habit);
                                    }}
                                    sx={{
                                      color: "#667eea",
                                      "&.Mui-checked": {
                                        color: "#667eea",
                                      },
                                      cursor: "pointer",
                                      "&:hover": {
                                        backgroundColor:
                                          "rgba(102, 126, 234, 0.08)",
                                      },
                                    }}
                                  />
                                ) : (
                                  <Checkbox
                                    checked={isTodayChecked(habit)}
                                    onChange={(e) =>
                                      handleTodayToggle(habit, e)
                                    }
                                    sx={{
                                      color: "#667eea",
                                      "&.Mui-checked": {
                                        color: "#667eea",
                                      },
                                      "&:hover": {
                                        backgroundColor:
                                          "rgba(102, 126, 234, 0.08)",
                                      },
                                    }}
                                  />
                                )}
                              </Box>
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Box>
              )}

              {/* Instructions for non-authenticated users */}
              {!user && (
                <Box
                  sx={{
                    mt: 4,
                    textAlign: "left",
                    maxWidth: "500px",
                    mx: "auto",
                  }}
                >
                  <Typography
                    variant="h6"
                    className="app-text-primary"
                    sx={{ mb: 3, textAlign: "center", fontWeight: 600 }}
                  >
                    How it works:
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          backgroundColor: "#667eea",
                          color: "white",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          flexShrink: 0,
                          mt: 0.5,
                        }}
                      >
                        1
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create a habit you want to build.
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          backgroundColor: "#667eea",
                          color: "white",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          flexShrink: 0,
                          mt: 0.5,
                        }}
                      >
                        2
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Track your progress daily.
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          backgroundColor: "#667eea",
                          color: "white",
                          borderRadius: "50%",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          flexShrink: 0,
                          mt: 0.5,
                        }}
                      >
                        3
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Build consistency and achieve your goals.
                      </Typography>
                    </Box>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 3,
                      textAlign: "center",
                      fontStyle: "italic",
                      fontWeight: 500,
                    }}
                  >
                    Start your journey to a more productive life.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}

export default HomePage;
