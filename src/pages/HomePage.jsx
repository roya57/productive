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
} from "@mui/material";
import HamburgerMenu from "../components/HamburgerMenu";
import { useAuth } from "../contexts/AuthContext";

function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();

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

