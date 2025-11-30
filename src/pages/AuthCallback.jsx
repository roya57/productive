import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Container, Typography, CircularProgress } from "@mui/material";
import { supabase } from "../lib/supabase";

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check URL parameters first to determine the type of callback
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get("type");

        // Also check hash fragments (Supabase sometimes uses hash-based redirects)
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const hashType = hashParams.get("type");

        // Handle password reset - check both query params and hash
        if (type === "recovery" || hashType === "recovery") {
          // Extract the access token and other params from URL or hash
          const accessToken =
            urlParams.get("access_token") || hashParams.get("access_token");
          const refreshToken =
            urlParams.get("refresh_token") || hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            // Set the session with the tokens from the URL
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error("Session error:", sessionError);
              navigate("/signin?error=reset_link_invalid");
              return;
            }

            // Redirect to reset password page
            navigate("/reset-password");
            return;
          } else {
            // Missing tokens, redirect to signin with error
            navigate("/signin?error=reset_link_invalid");
            return;
          }
        }

        // Handle the auth callback from URL parameters
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          navigate("/signin?error=auth_failed");
          return;
        }

        // Check if this is an email confirmation
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
