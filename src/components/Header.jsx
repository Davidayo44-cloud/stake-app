import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, defineChain } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { Link } from "react-router-dom";

// Validate environment variables
const requiredEnvVars = {
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
  VITE_NATIVE_CURRENCY_NAME: import.meta.env.VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL: import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS: import.meta.env.VITE_NATIVE_CURRENCY_DECIMALS,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error("Header.jsx: Missing environment variables:", missingEnvVars);
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(
      ", "
    )}. Please check your .env file.`
  );
}

// Validate chain ID and decimals
const chainId = parseInt(requiredEnvVars.VITE_CHAIN_ID, 10);
if (isNaN(chainId) || chainId <= 0) {
  console.error("Header.jsx: Invalid chain ID:", requiredEnvVars.VITE_CHAIN_ID);
  throw new Error("Invalid chain ID");
}
const decimals = parseInt(requiredEnvVars.VITE_NATIVE_CURRENCY_DECIMALS, 10);
if (isNaN(decimals) || decimals < 0) {
  console.error(
    "Header.jsx: Invalid native currency decimals:",
    requiredEnvVars.VITE_NATIVE_CURRENCY_DECIMALS
  );
  throw new Error("Invalid native currency decimals");
}

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: requiredEnvVars.VITE_THIRDWEB_CLIENT_ID,
});

// Define Hardhat chain
const hardhatChain = defineChain({
  id: chainId,
  name: requiredEnvVars.VITE_NATIVE_CURRENCY_NAME,
  rpc: requiredEnvVars.VITE_RPC_URL,
  nativeCurrency: {
    name: requiredEnvVars.VITE_NATIVE_CURRENCY_NAME,
    symbol: requiredEnvVars.VITE_NATIVE_CURRENCY_SYMBOL,
    decimals,
  },
  testnet: true,
  blockExplorers: [],
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

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const account = useActiveAccount();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuVariants = {
    closed: { x: "100%" },
    open: { x: 0 },
  };

  const linkVariants = {
    initial: { color: "#e2e8f0", background: "transparent", fontWeight: 500 },
    hover: {
      color: "#ffffff",
      background:
        "linear-gradient(to right, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.1))",
      fontWeight: 600,
    },
  };

  const navLinks = [
    ...(account ? [{ name: "Dashboard", href: "/dashboard" }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="text-1xl flex justify-center items-center font-extrabold text-cyan-600"
        >
          <img
            src="/images/logo.png"
            alt="StakePro Feature Image"
            width={70}
            height={10}
            className="object-contain"
          />
          StakePro
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex space-x-6">
          {navLinks.map((link) => (
            <motion.div
              key={link.name}
              initial="initial"
              whileHover="hover"
              variants={linkVariants}
              transition={{ duration: 0.25 }}
              className="relative px-3 py-1 rounded-md"
            >
              <Link
                to={link.href}
                className="relative text-base lg:text-lg font-medium font-geist"
                aria-label={`Navigate to ${link.name}`}
              >
                {link.name}
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* ConnectButton (Desktop) */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="hidden md:block"
        >
          <ConnectButton
            client={client}
            chain={hardhatChain}
            wallets={wallets}
            connectButton={{
              label: (
                <span className="group flex items-center text-sm font-medium text-cyan-600 transition-colors duration-300">
                  Account
                  <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              ),
              style: {
                background: "#1e293b",
                color: "#06b6d4",
                border: "1px solid #06b6d4",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                transition: "all 0.3s ease",
              },
              className: "hover:bg-slate-700",
            }}
            connectModal={{
              size: "compact",
              title: "Connect to StakePro",
              showThirdwebBranding: false,
            }}
            theme="dark"
          />
        </motion.div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-slate-200"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-controls="mobile-menu"
        >
          {isMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              // No onClick handler; overlay is purely visual
            />
            <motion.nav
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="md:hidden bg-slate-900 fixed top-0 right-0 w-3/4 sm:w-2/3 min-h-screen z-50 p-6"
              id="mobile-menu"
            >
              <div className="flex justify-end">
                <button onClick={toggleMenu} aria-label="Close menu">
                  <X className="w-6 h-6 text-slate-200" />
                </button>
              </div>
              <div className="flex flex-col space-y-6 mt-8 text-center">
                {navLinks.map((link) => (
                  <motion.div
                    key={link.name}
                    initial="initial"
                    whileHover="hover"
                    variants={linkVariants}
                    transition={{ duration: 0.25 }}
                    className="relative px-3 py-1 rounded-md"
                  >
                    <Link
                      to={link.href}
                      onClick={toggleMenu}
                      className="relative text-lg sm:text-xl font-medium font-geist"
                      aria-label={`Navigate to ${link.name}`}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ConnectButton
                    client={client}
                    chain={hardhatChain}
                    wallets={wallets}
                    connectButton={{
                      label: (
                        <span className="group flex items-center text-sm font-medium text-cyan-600 transition-colors duration-300">
                          Account
                          <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                      ),
                      style: {
                        background: "#1e293b",
                        color: "#06b6d4",
                        border: "1px solid #06b6d4",
                        padding: "0.5rem 1rem",
                        borderRadius: "0.375rem",
                        transition: "all 0.3s ease",
                      },
                      className: "hover:bg-slate-700",
                    }}
                    connectModal={{
                      size: "compact",
                      title: "Connect to StakePro",
                      showThirdwebBranding: false,
                    }}
                    theme="dark"
                  />
                </motion.div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
