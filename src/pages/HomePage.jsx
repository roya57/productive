import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Tabs,
  Tab,
  IconButton,
  Popover,
  Paper,
} from "@mui/material";
import { AddReaction } from "@mui/icons-material";
import HamburgerMenu from "../components/HamburgerMenu";
import { useAuth } from "../contexts/AuthContext";
import {
  getUserHabitsByType,
  updateHabitCheckedDays,
  updateHabitReadingData,
  upsertHabitReaction,
  removeHabitReaction,
  getUserHabitReactionByDate,
  getAllHabitReactions,
} from "../lib/supabase";
import {
  getTodoistProjects,
  getTodoistTasksByProject,
  getTodoistLabels,
  getTodoistTaskCompletions,
} from "../lib/todoist";

function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [habits, setHabits] = useState({ created: [], tracked: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState(null);
  const [selectedHabitId, setSelectedHabitId] = useState(null);
  const [habitReactions, setHabitReactions] = useState({}); // { habitId: { date: reaction } } - for trackers
  const [receivedReactions, setReceivedReactions] = useState({}); // { habitId: reactions[] } - for creators
  const [todoistConnected, setTodoistConnected] = useState(false);
  const [todoistLoading, setTodoistLoading] = useState(false);
  const [todoistTasks, setTodoistTasks] = useState([]);
  // Store task completions: { taskId: { dates: ['2024-01-15', '2024-01-16', ...] } }
  const [todoistCompletions, setTodoistCompletions] = useState({});

  // Helper function to format date as YYYY-MM-DD (local date, not UTC)
  const formatDateKey = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Check Todoist connection status on mount and after callback, and load tasks
  useEffect(() => {
    const loadTodoistData = async () => {
      if (user?.id) {
        const todoistToken = localStorage.getItem(`todoist_token_${user.id}`);
        const isConnected = !!todoistToken;
        setTodoistConnected(isConnected);

        // Check if we just connected (from callback redirect)
        if (searchParams.get("todoist_connected") === "true") {
          // Clear the query parameter
          navigate("/", { replace: true });
          // Show success message (you can customize this)
          setError(null); // Clear any previous errors
        }

        // Load tasks if connected
        if (isConnected) {
          try {
            setTodoistLoading(true);
            // Get all projects and labels
            const [projects, labels] = await Promise.all([
              getTodoistProjects(),
              getTodoistLabels(),
            ]);

            // Find the "Routines" project
            const routinesProject = projects.find(
              (project) => project.name === "Routines"
            );

            // Find the "track" label
            const trackLabel = labels.find((label) => label.name === "track");

            if (routinesProject) {
              // Get tasks from the Routines project
              const tasks = await getTodoistTasksByProject(routinesProject.id);

              // Filter tasks that have the "track" label
              const filteredTasks = tasks.filter((task) => {
                // Tasks typically have label_ids array containing label IDs
                if (task.label_ids && Array.isArray(task.label_ids)) {
                  // If we found the track label, check if this task has its ID
                  if (trackLabel) {
                    return task.label_ids.includes(trackLabel.id);
                  }
                }
                // Fallback: check if task has labels property with names
                if (task.labels && Array.isArray(task.labels)) {
                  return task.labels.includes("track");
                }
                return false;
              });

              setTodoistTasks(filteredTasks);

              // Fetch completion data for these tasks
              // Note: This may fail due to CORS restrictions - the Sync API requires server-side access
              if (filteredTasks.length > 0) {
                try {
                  const taskIds = filteredTasks.map((task) => String(task.id));
                  const completions = await getTodoistTaskCompletions(taskIds);
                  setTodoistCompletions(completions);
                } catch (err) {
                  console.error("Error loading Todoist completions:", err);
                  // Don't set error state for completion loading failures
                  // This is expected if CORS blocks the request - just continue with empty completions
                  setTodoistCompletions({});
                }
              } else {
                setTodoistCompletions({});
              }
            } else {
              setTodoistTasks([]);
              setTodoistCompletions({});
            }
          } catch (err) {
            console.error("Error loading Todoist tasks:", err);
            setError(`Failed to load Todoist tasks: ${err.message}`);
            setTodoistTasks([]);
            setTodoistCompletions({});
          } finally {
            setTodoistLoading(false);
          }
        }
      }
    };

    loadTodoistData();
  }, [user?.id, searchParams, navigate]);

  useEffect(() => {
    const loadHabits = async () => {
      if (user?.id) {
        try {
          setLoading(true);
          setError(null);
          const userHabits = await getUserHabitsByType(user.id);
          setHabits(userHabits);

          // Load reactions for tracked habits (for today)
          const todayKey = formatDateKey(new Date());

          const reactionsMap = {};
          for (const habit of userHabits.tracked) {
            try {
              const reaction = await getUserHabitReactionByDate(
                habit.habit_id,
                todayKey
              );
              if (reaction && reaction.reaction) {
                reactionsMap[habit.habit_id] = {
                  [todayKey]: reaction.reaction,
                };
              }
            } catch (err) {
              console.error(
                `Error loading reaction for habit ${habit.habit_id}:`,
                err
              );
            }
          }
          setHabitReactions(reactionsMap);

          // Load received reactions for created habits (all reactions from others)
          const receivedReactionsMap = {};
          for (const habit of userHabits.created) {
            try {
              const reactions = await getAllHabitReactions(habit.habit_id);
              if (reactions && reactions.length > 0) {
                receivedReactionsMap[habit.habit_id] = reactions;
              }
            } catch (err) {
              console.error(
                `Error loading received reactions for habit ${habit.habit_id}:`,
                err
              );
            }
          }
          setReceivedReactions(receivedReactionsMap);
        } catch (err) {
          console.error("Error loading habits:", err);
          setError("Failed to load your habits. Please try again.");
        } finally {
          setLoading(false);
        }
      } else {
        setHabits({ created: [], tracked: [] });
        setHabitReactions({});
      }
    };

    loadHabits();
  }, [user?.id]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle Todoist connection
  const handleConnectTodoist = () => {
    const clientId = import.meta.env.VITE_TODOIST_CLIENT_ID || "";
    // Redirect URI must match what's configured in Todoist App Management Console
    const redirectUri = `${window.location.origin}/todoist/callback`;
    const state = user?.id || "state"; // Use user ID as state for CSRF protection
    const scope = "data:read";

    if (!clientId) {
      setError("Todoist Client ID not configured. Please contact support.");
      return;
    }

    const authUrl = `https://todoist.com/oauth/authorize?client_id=${clientId}&scope=${scope}&state=${state}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
    window.location.href = authUrl;
  };

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
    const isCreated = habits.created.some((h) => h.habit_id === habit.habit_id);
    const habitList = isCreated ? habits.created : habits.tracked;
    const updatedHabitList = habitList.map((h) => {
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
    setHabits({
      created: isCreated ? updatedHabitList : habits.created,
      tracked: isCreated ? habits.tracked : updatedHabitList,
    });

    // Save to database
    try {
      await updateHabitCheckedDays(habit.habit_id, checkedDays);
    } catch (err) {
      console.error("Error updating today's check:", err);
      // Revert on error - reload habits
      const userHabits = await getUserHabitsByType(user.id);
      setHabits(userHabits);
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
    const isCreated = habits.created.some((h) => h.habit_id === habit.habit_id);
    const habitList = isCreated ? habits.created : habits.tracked;
    const updatedHabitList = habitList.map((h) => {
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
    setHabits({
      created: isCreated ? updatedHabitList : habits.created,
      tracked: isCreated ? habits.tracked : updatedHabitList,
    });

    // Save to database
    try {
      await updateHabitReadingData(habit.habit_id, readingData);
    } catch (err) {
      console.error("Error updating today's reading:", err);
      // Revert on error - reload habits
      const userHabits = await getUserHabitsByType(user.id);
      setHabits(userHabits);
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

  // Mini Calendar component for tracked habits
  const MiniCalendar = ({ habit }) => {
    const isReading = habit.habit_data?.frequency === "reading";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get the last 35 days (5 weeks x 7 days)
    const days = [];
    for (let i = 34; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }

    // Check if a day has habit data
    const isDayDone = (date) => {
      const dateKey = date.toISOString().split("T")[0];
      const creationDate = new Date(habit.created_at);
      creationDate.setHours(0, 0, 0, 0);

      // Don't show days before creation
      if (date < creationDate) {
        return null; // null means don't show (before creation)
      }

      if (isReading) {
        const readingData = habit.habit_data?.readingData || {};
        const dayReadingData = readingData[dateKey];
        if (!dayReadingData) return false;

        // Handle different data formats
        if (typeof dayReadingData === "number") {
          return dayReadingData > 0;
        } else if (Array.isArray(dayReadingData)) {
          return dayReadingData.some((entry) => {
            return (
              (entry.pagesRead && entry.pagesRead > 0) ||
              (entry.value && entry.value > 0)
            );
          });
        } else if (dayReadingData.value) {
          return (
            (dayReadingData.pagesRead && dayReadingData.pagesRead > 0) ||
            (dayReadingData.value && dayReadingData.value > 0)
          );
        }
        return false;
      } else {
        const checkedDays = habit.habit_data?.checkedDays || [];
        return checkedDays.includes(dateKey);
      }
    };

    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.3,
          width: "fit-content",
        }}
      >
        {days.map((day, index) => {
          const done = isDayDone(day);
          return (
            <Box
              key={index}
              sx={{
                width: 10,
                height: 10,
                borderRadius: "1px",
                backgroundColor:
                  done === null ? "transparent" : done ? "#667eea" : "#e2e8f0",
                border: done === null ? "none" : "1px solid #f0f0f0",
              }}
              title={
                done === null
                  ? ""
                  : day.toLocaleDateString() + (done ? " ✓" : " ✗")
              }
            />
          );
        })}
      </Box>
    );
  };

  // Render habit list
  const renderHabitList = (habitList, emptyMessage, isTracked = false) => {
    if (loading) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            p: 3,
          }}
        >
          <CircularProgress />
        </Box>
      );
    }

    if (habitList.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      );
    }

    return (
      <List sx={{ maxWidth: "500px", mx: "auto" }}>
        {habitList.map((habit) => {
          const streak = calculateStreak(habit);
          const completionRate = calculateCompletionRate(habit);
          const isReading = habit.habit_data?.frequency === "reading";

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
                {isTracked ? (
                  // Grid layout for tracked habits
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    {/* Habit Info - First Column */}
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
                        !isMobile ? (
                          <>
                            Frequency: {habit.habit_data?.frequency || "daily"}
                            {habit.habit_data?.user_id && (
                              <>
                                {"\n"}
                                Created by:{" "}
                                {habit.habit_data?.creator_name ||
                                  "Unknown User"}
                              </>
                            )}
                            {"\n"}
                            Created: {formatDate(habit.created_at)}
                          </>
                        ) : null
                      }
                    />

                    {/* Mini Calendar - Second Column (Centered) */}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
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
                        Last 35 days
                      </Typography>
                      <MiniCalendar habit={habit} />
                    </Box>

                    {/* Emoji Button - Third Column */}
                    <Box sx={{ position: "relative" }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmojiPickerAnchor(e.currentTarget);
                          setSelectedHabitId(habit.habit_id);
                        }}
                        sx={{
                          padding: 1.5,
                          "&:hover": {
                            backgroundColor: "rgba(102, 126, 234, 0.1)",
                          },
                        }}
                      >
                        {(() => {
                          const todayKey = formatDateKey(new Date());
                          const todayReaction =
                            habitReactions[habit.habit_id]?.[todayKey];
                          const emojiMap = { clap: "👏", eyes: "👀" };
                          return todayReaction ? (
                            <Typography sx={{ fontSize: "1.2rem" }}>
                              {emojiMap[todayReaction]}
                            </Typography>
                          ) : (
                            <AddReaction
                              fontSize="small"
                              sx={{ color: "#667eea" }}
                            />
                          );
                        })()}
                      </IconButton>
                    </Box>
                  </Box>
                ) : (
                  // Grid layout for created habits
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "auto auto auto auto auto",
                      alignItems: "center",
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    {/* Habit Info - First Column */}
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
                        !isMobile ? (
                          <>
                            Frequency: {habit.habit_data?.frequency || "daily"}
                            {"\n"}
                            Created: {formatDate(habit.created_at)}
                          </>
                        ) : null
                      }
                    />

                    {/* Streak - Second Column */}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
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

                    {/* Completion Circle - Third Column */}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
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

                    {/* Today - Checkbox - Fourth Column */}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
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
                              backgroundColor: "rgba(102, 126, 234, 0.08)",
                            },
                          }}
                        />
                      ) : (
                        <Checkbox
                          checked={isTodayChecked(habit)}
                          onChange={(e) => handleTodayToggle(habit, e)}
                          sx={{
                            color: "#667eea",
                            "&.Mui-checked": {
                              color: "#667eea",
                            },
                            "&:hover": {
                              backgroundColor: "rgba(102, 126, 234, 0.08)",
                            },
                          }}
                        />
                      )}
                    </Box>

                    {/* Reactions Received - Fifth Column (for creators) */}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: "0.7rem",
                          height: "1.2rem",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        Reactions
                      </Typography>
                      {(() => {
                        const reactions =
                          receivedReactions[habit.habit_id] || [];
                        const todayKey = formatDateKey(new Date());
                        const todayReactions = reactions.filter(
                          (r) => r.reaction_date === todayKey
                        );
                        const emojiMap = { clap: "👏", eyes: "👀" };

                        if (todayReactions.length > 0) {
                          // Count reactions by type
                          const reactionCounts = todayReactions.reduce(
                            (acc, reaction) => {
                              acc[reaction.reaction] =
                                (acc[reaction.reaction] || 0) + 1;
                              return acc;
                            },
                            {}
                          );

                          return (
                            <Box
                              sx={{
                                display: "flex",
                                gap: 0.75,
                                alignItems: "center",
                                flexWrap: "wrap",
                                justifyContent: "center",
                              }}
                            >
                              {Object.entries(reactionCounts).map(
                                ([reactionType, count]) => (
                                  <Box
                                    key={reactionType}
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.25,
                                    }}
                                  >
                                    <Typography sx={{ fontSize: "1rem" }}>
                                      {emojiMap[reactionType]}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {count}
                                    </Typography>
                                  </Box>
                                )
                              )}
                            </Box>
                          );
                        } else {
                          return (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.75rem" }}
                            >
                              {reactions.length > 0
                                ? `${reactions.length} total`
                                : "None"}
                            </Typography>
                          );
                        }
                      })()}
                    </Box>
                  </Box>
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    );
  };

  // Handle emoji selection (for today's date)
  const handleEmojiSelect = async (reaction) => {
    if (!selectedHabitId) return;

    try {
      const todayKey = formatDateKey(new Date());

      // Convert emoji to reaction type
      const reactionMap = { "👏": "clap", "👀": "eyes" };
      const reactionType = reactionMap[reaction] || reaction;

      if (reactionType === "clap" || reactionType === "eyes") {
        // Upsert reaction in database
        await upsertHabitReaction(selectedHabitId, todayKey, reactionType);

        // Update local state
        setHabitReactions((prev) => ({
          ...prev,
          [selectedHabitId]: {
            ...(prev[selectedHabitId] || {}),
            [todayKey]: reactionType,
          },
        }));
      }
    } catch (err) {
      console.error("Error saving reaction:", err);
      setError("Failed to save reaction. Please try again.");
    } finally {
      setEmojiPickerAnchor(null);
      setSelectedHabitId(null);
    }
  };

  // Handle removing reaction
  const handleRemoveReaction = async () => {
    if (!selectedHabitId) return;

    try {
      const todayKey = formatDateKey(new Date());

      // Remove reaction from database
      await removeHabitReaction(selectedHabitId, todayKey);

      // Update local state
      setHabitReactions((prev) => {
        const updated = { ...prev };
        if (updated[selectedHabitId]) {
          const habitReactions = { ...updated[selectedHabitId] };
          delete habitReactions[todayKey];
          if (Object.keys(habitReactions).length === 0) {
            delete updated[selectedHabitId];
          } else {
            updated[selectedHabitId] = habitReactions;
          }
        }
        return updated;
      });
    } catch (err) {
      console.error("Error removing reaction:", err);
      setError("Failed to remove reaction. Please try again.");
    } finally {
      setEmojiPickerAnchor(null);
      setSelectedHabitId(null);
    }
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
                <Card className="app-card" sx={{ mt: 4 }}>
                  <CardContent>
                    <Typography variant="h5" gutterBottom>
                      My Habits
                    </Typography>

                    {error && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                      </Alert>
                    )}

                    <Box
                      sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
                    >
                      <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        aria-label="habit tabs"
                        sx={{
                          "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 500,
                            minHeight: 48,
                          },
                        }}
                      >
                        <Tab
                          label={`Created (${habits.created.length})`}
                          id="created-tab"
                          aria-controls="created-panel"
                        />
                        <Tab
                          label={`Tracked (${habits.tracked.length})`}
                          id="tracked-tab"
                          aria-controls="tracked-panel"
                        />
                        <Tab
                          label="Todoist"
                          id="todoist-tab"
                          aria-controls="todoist-panel"
                        />
                      </Tabs>
                    </Box>

                    <Box
                      role="tabpanel"
                      hidden={activeTab !== 0}
                      id="created-panel"
                      aria-labelledby="created-tab"
                    >
                      {renderHabitList(
                        habits.created,
                        "You haven't created any habits yet. Create your first habit to get started!",
                        false
                      )}
                    </Box>

                    <Box
                      role="tabpanel"
                      hidden={activeTab !== 1}
                      id="tracked-panel"
                      aria-labelledby="tracked-tab"
                    >
                      {renderHabitList(
                        habits.tracked,
                        "You haven't tracked any habits yet. Browse habits to get started!",
                        true
                      )}
                    </Box>

                    <Box
                      role="tabpanel"
                      hidden={activeTab !== 2}
                      id="todoist-panel"
                      aria-labelledby="todoist-tab"
                    >
                      {!todoistConnected ? (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            py: 8,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ mb: 3, color: "text.secondary" }}
                          >
                            Connect to Todoist to view your completed tasks
                          </Typography>
                          <Button
                            variant="contained"
                            size="large"
                            onClick={handleConnectTodoist}
                            disabled={todoistLoading}
                            sx={{
                              px: 4,
                              py: 1.5,
                              fontSize: "1rem",
                              borderRadius: "8px",
                              textTransform: "none",
                              fontWeight: 600,
                              background:
                                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              "&:hover": {
                                background:
                                  "linear-gradient(135deg, #5568d3 0%, #6a4190 100%)",
                              },
                            }}
                          >
                            Connect to Todoist
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ py: 2 }}>
                          {todoistLoading ? (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                py: 4,
                              }}
                            >
                              <CircularProgress />
                              <Typography variant="body2" sx={{ ml: 2 }}>
                                Loading tasks...
                              </Typography>
                            </Box>
                          ) : todoistTasks.length > 0 ? (
                            <Box>
                              <List>
                                {todoistTasks.map((task) => {
                                  // Get number of days in current month
                                  const now = new Date();
                                  const currentYear = now.getFullYear();
                                  const currentMonth = now.getMonth();
                                  const daysInMonth = new Date(
                                    currentYear,
                                    currentMonth + 1,
                                    0
                                  ).getDate();

                                  const currentDay = now.getDate();

                                  // Get completion dates for this task
                                  const taskCompletions = todoistCompletions[
                                    task.id
                                  ] || { dates: [] };
                                  const completionDates =
                                    taskCompletions.dates || [];

                                  return (
                                    <ListItem
                                      key={task.id}
                                      sx={{
                                        flexDirection: "column",
                                        alignItems: "flex-start",
                                      }}
                                    >
                                      <ListItemText
                                        primary={task.content}
                                        {...(task.description && {
                                          secondary: task.description,
                                        })}
                                      />
                                      <Box
                                        sx={{
                                          display: "flex",
                                          gap: 0.5,
                                          mt: 1,
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {Array.from(
                                          { length: daysInMonth },
                                          (_, i) => i + 1
                                        ).map((day) => {
                                          const isFutureDay = day > currentDay;

                                          // Check if task was completed on this day
                                          const dayDate = formatDateKey(
                                            new Date(
                                              currentYear,
                                              currentMonth,
                                              day
                                            )
                                          );
                                          const isCompleted =
                                            completionDates.includes(dayDate);

                                          return (
                                            <Box
                                              key={day}
                                              sx={{
                                                width: 28,
                                                height: 28,
                                                backgroundColor: isCompleted
                                                  ? "success.light"
                                                  : "grey.300",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                borderRadius: 1,
                                                fontSize: "0.75rem",
                                                color: isFutureDay
                                                  ? "grey.500"
                                                  : "text.primary",
                                              }}
                                            >
                                              {day}
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </ListItem>
                                  );
                                })}
                              </List>
                            </Box>
                          ) : (
                            <Typography variant="body1" color="text.secondary">
                              No tasks found in "Routines" project with "track"
                              label.
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
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

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiPickerAnchor)}
        anchorEl={emojiPickerAnchor}
        onClose={() => {
          setEmojiPickerAnchor(null);
          setSelectedHabitId(null);
        }}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
      >
        <Paper
          sx={{
            p: 1.5,
            display: "flex",
            gap: 1,
            alignItems: "center",
          }}
        >
          <IconButton
            onClick={() => handleEmojiSelect("👏")}
            sx={{
              fontSize: "1.5rem",
              "&:hover": {
                backgroundColor: "rgba(102, 126, 234, 0.1)",
                transform: "scale(1.1)",
              },
              transition: "all 0.2s ease",
            }}
          >
            👏
          </IconButton>
          <IconButton
            onClick={() => handleEmojiSelect("👀")}
            sx={{
              fontSize: "1.5rem",
              "&:hover": {
                backgroundColor: "rgba(102, 126, 234, 0.1)",
                transform: "scale(1.1)",
              },
              transition: "all 0.2s ease",
            }}
          >
            👀
          </IconButton>
          {selectedHabitId &&
            (() => {
              const todayKey = formatDateKey(new Date());
              const hasReaction = habitReactions[selectedHabitId]?.[todayKey];
              return hasReaction ? (
                <IconButton
                  onClick={handleRemoveReaction}
                  sx={{
                    fontSize: "1rem",
                    color: "text.secondary",
                    ml: 1,
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.05)",
                    },
                  }}
                >
                  Remove
                </IconButton>
              ) : null;
            })()}
        </Paper>
      </Popover>
    </Box>
  );
}

export default HomePage;
