import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import HamburgerMenu from "../components/HamburgerMenu";

function CreateHabit() {
  const { user } = useAuth();
  const [habitName, setHabitName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!habitName.trim()) {
      setError("Please enter a habit name");
      return;
    }

    // If user is not authenticated and auth prompt is not shown, show auth prompt
    if (!user && !showAuthPrompt) {
      setShowAuthPrompt(true);
      return;
    }

    // For now, just log the data (we'll implement actual creation later)
    console.log("Creating habit:", { habitName, frequency, user });

    // TODO: Implement habit creation logic here
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // For now, just show success and navigate back
      // Later we'll navigate to a habit tracking page
      navigate("/");
    } catch (err) {
      console.error("Error creating habit:", err);
      setError("Failed to create habit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="page-container">
      <Container maxWidth="sm">
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
            >
              Create Your Habit
            </Typography>

            {/* Authentication Status */}
            {user ? (
              <Typography
                variant="body2"
                align="center"
                color="success.main"
                sx={{ mb: 1 }}
              >
                ✓ Signed in as {user.user_metadata?.full_name || user.email}
              </Typography>
            ) : (
              <Typography
                variant="body2"
                align="center"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Creating as guest (optional to sign in)
              </Typography>
            )}

            <Typography
              variant="h6"
              align="center"
              color="text.secondary"
              className="app-subtitle"
            >
              Start building a new habit today
            </Typography>

            {error && (
              <Alert severity="error" className="app-error">
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} className="app-form">
              <TextField
                fullWidth
                label="Habit Name"
                variant="outlined"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                placeholder="e.g., Exercise, Read, Meditate, Drink Water"
                required
                className="app-input"
                disabled={loading}
              />

              <FormControl
                component="fieldset"
                disabled={loading}
                sx={{ mb: 3 }}
              >
                <FormLabel component="legend">Frequency</FormLabel>
                <RadioGroup
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <FormControlLabel
                    value="daily"
                    control={<Radio />}
                    label="Daily"
                  />
                </RadioGroup>
              </FormControl>

              {/* Authentication Prompt */}
              {showAuthPrompt && (
                <Alert
                  severity="info"
                  sx={{ mb: 2 }}
                  action={
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        onClick={() => setShowAuthPrompt(false)}
                        sx={{ textTransform: "none" }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  }
                >
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Optional:</strong> Sign in to save your habits and
                    track your progress.
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => navigate("/signin?returnTo=/create")}
                      sx={{ textTransform: "none" }}
                    >
                      Sign In / Sign Up
                    </Button>
                  </Box>
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                className="app-button-primary"
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={20}
                      className="app-loading-spinner"
                    />
                    Creating Habit...
                  </>
                ) : user ? (
                  "Create Habit"
                ) : showAuthPrompt ? (
                  "Continue as Guest"
                ) : (
                  "Continue to Create Habit"
                )}
              </Button>
            </Box>

            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              className="app-footer-text"
            >
              Start tracking your progress and build consistency
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default CreateHabit;

