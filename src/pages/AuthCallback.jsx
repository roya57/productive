import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Container, Typography, CircularProgress } from "@mui/material";
import { supabase } from "../lib/supabase";

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback from URL parameters
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          navigate("/signin?error=auth_failed");
          return;
        }

        // Check if this is an email confirmation
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get("type");

        if (type === "signup") {
          // Email confirmation successful
          navigate("/signin?message=email_confirmed");
          return;
        }

        if (data.session) {
          // Successful authentication, redirect to home
          navigate("/");
        } else {
          // No session, redirect to sign in
          navigate("/signin");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        navigate("/signin?error=auth_failed");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <Box className="page-container">
      <Container maxWidth="sm">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "50vh",
            gap: 2,
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="h6" color="text.secondary">
            Completing authentication...
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default AuthCallback;

