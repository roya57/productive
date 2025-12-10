import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  IconButton,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Select,
  MenuItem,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Tooltip,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Add,
  Delete,
  ContentCopy,
} from "@mui/icons-material";
import HamburgerMenu from "../components/HamburgerMenu";
import {
  getHabit,
  updateHabitCheckedDays,
  updateHabitReadingData,
  updateHabitBooks,
  addHabitToUser,
  getUserHabits,
} from "../lib/supabase";

function HabitTracker() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { habitId: habitIdFromParams } = useParams();

  // Get habitId from URL params (preferred) or location state (fallback)
  const habitIdFromState = location.state?.habitId;
  const habitId = habitIdFromParams || habitIdFromState;

  const [habit, setHabit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  // Get habit data from state (if available) or load from database
  const habitName =
    location.state?.habitName || habit?.habit_data?.name || "My Habit";
  const frequency =
    location.state?.frequency || habit?.habit_data?.frequency || "daily";
  const createdAt =
    location.state?.createdAt || habit?.created_at || new Date().toISOString();

  const isReading = frequency === "reading";

  // Load habit from database if habitId is in URL
  useEffect(() => {
    const loadHabit = async () => {
      if (habitIdFromParams) {
        try {
          setLoading(true);
          setError(null);
          const habitData = await getHabit(habitIdFromParams);
          setHabit(habitData);

          // Check if user is already tracking this habit
          if (user?.id) {
            try {
              const userHabits = await getUserHabits(user.id);
              const isUserTracking = userHabits.some(
                (h) => h.habit_id === habitIdFromParams
              );
              setIsTracking(isUserTracking);
            } catch (err) {
              console.error("Error checking tracking status:", err);
            }
          }
        } catch (err) {
          console.error("Error loading habit:", err);
          setError(
            "Failed to load habit. Please check if the habit ID is correct."
          );
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadHabit();
  }, [habitIdFromParams, user?.id]);

  // Parse creation date and set initial currentDate to the month containing creation date
  const creationDate = new Date(createdAt);
  creationDate.setHours(0, 0, 0, 0);

  // Initialize currentDate to the month of creation (or current month if creation is in the past)
  const initialDate = new Date(creationDate);
  initialDate.setDate(1); // Start of the month

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [checkedDays, setCheckedDays] = useState(new Set());
  const [readingData, setReadingData] = useState({}); // Object with date keys and array of { bookId, value }
  const [saving, setSaving] = useState(false);

  // Book tracking states (for reading habits)
  const [books, setBooks] = useState([]); // Array of { id, name, totalPages, trackingMode }
  const [newBookName, setNewBookName] = useState("");
  const [newBookTotalPages, setNewBookTotalPages] = useState("");
  const [newBookTrackingMode, setNewBookTrackingMode] = useState("pages"); // "pages" or "percentage"

  // Modal state for reading progress
  const [readingModalOpen, setReadingModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalBookValues, setModalBookValues] = useState({}); // { bookId: value }

  // Copy URL state
  const [copySuccess, setCopySuccess] = useState(false);

  // Load data from database on mount or when habit is loaded
  useEffect(() => {
    const loadHabitData = async () => {
      // Use loaded habit if available, otherwise fetch from database
      let habitToUse = habit;

      if (!habitToUse && habitId) {
        try {
          habitToUse = await getHabit(habitId);
        } catch (err) {
          console.error("Error loading habit data:", err);
          return;
        }
      }

      if (habitToUse) {
        try {
          if (isReading) {
            // Load reading data
            if (habitToUse?.habit_data?.readingData) {
              setReadingData(habitToUse.habit_data.readingData);
            }
            // Load books
            if (habitToUse?.habit_data?.books) {
              setBooks(habitToUse.habit_data.books);
            }
          } else {
            // Load checked days
            if (habitToUse?.habit_data?.checkedDays) {
              setCheckedDays(new Set(habitToUse.habit_data.checkedDays));
            }
          }
        } catch (err) {
          console.error("Error processing habit data:", err);
        }
      }
    };

    loadHabitData();
  }, [habitId, isReading, habit]);

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

  // Handle checkbox toggle (for daily habits)
  const handleToggle = async (day) => {
    // Only allow creators to toggle
    if (!isCreator) return;

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

  // Handle reading day click - open modal
  const handleReadingDayClick = (day) => {
    // Only allow creators to edit reading data
    if (!isCreator) return;
    if (!isValidDay(day) || books.length === 0) return;

    const dateKey = getDateKey(day);
    setSelectedDate(dateKey);

    // Load existing values for this date
    const dayReadingData = readingData[dateKey];
    const initialValues = {};

    if (dayReadingData) {
      // Handle both old format (number) and new format (object or array)
      if (typeof dayReadingData === "number") {
        // Old format - assign to first book if exists
        if (books.length > 0) {
          initialValues[books[0].id] = dayReadingData;
        }
      } else if (Array.isArray(dayReadingData)) {
        // New format - array of { bookId, value }
        dayReadingData.forEach((entry) => {
          if (entry.bookId && entry.value) {
            initialValues[entry.bookId] = entry.value;
          }
        });
      } else if (dayReadingData.bookId && dayReadingData.value) {
        // Single book entry
        initialValues[dayReadingData.bookId] = dayReadingData.value;
      }
    }

    setModalBookValues(initialValues);
    setReadingModalOpen(true);
  };

  // Helper function to get yesterday's date key
  const getYesterdayDateKey = (dateKey) => {
    const date = new Date(dateKey);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
  };

  // Helper function to get yesterday's value for a book
  const getYesterdayBookValue = (bookId, dateKey) => {
    const yesterdayKey = getYesterdayDateKey(dateKey);
    const yesterdayData = readingData[yesterdayKey];

    if (!yesterdayData) return null;

    // Handle different data formats
    if (Array.isArray(yesterdayData)) {
      const bookEntry = yesterdayData.find((entry) => entry.bookId === bookId);
      return bookEntry ? bookEntry.value : null;
    } else if (
      typeof yesterdayData === "object" &&
      yesterdayData.bookId === bookId
    ) {
      return yesterdayData.value;
    } else if (
      typeof yesterdayData === "number" &&
      books.length > 0 &&
      books[0].id === bookId
    ) {
      // Old format - assume first book
      return yesterdayData;
    }

    return null;
  };

  // Handle saving reading progress from modal
  const handleSaveReadingProgress = async () => {
    if (!habitId || !selectedDate) return;

    // Build reading data array for this date with calculated pages
    const dayEntries = [];
    books.forEach((book) => {
      const value = modalBookValues[book.id];
      if (value !== undefined && value !== "" && parseFloat(value) > 0) {
        const inputValue = parseFloat(value);
        let pagesRead = 0;

        if (book.trackingMode === "pages") {
          // For Page Number: subtract yesterday's value from today's value
          const yesterdayValue = getYesterdayBookValue(book.id, selectedDate);
          if (yesterdayValue !== null) {
            pagesRead = Math.max(0, inputValue - yesterdayValue);
          } else {
            // If no yesterday data, assume all pages read today
            pagesRead = inputValue;
          }
        } else if (book.trackingMode === "percentage") {
          // For Percentage: calculate pages based on percentage and total pages
          pagesRead = Math.round((inputValue / 100) * book.totalPages);
        }

        dayEntries.push({
          bookId: book.id,
          value: inputValue,
          pagesRead: pagesRead,
        });
      }
    });

    // Update reading data
    const newReadingData = { ...readingData };
    if (dayEntries.length > 0) {
      newReadingData[selectedDate] = dayEntries;
    } else {
      delete newReadingData[selectedDate];
    }

    // Update local state
    setReadingData(newReadingData);

    // Save to database
    setSaving(true);
    try {
      await updateHabitReadingData(habitId, newReadingData);
      setReadingModalOpen(false);
      setSelectedDate(null);
      setModalBookValues({});
    } catch (err) {
      console.error("Error saving reading data:", err);
      // Revert on error
      setReadingData(readingData);
    } finally {
      setSaving(false);
    }
  };

  // Handle closing modal without saving
  const handleCloseReadingModal = () => {
    setReadingModalOpen(false);
    setSelectedDate(null);
    setModalBookValues({});
  };

  // Copy habit URL to clipboard
  const handleCopyUrl = async () => {
    try {
      const habitUrl = window.location.href;
      await navigator.clipboard.writeText(habitUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Hide after 2 seconds
    } catch (err) {
      console.error("Failed to copy URL:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Handle tracking a habit
  const handleTrackHabit = async () => {
    if (!user?.id || !habitId) {
      // Redirect to sign in if not authenticated
      navigate(
        "/signin?returnTo=" + encodeURIComponent(window.location.pathname)
      );
      return;
    }

    try {
      setIsTrackingLoading(true);
      await addHabitToUser(user.id, habitId);
      setIsTracking(true);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Error tracking habit:", err);
      setError("Failed to track habit. Please try again.");
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // Check if current user is the creator of the habit
  const isCreator = user?.id && habit?.habit_data?.user_id === user.id;

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

      if (isReading) {
        // For reading, check if there's any reading data for this day
        const dayReadingData = readingData[dateKey];
        let hasReading = false;

        if (dayReadingData) {
          if (typeof dayReadingData === "number") {
            hasReading = dayReadingData > 0;
          } else if (Array.isArray(dayReadingData)) {
            hasReading = dayReadingData.some((entry) => entry.value > 0);
          } else if (dayReadingData.value) {
            hasReading = dayReadingData.value > 0;
          }
        }

        if (hasReading) {
          streak++;
        } else {
          break;
        }
      } else {
        // For daily, check if day is checked
        if (checkedDays.has(dateKey)) {
          streak++;
        } else {
          break;
        }
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  // Show loading state
  if (loading) {
    return (
      <Box className="page-container">
        <Container maxWidth="md">
          <Card className="app-card">
            <CardContent className="app-card-content">
              <Typography variant="h6" align="center" color="text.secondary">
                Loading habit...
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box className="page-container">
        <Container maxWidth="md">
          <Card className="app-card">
            <CardContent className="app-card-content">
              <Typography variant="h6" align="center" color="error">
                {error}
              </Typography>
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Button
                  variant="contained"
                  onClick={() => navigate("/")}
                  sx={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  Go to Home
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  // Show error if no habitId
  if (!habitId) {
    return (
      <Box className="page-container">
        <Container maxWidth="md">
          <Card className="app-card">
            <CardContent className="app-card-content">
              <Typography variant="h6" align="center" color="error">
                Habit not found. Please select a habit from the home page.
              </Typography>
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Button
                  variant="contained"
                  onClick={() => navigate("/")}
                  sx={{
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  Go to Home
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

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

            {/* Habit URL Sharing Section - Only for creators */}
            {habitId && isCreator && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  backgroundColor: "#f8f9fa",
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  variant="body2"
                  align="center"
                  color="text.secondary"
                  gutterBottom
                  sx={{ mb: 1 }}
                >
                  Share this habit:
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <TextField
                    value={
                      typeof window !== "undefined" ? window.location.href : ""
                    }
                    size="small"
                    variant="outlined"
                    InputProps={{
                      readOnly: true,
                      sx: {
                        fontSize: "0.875rem",
                        "& .MuiOutlinedInput-input": { padding: "8px 12px" },
                      },
                    }}
                    sx={{
                      minWidth: "200px",
                      maxWidth: "400px",
                      flex: 1,
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "white",
                      },
                    }}
                  />
                  <Tooltip title="Copy URL">
                    <IconButton
                      onClick={handleCopyUrl}
                      size="small"
                      sx={{
                        color: "#667eea",
                        "&:hover": {
                          backgroundColor: "rgba(102, 126, 234, 0.08)",
                        },
                      }}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}

            {/* Track Habit Button - Only for non-creators */}
            {habitId && !isCreator && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  backgroundColor: "#f8f9fa",
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                  textAlign: "center",
                }}
              >
                {isTracking ? (
                  <Typography
                    variant="body2"
                    color="success.main"
                    sx={{ fontWeight: 500 }}
                  >
                    ✓ You are tracking this habit
                  </Typography>
                ) : (
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                      sx={{ mb: 2 }}
                    >
                      Track this habit to add it to your habits list
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleTrackHabit}
                      disabled={isTrackingLoading}
                      sx={{
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                        },
                      }}
                    >
                      {isTrackingLoading ? "Adding..." : "Track this Habit"}
                    </Button>
                  </>
                )}
              </Box>
            )}

            {/* Book Management Section - Only for Reading habits and creators */}
            {isReading && isCreator && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  backgroundColor: "#f8f9fa",
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography
                  variant="h6"
                  className="app-text-primary"
                  sx={{ mb: 2, fontWeight: 600 }}
                >
                  My Books
                </Typography>

                {/* Add New Book */}
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexWrap: "wrap",
                      alignItems: "flex-end",
                    }}
                  >
                    <TextField
                      label="Book Title"
                      value={newBookName}
                      onChange={(e) => setNewBookName(e.target.value)}
                      placeholder="Enter book name"
                      size="small"
                      sx={{ flex: 1, minWidth: 150 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Track By</InputLabel>
                      <Select
                        value={newBookTrackingMode}
                        onChange={(e) => setNewBookTrackingMode(e.target.value)}
                        label="Track By"
                      >
                        <MenuItem value="pages">Page Number</MenuItem>
                        <MenuItem value="percentage">Percentage</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Total Pages"
                      type="number"
                      value={newBookTotalPages}
                      onChange={(e) => setNewBookTotalPages(e.target.value)}
                      placeholder="Required"
                      required
                      size="small"
                      inputProps={{ min: 1 }}
                      sx={{ width: 120 }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={async () => {
                        if (!newBookName.trim()) return;
                        if (
                          !newBookTotalPages ||
                          parseInt(newBookTotalPages) <= 0
                        ) {
                          return; // Require total pages
                        }

                        const newBook = {
                          id: `book-${Date.now()}`,
                          name: newBookName.trim(),
                          totalPages: parseInt(newBookTotalPages),
                          trackingMode: newBookTrackingMode,
                          createdAt: new Date().toISOString(),
                        };

                        const updatedBooks = [...books, newBook];
                        setBooks(updatedBooks);
                        setNewBookName("");
                        setNewBookTotalPages("");
                        setNewBookTrackingMode("pages");

                        // Save to database
                        if (habitId) {
                          try {
                            await updateHabitBooks(habitId, updatedBooks);
                          } catch (err) {
                            console.error("Error saving book:", err);
                            setBooks(books); // Revert on error
                          }
                        }
                      }}
                      sx={{
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                        },
                      }}
                    >
                      Add Book
                    </Button>
                  </Box>
                </Box>

                {/* Book List */}
                {books.length > 0 && (
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1, fontWeight: 500 }}
                    >
                      Your Books ({books.length}):
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {books.map((book) => (
                        <Chip
                          key={book.id}
                          label={`${book.name} (${
                            book.trackingMode === "pages" ? "Pages" : "%"
                          })`}
                          onDelete={
                            books.length > 1
                              ? async () => {
                                  const updatedBooks = books.filter(
                                    (b) => b.id !== book.id
                                  );
                                  setBooks(updatedBooks);

                                  // Save to database
                                  if (habitId) {
                                    try {
                                      await updateHabitBooks(
                                        habitId,
                                        updatedBooks
                                      );
                                    } catch (err) {
                                      console.error(
                                        "Error deleting book:",
                                        err
                                      );
                                      setBooks(books); // Revert on error
                                    }
                                  }
                                }
                              : undefined
                          }
                          color="default"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {books.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Add your first book to start tracking your reading progress
                  </Typography>
                )}
              </Box>
            )}

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

                // For reading habits, show clickable box
                if (isReading) {
                  // Check if this day has any reading data and calculate total pages
                  const dayReadingData = readingData[dateKey];
                  let hasReading = false;
                  let totalPagesRead = 0;

                  if (dayReadingData) {
                    if (typeof dayReadingData === "number") {
                      // Old format: assume it's pages
                      hasReading = dayReadingData > 0;
                      totalPagesRead = dayReadingData;
                    } else if (Array.isArray(dayReadingData)) {
                      // New format: array of { bookId, value, pagesRead }
                      hasReading = dayReadingData.length > 0;
                      totalPagesRead = dayReadingData.reduce((sum, entry) => {
                        return sum + (entry.pagesRead || 0);
                      }, 0);
                    } else if (dayReadingData.bookId && dayReadingData.value) {
                      // Single book entry
                      hasReading = dayReadingData.value > 0;
                      totalPagesRead = dayReadingData.pagesRead || 0;
                    }
                  }

                  return (
                    <Box
                      key={day}
                      onClick={() =>
                        isValid &&
                        isCreator &&
                        books.length > 0 &&
                        handleReadingDayClick(day)
                      }
                      sx={{
                        height: 60,
                        border: isToday
                          ? "2px solid #667eea"
                          : isCreationDate
                          ? "2px solid #764ba2"
                          : "2px solid #e2e8f0",
                        borderRadius: 2,
                        backgroundColor: hasReading ? "#667eea" : "white",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor:
                          isValid && isCreator && books.length > 0
                            ? "pointer"
                            : "not-allowed",
                        transition: "all 0.2s ease",
                        opacity: isValid ? 1 : isBefore ? 0.3 : 0.5,
                        position: "relative",
                        "&:hover":
                          isValid && isCreator && books.length > 0
                            ? {
                                borderColor: "#667eea",
                                backgroundColor: hasReading
                                  ? "#5a6fd8"
                                  : "#f5f5f5",
                                transform: "scale(1.05)",
                              }
                            : {},
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: isToday || isCreationDate ? 700 : 500,
                          color: hasReading ? "white" : "#2d3748",
                          fontSize: "0.75rem",
                        }}
                      >
                        {day}
                      </Typography>
                      {hasReading && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.6rem",
                            color: "white",
                            mt: 0.25,
                          }}
                        >
                          {totalPagesRead}{" "}
                          {totalPagesRead === 1 ? "page" : "pages"}
                        </Typography>
                      )}
                      {isCreationDate && !hasReading && (
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
                  );
                }

                // For daily habits, show checkbox
                return (
                  <Box
                    key={day}
                    onClick={() => isValid && isCreator && handleToggle(day)}
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
                      cursor: isValid && isCreator ? "pointer" : "not-allowed",
                      transition: "all 0.2s ease",
                      opacity: isValid ? 1 : isBefore ? 0.3 : 0.5,
                      position: "relative",
                      "&:hover":
                        isValid && isCreator
                          ? {
                              borderColor: "#667eea",
                              backgroundColor: isChecked
                                ? "#5a6fd8"
                                : "#f5f5f5",
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
                  {isReading
                    ? Object.values(readingData).reduce((sum, dayData) => {
                        if (!dayData) return sum;

                        // Handle different data formats
                        if (Array.isArray(dayData)) {
                          // New format: array of { bookId, value, pagesRead }
                          return (
                            sum +
                            dayData.reduce((daySum, entry) => {
                              return daySum + (entry.pagesRead || 0);
                            }, 0)
                          );
                        } else if (
                          typeof dayData === "object" &&
                          dayData.pagesRead
                        ) {
                          // Single entry with pagesRead
                          return sum + (dayData.pagesRead || 0);
                        } else if (typeof dayData === "number") {
                          // Old format: just a number (assume it's pages)
                          return sum + dayData;
                        }
                        return sum;
                      }, 0)
                    : checkedDays.size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isReading ? "Total Pages" : "Total Days"}
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
                    const daysSinceCreation =
                      Math.ceil(
                        (today - creationDate) / (1000 * 60 * 60 * 24)
                      ) + 1; // +1 to include creation day
                    const totalDays =
                      daysSinceCreation > 0 ? daysSinceCreation : 1;

                    if (isReading) {
                      // For reading, count days with any reading data
                      const daysWithReading = Object.keys(readingData).filter(
                        (dateKey) => {
                          const dayData = readingData[dateKey];
                          if (typeof dayData === "number") {
                            return dayData > 0;
                          } else if (Array.isArray(dayData)) {
                            return dayData.some((entry) => entry.value > 0);
                          } else if (dayData && dayData.value) {
                            return dayData.value > 0;
                          }
                          return false;
                        }
                      ).length;
                      return totalDays > 0
                        ? Math.round((daysWithReading / totalDays) * 100)
                        : 0;
                    } else {
                      // For daily, count checked days
                      return totalDays > 0
                        ? Math.round((checkedDays.size / totalDays) * 100)
                        : 0;
                    }
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

      {/* Reading Progress Modal */}
      <Dialog
        open={readingModalOpen}
        onClose={handleCloseReadingModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Update Reading Progress -{" "}
          {selectedDate &&
            new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
        </DialogTitle>
        <DialogContent>
          {books.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
              Please add a book first to track your reading progress.
            </Typography>
          ) : (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
            >
              {books.map((book) => {
                const currentValue = modalBookValues[book.id] || "";
                const placeholder =
                  book.trackingMode === "percentage" ? "0%" : "0";
                const maxValue =
                  book.trackingMode === "percentage"
                    ? 100
                    : book.totalPages || undefined;

                return (
                  <Box
                    key={book.id}
                    sx={{
                      p: 2,
                      border: "1px solid #e2e8f0",
                      borderRadius: 2,
                      backgroundColor: "#f8f9fa",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, fontWeight: 600 }}
                    >
                      {book.name}
                      {book.totalPages && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          ({book.totalPages} pages)
                        </Typography>
                      )}
                      <Chip
                        label={
                          book.trackingMode === "percentage"
                            ? "Percentage"
                            : "Pages"
                        }
                        size="small"
                        sx={{ ml: 1, height: 20 }}
                      />
                    </Typography>
                    <TextField
                      type="number"
                      fullWidth
                      value={currentValue}
                      onChange={(e) => {
                        setModalBookValues((prev) => ({
                          ...prev,
                          [book.id]: e.target.value,
                        }));
                      }}
                      placeholder={placeholder}
                      inputProps={{
                        min: 0,
                        max: maxValue,
                        step: 1,
                      }}
                      helperText={
                        book.trackingMode === "percentage"
                          ? "Enter percentage (0-100)"
                          : book.totalPages
                          ? `Enter pages (0-${book.totalPages})`
                          : "Enter number of pages"
                      }
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReadingModal} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSaveReadingProgress}
            variant="contained"
            disabled={saving || books.length === 0}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
              },
            }}
          >
            {saving ? "Saving..." : "Save Progress"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        message={
          isCreator ? "URL copied to clipboard!" : "Habit added to your list!"
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{
          "& .MuiSnackbarContent-root": {
            backgroundColor: "success.main",
            color: "white",
          },
        }}
      />
    </Box>
  );
}

export default HabitTracker;
