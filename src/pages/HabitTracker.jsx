import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  IconButton,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import HamburgerMenu from "../components/HamburgerMenu";
import { getHabit, updateHabitCheckedDays } from "../lib/supabase";

function HabitTracker() {
  const navigate = useNavigate();
  const location = useLocation();
  const { habitName, habitId, createdAt } = location.state || {
    habitName: "My Habit",
    habitId: null,
    createdAt: new Date().toISOString(),
  };
  
  // Parse creation date and set initial currentDate to the month containing creation date
  const creationDate = new Date(createdAt);
  creationDate.setHours(0, 0, 0, 0);
  
  // Initialize currentDate to the month of creation (or current month if creation is in the past)
  const initialDate = new Date(creationDate);
  initialDate.setDate(1); // Start of the month
  
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [checkedDays, setCheckedDays] = useState(new Set());
  const [saving, setSaving] = useState(false);

  // Load checked days from database on mount
  useEffect(() => {
    const loadCheckedDays = async () => {
      if (habitId) {
        try {
          const habit = await getHabit(habitId);
          if (habit?.habit_data?.checkedDays) {
            setCheckedDays(new Set(habit.habit_data.checkedDays));
          }
        } catch (err) {
          console.error("Error loading checked days:", err);
        }
      }
    };

    loadCheckedDays();
  }, [habitId]);

  // Get the first day of the current month
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  // Convert to Monday = 0 format
  const firstDayMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Get all days in the month
  const daysInMonth = lastDayOfMonth.getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Day names
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Create a date string key for a given day
  const getDateKey = (day) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    return date.toISOString().split("T")[0]; // YYYY-MM-DD format
  };

  // Handle checkbox toggle
  const handleToggle = async (day) => {
    const dateKey = getDateKey(day);
    const newCheckedDays = new Set(checkedDays);
    
    if (newCheckedDays.has(dateKey)) {
      newCheckedDays.delete(dateKey);
    } else {
      newCheckedDays.add(dateKey);
    }
    
    // Update local state immediately for responsive UI
    setCheckedDays(newCheckedDays);
    
    // Save to database if habitId exists
    if (habitId) {
      try {
        setSaving(true);
        await updateHabitCheckedDays(habitId, newCheckedDays);
      } catch (err) {
        console.error("Error saving checked day:", err);
        // Revert on error
        setCheckedDays(checkedDays);
      } finally {
        setSaving(false);
      }
    }
  };

  // Navigate to previous month (only if not before creation date)
  const handlePreviousMonth = () => {
    const previousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );
    const creationMonth = new Date(
      creationDate.getFullYear(),
      creationDate.getMonth(),
      1
    );
    
    // Only allow navigation if previous month is not before creation month
    if (previousMonth >= creationMonth) {
      setCurrentDate(previousMonth);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };
  
  // Check if previous month button should be disabled
  const canGoPrevious = () => {
    const previousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );
    const creationMonth = new Date(
      creationDate.getFullYear(),
      creationDate.getMonth(),
      1
    );
    return previousMonth >= creationMonth;
  };

  // Get month name
  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Check if a day is valid for checking (must be on or after creation date and not in the future)
  const isValidDay = (day) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    date.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Day must be on or after creation date and not in the future
    return date >= creationDate && date <= today;
  };
  
  // Check if a day is before creation date (should be grayed out)
  const isBeforeCreation = (day) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    date.setHours(0, 0, 0, 0);
    return date < creationDate;
  };

  // Calculate streak (consecutive checked days from today backwards, starting from creation date)
  const calculateStreak = () => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from today and go backwards to creation date
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      // Stop if we've gone before the creation date
      if (checkDate < creationDate) {
        break;
      }
      
      const dateKey = checkDate.toISOString().split("T")[0];

      if (checkedDays.has(dateKey)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  return (
    <Box className="page-container">
      <Container maxWidth="md">
        <Card className="app-card" sx={{ position: "relative" }}>
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
          <CardContent className="app-card-content">
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              align="center"
              className="app-title"
              sx={{ mb: 1 }}
            >
              {habitName}
            </Typography>

            <Typography
              variant="h6"
              align="center"
              color="text.secondary"
              className="app-subtitle"
              sx={{ mb: 3 }}
            >
              Track your daily progress
            </Typography>

            {/* Month Navigation */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 3,
              }}
            >
              <IconButton
                onClick={handlePreviousMonth}
                disabled={!canGoPrevious()}
                sx={{
                  color: "primary.main",
                  "&:hover": {
                    backgroundColor: "rgba(102, 126, 234, 0.1)",
                  },
                  "&:disabled": {
                    opacity: 0.3,
                  },
                }}
              >
                <ChevronLeft />
              </IconButton>
              <Typography variant="h5" fontWeight={600}>
                {monthName}
              </Typography>
              <IconButton
                onClick={handleNextMonth}
                sx={{
                  color: "primary.main",
                  "&:hover": {
                    backgroundColor: "rgba(102, 126, 234, 0.1)",
                  },
                }}
              >
                <ChevronRight />
              </IconButton>
            </Box>

            {/* Calendar Grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 1,
                mb: 3,
              }}
            >
              {/* Day Headers */}
              {dayNames.map((day) => (
                <Box
                  key={day}
                  sx={{
                    textAlign: "center",
                    fontWeight: 600,
                    color: "#4a5568",
                    padding: 1,
                    fontSize: "0.875rem",
                    backgroundColor: "#f5f5f5",
                    borderRadius: 1,
                  }}
                >
                  {day}
                </Box>
              ))}

              {/* Empty cells for days before the first day of the month */}
              {Array.from({ length: firstDayMonday }).map((_, index) => (
                <Box key={`empty-${index}`} sx={{ height: 60 }} />
              ))}

              {/* Calendar Days */}
              {days.map((day) => {
                const dateKey = getDateKey(day);
                const isChecked = checkedDays.has(dateKey);
                const isValid = isValidDay(day);
                const isBefore = isBeforeCreation(day);
                const isToday =
                  day === new Date().getDate() &&
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear();
                
                // Check if this is the creation date
                const dayDate = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
                );
                dayDate.setHours(0, 0, 0, 0);
                const isCreationDate =
                  dayDate.getTime() === creationDate.getTime();

                return (
                  <Box
                    key={day}
                    onClick={() => isValid && handleToggle(day)}
                    sx={{
                      height: 60,
                      border: isToday
                        ? "2px solid #667eea"
                        : isCreationDate
                        ? "2px solid #764ba2"
                        : "2px solid #e2e8f0",
                      borderRadius: 2,
                      backgroundColor: isChecked ? "#667eea" : "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isValid ? "pointer" : "not-allowed",
                      transition: "all 0.2s ease",
                      opacity: isValid ? 1 : isBefore ? 0.3 : 0.5,
                      position: "relative",
                      "&:hover": isValid
                        ? {
                            borderColor: "#667eea",
                            backgroundColor: isChecked ? "#5a6fd8" : "#f5f5f5",
                            transform: "scale(1.05)",
                          }
                        : {},
                    }}
                  >
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
                        sx={{
                          fontWeight: isToday || isCreationDate ? 700 : 500,
                          color: isChecked ? "white" : "#2d3748",
                          fontSize: "0.75rem",
                        }}
                      >
                        {day}
                      </Typography>
                      {isChecked && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: "white",
                          }}
                        />
                      )}
                      {isCreationDate && !isChecked && (
                        <Box
                          sx={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            backgroundColor: "#764ba2",
                            position: "absolute",
                            bottom: 4,
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Stats */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-around",
                mt: 3,
                pt: 3,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h4"
                  className="app-text-primary"
                  fontWeight={700}
                >
                  {streak}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Day Streak
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h4"
                  className="app-text-primary"
                  fontWeight={700}
                >
                  {checkedDays.size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Days
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h4"
                  className="app-text-primary"
                  fontWeight={700}
                >
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysSinceCreation = Math.ceil(
                      (today - creationDate) / (1000 * 60 * 60 * 24)
                    ) + 1; // +1 to include creation day
                    const validDaysInMonth = days.filter((day) =>
                      isValidDay(day)
                    ).length;
                    const totalDays = daysSinceCreation > 0 ? daysSinceCreation : validDaysInMonth;
                    return totalDays > 0
                      ? Math.round((checkedDays.size / totalDays) * 100)
                      : 0;
                  })()}
                  %
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completion Rate
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default HabitTracker;
