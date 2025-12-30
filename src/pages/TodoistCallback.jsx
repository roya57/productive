import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Container,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

function TodoistCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization code and state from URL
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code) {
          throw new Error("No authorization code received from Todoist");
        }

        // Verify state matches user ID (CSRF protection)
        if (user?.id && state !== user.id) {
          throw new Error("State mismatch - possible CSRF attack");
        }

        // Exchange code for access token
        const clientId = import.meta.env.VITE_TODOIST_CLIENT_ID || "";
        const clientSecret = import.meta.env.VITE_TODOIST_CLIENT_SECRET || "";
        const redirectUri = `${window.location.origin}/todoist/callback`;

        if (!clientId) {
          throw new Error("Todoist Client ID not configured");
        }

        // Make request to Todoist token endpoint
        const tokenResponse = await fetch(
          "https://todoist.com/oauth/access_token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              code: code,
              redirect_uri: redirectUri,
            }),
          }
        );

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          throw new Error(`Failed to exchange code for token: ${errorData}`);
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
          throw new Error("No access token received from Todoist");
        }

        // Store the access token (using localStorage for now)
        // In production, you might want to store this in your database
        if (user?.id) {
          localStorage.setItem(
            `todoist_token_${user.id}`,
            tokenData.access_token
          );

          // Also store the token data if needed
          localStorage.setItem(
            `todoist_token_data_${user.id}`,
            JSON.stringify({
              access_token: tokenData.access_token,
              token_type: tokenData.token_type || "Bearer",
              expires_at: tokenData.expires_at,
              scope: tokenData.scope,
            })
          );
        }

        // Redirect back to home page with success
        navigate("/?todoist_connected=true", { replace: true });
      } catch (err) {
        console.error("Error handling Todoist callback:", err);
        setError(err.message || "Failed to connect to Todoist");
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, user]);

  if (error) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: 2,
          }}
        >
          <Alert severity="error" sx={{ width: "100%" }}>
            {error}
          </Alert>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "10px 20px",
              backgroundColor: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Return to Home
          </button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Connecting to Todoist...
        </Typography>
      </Box>
    </Container>
  );
}

export default TodoistCallback;

