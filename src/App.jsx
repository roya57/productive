import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { AuthProvider } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import CreateHabit from "./pages/CreateHabit";
import HabitTracker from "./pages/HabitTracker";
import SignInSignUp from "./pages/SignInSignUp";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import theme from "./theme/theme";
import "./styles/shared.css";
import "./App.css";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateHabit />} />
            <Route path="/habit/:habitId/tracker" element={<HabitTracker />} />
            <Route path="/habit/tracker" element={<HabitTracker />} />
            <Route path="/signin" element={<SignInSignUp />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
