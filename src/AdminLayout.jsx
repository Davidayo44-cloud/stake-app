import React, { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useActiveAccount, useAutoConnect } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { ethers } from "ethers";
import { AdminSidebar } from "./adminComponents/AdminSidebar";
import { AdminHeader } from "./adminComponents/AdminHeader";

// Validate environment variables
const requiredEnvVars = {
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  VITE_MOCK_ADMIN_ADDRESS: import.meta.env.VITE_MOCK_ADMIN_ADDRESS,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error(
    "AdminLayout.jsx: Missing environment variables:",
    missingEnvVars
  );
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(", ")}`
  );
}

if (!ethers.isAddress(requiredEnvVars.VITE_MOCK_ADMIN_ADDRESS)) {
  console.error(
    "AdminLayout.jsx: Invalid mock admin address:",
    requiredEnvVars.VITE_MOCK_ADMIN_ADDRESS
  );
  throw new Error("Invalid mock admin address in VITE_MOCK_ADMIN_ADDRESS");
}

// Thirdweb client
const client = createThirdwebClient({
  clientId: requiredEnvVars.VITE_THIRDWEB_CLIENT_ID,
});

// Same wallets as DashboardLayout.jsx
const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "farcaster",
        "email",
        "x",
        "passkey",
        "phone",
        "github",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

export function AdminLayout() {
  const [mounted, setMounted] = useState(false);
  const [authStatus, setAuthStatus] = useState("checking"); // checking, authenticated, unauthenticated
  const [isOpen, setIsOpen] = useState(false); // Mobile sidebar toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop sidebar collapse
  const account = useActiveAccount();
  const address = account?.address;
  const navigate = useNavigate();
  const { isConnecting } = useAutoConnect({ client, wallets });

  useEffect(() => {
    setMounted(true);
    let timeoutId;

    const checkAuth = async () => {
      console.log("AdminLayout: Checking admin authentication...");
      console.log("Account:", account?.address || "none");
      console.log("Is Connecting:", isConnecting);

      // Wait for auto-connect to complete
      if (isConnecting) {
        console.log("AdminLayout: Waiting for auto-connect...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Check if account is present
      if (account && address) {
        console.log("AdminLayout: Account found:", address);
        // Check if the connected address is the admin
        const isAdmin =
          address.toLowerCase() ===
          requiredEnvVars.VITE_MOCK_ADMIN_ADDRESS.toLowerCase();
        if (isAdmin) {
          console.log("AdminLayout: Admin authenticated:", address);
          localStorage.setItem("thirdweb_admin_auth", "true");
          setAuthStatus("authenticated");
        } else {
          console.log("AdminLayout: Not admin:", address);
          localStorage.removeItem("thirdweb_admin_auth");
          setAuthStatus("unauthenticated");
        }
        return;
      }

      // Check for prior admin or user login
      const hasAdminAuth =
        localStorage.getItem("thirdweb_admin_auth") === "true";
      const hasUserAuth = localStorage.getItem("thirdweb_auth") === "true";
      if (!hasAdminAuth && !hasUserAuth) {
        console.log("AdminLayout: No auth flag found, proceeding to retry");
      } else {
        console.log(
          "AdminLayout: Found auth flag, retrying session restoration..."
        );
      }

      // Always retry to handle direct navigation
      let attempts = 0;
      const maxAttempts = 5;

      const tryAuth = () => {
        console.log(
          `AdminLayout: Retry attempt ${attempts + 1}/${maxAttempts}: Address=${
            account?.address || "none"
          }, Connecting=${isConnecting}`
        );

        if (account && account.address) {
          console.log("AdminLayout: Session restored:", account.address);
          const isAdmin =
            account.address.toLowerCase() ===
            requiredEnvVars.VITE_MOCK_ADMIN_ADDRESS.toLowerCase();
          if (isAdmin) {
            localStorage.setItem("thirdweb_admin_auth", "true");
            setAuthStatus("authenticated");
          } else {
            console.log("AdminLayout: Not admin:", account.address);
            localStorage.removeItem("thirdweb_admin_auth");
            setAuthStatus("unauthenticated");
          }
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          console.log(
            "AdminLayout: Session restoration failed after max attempts"
          );
          console.log(
            "AdminLayout: Please connect MetaMask using the Connect button in the header"
          );
          localStorage.removeItem("thirdweb_admin_auth");
          setAuthStatus("unauthenticated");
          return;
        }

        timeoutId = setTimeout(tryAuth, 1500);
      };

      tryAuth();
    };

    checkAuth().catch((error) => {
      console.error("AdminLayout: Authentication check failed:", error);
      localStorage.removeItem("thirdweb_admin_auth");
      setAuthStatus("unauthenticated");
    });

    return () => clearTimeout(timeoutId);
  }, [account, address, isConnecting]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      console.log("AdminLayout: Unauthenticated, redirecting to /");
      navigate("/");
    } else if (!account && authStatus === "authenticated") {
      console.log("AdminLayout: Account disconnected, setting unauthenticated");
      localStorage.removeItem("thirdweb_admin_auth");
      setAuthStatus("unauthenticated");
    }
  }, [account, authStatus, navigate]);

  if (!mounted || authStatus === "checking") {
    console.log("AdminLayout: Rendering loading state");
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-cyan-700/10 to-transparent">
        <motion.div
          className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          aria-label="Loading"
        />
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    console.log("AdminLayout: Not authenticated, rendering null");
    return null;
  }

  console.log("AdminLayout: Rendering admin layout");
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent">
      <AdminSidebar
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div
        className="flex-1 flex flex-col lg:ml-[var(--sidebar-width)] transition-all duration-300 max-w-full min-w-0 z-10"
        style={{
          "--sidebar-width": isSidebarCollapsed ? "80px" : "256px",
        }}
      >
        <AdminHeader isOpen={isOpen} setIsOpen={setIsOpen} />
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full min-w-0"
        >
          <Outlet />
        </motion.main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
