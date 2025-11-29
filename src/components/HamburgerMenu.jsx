import { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Login,
  Home,
  Logout,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function HamburgerMenu() {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignIn = () => {
    navigate("/signin", { state: { from: location.pathname } });
    handleClose();
  };

  const handleSignOut = async () => {
    await signOut();
    handleClose();
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleClose();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{
          color: "primary.main",
          "&:hover": {
            backgroundColor: "rgba(102, 126, 234, 0.1)",
          },
        }}
        aria-label="menu"
      >
        <MenuIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            overflow: "visible",
            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
            mt: 1.5,
            minWidth: 180,
            "& .MuiAvatar-root": {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            "&:before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: "background.paper",
              transform: "translateY(-50%) rotate(45deg)",
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* User Info - show when logged in */}
        {user && (
          <>
            <MenuItem disabled>
              <ListItemIcon>
                <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem" }}>
                  {user.user_metadata?.full_name?.charAt(0) ||
                    user.email?.charAt(0) ||
                    "U"}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={user.user_metadata?.full_name || "User"}
                secondary={user.email}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
                secondaryTypographyProps={{ fontSize: "0.75rem" }}
              />
            </MenuItem>
            <Divider />
          </>
        )}

        {/* Navigation Items */}
        {location.pathname !== "/" && (
          <MenuItem onClick={() => handleNavigate("/")}>
            <ListItemIcon>
              <Home fontSize="small" />
            </ListItemIcon>
            <ListItemText>Home</ListItemText>
          </MenuItem>
        )}

        {/* Divider before auth options */}
        {((user && location.pathname !== "/") ||
          (!user && location.pathname !== "/" && location.pathname !== "/signin")) && <Divider />}

        {/* Authentication Options */}
        {user ? (
          // User is logged in - show sign out
          <MenuItem onClick={handleSignOut}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sign Out</ListItemText>
          </MenuItem>
        ) : (
          // User is not logged in - show sign in (if not on sign in page)
          location.pathname !== "/signin" && (
            <MenuItem onClick={handleSignIn}>
              <ListItemIcon>
                <Login fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sign In</ListItemText>
            </MenuItem>
          )
        )}
      </Menu>
    </>
  );
}

export default HamburgerMenu;

