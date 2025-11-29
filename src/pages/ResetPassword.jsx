import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff, Lock } from "@mui/icons-material";
import { supabase } from "../lib/supabase";
import HamburgerMenu from "../components/HamburgerMenu";

function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Check if user has a valid session (created when they click the reset link)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session check error:", error);
          setError(
            "Invalid or expired reset link. Please request a new password reset."
          );
          setCheckingSession(false);
          return;
        }

        if (!session) {
          setError(
            "Invalid or expired reset link. Please request a new password reset."
          );
          setCheckingSession(false);
          return;
        }

        // Valid session exists, user can reset password
        setCheckingSession(false);
      } catch (err) {
        console.error("Error checking session:", err);
        setError("An error occurred. Please try again.");
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const validateForm = () => {
    if (!password.trim()) {
      setError("Please enter your new password");
      return false;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    if (!confirmPassword.trim()) {
      setError("Please confirm your password");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Password reset successfully! Redirecting to sign in...");

      // Sign out the user after password reset
      await supabase.auth.signOut();

      // Redirect to sign in after a short delay
      setTimeout(() => {
        navigate("/signin?message=password_reset_success");
      }, 2000);
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <Box className="page-container">
        <Container maxWidth="sm">
          <Card className="app-card">
            <CardContent className="app-card-content">
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "30vh",
                  gap: 2,
                }}
              >
                <CircularProgress size={40} />
                <Typography variant="h6" color="text.secondary">
                  Verifying reset link...
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

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
              sx={{ mb: 1 }}
            >
              Reset Password
            </Typography>

            <Typography
              variant="h6"
              align="center"
              color="text.secondary"
              className="app-subtitle"
              sx={{ mb: 3 }}
            >
              Enter your new password below
            </Typography>

            {error && (
              <Alert severity="error" className="app-error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} className="app-form">
              {/* New Password field */}
              <TextField
                fullWidth
                label="New Password"
                variant="outlined"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                className="app-input"
                disabled={loading}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& input:-webkit-autofill": {
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                    WebkitTextFillColor: "#000000",
                    caretColor: "#000000",
                  },
                  "& input:-webkit-autofill:hover": {
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                  },
                  "& input:-webkit-autofill:focus": {
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                  },
                  mb: 2,
                }}
              />

              {/* Confirm Password field */}
              <TextField
                fullWidth
                label="Confirm New Password"
                variant="outlined"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="app-input"
                disabled={loading}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& input:-webkit-autofill": {
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                    WebkitTextFillColor: "#000000",
                    caretColor: "#000000",
                  },
                  "& input:-webkit-autofill:hover": {
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                  },
                  "& input:-webkit-autofill:focus": {
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                  },
                  mb: 3,
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                className="app-button-primary"
                disabled={loading}
                sx={{
                  py: 1.5,
                  mb: 2,
                  fontSize: "1rem",
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Reset Password"
                )}
              </Button>
            </Box>

            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              className="app-footer-text"
              sx={{ mt: 2 }}
            >
              Remember your password?{" "}
              <Button
                variant="text"
                onClick={() => navigate("/signin")}
                sx={{
                  textTransform: "none",
                  color: "#667eea",
                  "&:hover": {
                    backgroundColor: "rgba(102, 126, 234, 0.04)",
                  },
                }}
              >
                Sign In
              </Button>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default ResetPassword;

