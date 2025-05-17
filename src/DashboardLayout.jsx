import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveAccount, useAutoConnect } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import Sidebar from "./components/sidebar";
import DashboardHeader from "./components/DashboardHeader";
import { Outlet } from "react-router-dom";

// Validate environment variables
const requiredEnvVars = {
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
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

// Thirdweb client
const client = createThirdwebClient({
  clientId: requiredEnvVars.VITE_THIRDWEB_CLIENT_ID,
});

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

export default function DashboardLayout() {
  const [mounted, setMounted] = useState(false);
  const [authStatus, setAuthStatus] = useState("checking"); // checking, authenticated, unauthenticated
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop sidebar collapse
  const account = useActiveAccount();
  const navigate = useNavigate();
  const { isConnecting } = useAutoConnect({ client, wallets });

  useEffect(() => {
    setMounted(true);
    let timeoutId;

    const checkAuth = async () => {
      console.log("Checking authentication...");
      if (isConnecting) {
        console.log("Waiting for auto-connect...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (account) {
        console.log("Account found:", account.address);
        localStorage.setItem("thirdweb_auth", "true");
        setAuthStatus("authenticated");
        return;
      }

      const hasAuth = localStorage.getItem("thirdweb_auth") === "true";
      if (!hasAuth) {
        console.log("No auth flag found, setting unauthenticated");
        setAuthStatus("unauthenticated");
        return;
      }

      console.log("Retrying session restoration...");
      let attempts = 0;
      const maxAttempts = 5;

      const tryAuth = () => {
        if (account) {
          console.log("Session restored:", account.address);
          localStorage.setItem("thirdweb_auth", "true");
          setAuthStatus("authenticated");
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          console.log("Session restoration failed after max attempts");
          localStorage.removeItem("thirdweb_auth");
          setAuthStatus("unauthenticated");
          return;
        }

        console.log(`Retry attempt ${attempts}/${maxAttempts}`);
        timeoutId = setTimeout(tryAuth, 1500);
      };

      tryAuth();
    };

    checkAuth().catch((error) => {
      console.error("Authentication check failed:", error);
      localStorage.removeItem("thirdweb_auth");
      setAuthStatus("unauthenticated");
    });

    return () => clearTimeout(timeoutId);
  }, [account, isConnecting]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      console.log("Unauthenticated state detected, redirecting to /");
      navigate("/");
    } else if (!account && authStatus === "authenticated") {
      console.log("Account disconnected, setting unauthenticated");
      localStorage.removeItem("thirdweb_auth");
      setAuthStatus("unauthenticated");
    }
  }, [account, authStatus, navigate]);

  if (!mounted || authStatus === "checking") {
    console.log("Rendering loading state");
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-cyan-700/10 to-transparent">
        <motion.div
          className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    console.log("Not authenticated, rendering null");
    return null;
  }

  console.log("Rendering dashboard layout");
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div
        className="flex-1 flex flex-col lg:ml-[var(--sidebar-width)] transition-all duration-300 max-w-full min-w-0 z-10"
        style={{
          "--sidebar-width": isSidebarCollapsed ? "80px" : "256px",
        }}
      >
        <DashboardHeader isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
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
