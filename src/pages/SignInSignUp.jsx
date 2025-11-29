import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
} from "@mui/icons-material";
import HamburgerMenu from "../components/HamburgerMenu";

function SignInSignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState(0); // 0 for Sign In, 1 for Sign Up
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  // Get the redirect path from location state or URL params, default to home
  const redirectPath =
    location.state?.from ||
    new URLSearchParams(location.search).get("returnTo") ||
    "/";

  // Get pre-filled name from URL params
  const prefilledName = new URLSearchParams(location.search).get("name") || "";

  // Get URL messages (like email confirmation success)
  const urlMessage = new URLSearchParams(location.search).get("message") || "";
  const urlError = new URLSearchParams(location.search).get("error") || "";

  // Pre-fill name field when component mounts
  useEffect(() => {
    if (prefilledName) {
      setName(prefilledName);
    }
  }, [prefilledName]);

  // Handle URL messages
  useEffect(() => {
    if (urlMessage === "email_confirmed") {
      setSuccess("Email confirmed successfully! You can now sign in.");
      setError(null);
    } else if (urlMessage === "password_reset_success") {
      setSuccess(
        "Password reset successfully! You can now sign in with your new password."
      );
      setError(null);
    } else if (urlError === "auth_failed") {
      setError("Authentication failed. Please try again.");
      setSuccess(null);
    }
  }, [urlMessage, urlError]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setError(null);
    setSuccess(null);
    // Clear form when switching tabs, but preserve pre-filled name
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    if (!prefilledName) {
      setName("");
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return false;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address");
      return false;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return false;
    }

    if (activeTab === 1) {
      // Sign Up validation
      if (!name.trim()) {
        setError("Please enter your full name");
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
      if (activeTab === 0) {
        // Sign In
        const { data, error } = await signIn(email, password);

        if (error) {
          setError(error.message);
          return;
        }

        setSuccess("Successfully signed in! Redirecting...");
        setTimeout(() => {
          // Use window.location.href for external redirects to preserve URL params
          if (redirectPath.startsWith("/event/")) {
            window.location.href = redirectPath;
          } else {
            navigate(redirectPath);
          }
        }, 1000);
      } else {
        // Sign Up
        const { data, error } = await signUp(email, password, name);

        if (error) {
          setError(error.message);

          // If email already exists, automatically switch to sign-in tab
          if (error.message.includes("already exists")) {
            setTimeout(() => {
              setActiveTab(0); // Switch to sign-in tab
            }, 1500);
          }
          return;
        }

        setSuccess(
          "Account created successfully! Please check your email and click the confirmation link to activate your account."
        );
        // Auto-switch to sign in tab after successful sign up
        setTimeout(() => {
          setActiveTab(0);
        }, 3000);
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email address first");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { error } = await resetPassword(email);

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Password reset email sent! Please check your inbox.");
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Failed to send reset email. Please try again.");
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
              sx={{ mb: 1 }}
            >
              Welcome to Productive
            </Typography>

            <Typography
              variant="h6"
              align="center"
              color="text.secondary"
              className="app-subtitle"
              sx={{ mb: 3 }}
            >
              Sign in to your account or create a new one
            </Typography>

            {/* Tabs for Sign In / Sign Up */}
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontSize: "1rem",
                    fontWeight: 600,
                  },
                  "& .Mui-selected": {
                    color: "#667eea",
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#667eea",
                  },
                }}
              >
                <Tab label="Sign In" />
                <Tab label="Sign Up" />
              </Tabs>
            </Box>

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
              {/* Name field - only for Sign Up */}
              {activeTab === 1 && (
                <TextField
                  fullWidth
                  label="Name"
                  variant="outlined"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="app-input"
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
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
                      WebkitTextFillColor: "#000000",
                    },
                    "& input:-webkit-autofill:focus": {
                      WebkitBoxShadow: "0 0 0 1000px white inset",
                      WebkitTextFillColor: "#000000",
                    },
                    "& input:-webkit-autofill:active": {
                      WebkitBoxShadow: "0 0 0 1000px white inset",
                      WebkitTextFillColor: "#000000",
                    },
                  }}
                />
              )}

              {/* Email field */}
              <TextField
                fullWidth
                label="Email Address"
                variant="outlined"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="app-input"
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
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
                    WebkitTextFillColor: "#000000",
                  },
                  "& input:-webkit-autofill:focus": {
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                    WebkitTextFillColor: "#000000",
                  },
                  "& input:-webkit-autofill:active": {
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                    WebkitTextFillColor: "#000000",
                  },
                }}
              />

              {/* Password field */}
              <TextField
                fullWidth
                label="Password"
                variant="outlined"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="app-input"
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
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
                    WebkitTextFillColor: "#000000",
                  },
                  "& input:-webkit-autofill:focus": {
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                    WebkitTextFillColor: "#000000",
                  },
                  "& input:-webkit-autofill:active": {
                    WebkitBoxShadow: "0 0 0 1000px white inset",
                    WebkitTextFillColor: "#000000",
                  },
                }}
              />

              {/* Confirm Password field - only for Sign Up */}
              {activeTab === 1 && (
                <TextField
                  fullWidth
                  label="Confirm Password"
                  variant="outlined"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="app-input"
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          edge="end"
                          disabled={loading}
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
                      WebkitTextFillColor: "#000000",
                    },
                    "& input:-webkit-autofill:focus": {
                      WebkitBoxShadow: "0 0 0 1000px white inset",
                      WebkitTextFillColor: "#000000",
                    },
                    "& input:-webkit-autofill:active": {
                      WebkitBoxShadow: "0 0 0 1000px white inset",
                      WebkitTextFillColor: "#000000",
                    },
                  }}
                />
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                className="app-button-primary"
                sx={{ mt: 1 }}
              >
                {loading ? (
                  <>
                    <CircularProgress
                      size={20}
                      className="app-loading-spinner"
                      sx={{ mr: 1 }}
                    />
                    {activeTab === 0 ? "Signing In..." : "Creating Account..."}
                  </>
                ) : activeTab === 0 ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </Box>

            {/* Forgot Password Link - only for Sign In */}
            {activeTab === 0 && (
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Button
                  variant="text"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  sx={{
                    textTransform: "none",
                    color: "#667eea",
                    "&:hover": {
                      backgroundColor: "rgba(102, 126, 234, 0.04)",
                    },
                  }}
                >
                  Forgot your password?
                </Button>
              </Box>
            )}

            <Typography
              variant="body2"
              align="center"
              color="text.secondary"
              className="app-footer-text"
              sx={{ mt: 3 }}
            >
              {activeTab === 0
                ? "Don't have an account? Click the Sign Up tab above"
                : "Already have an account? Click the Sign In tab above"}
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default SignInSignUp;

