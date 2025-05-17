import React from "react";
import { ConnectButton } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { ArrowRight, Menu, X } from "lucide-react";
import { inAppWallet, createWallet } from "thirdweb/wallets";

// Validate environment variable
if (!import.meta.env.VITE_THIRDWEB_CLIENT_ID) {
  console.error("AdminHeader.jsx: Missing VITE_THIRDWEB_CLIENT_ID");
  throw new Error("Missing VITE_THIRDWEB_CLIENT_ID environment variable");
}

// Thirdweb client
const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
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

export default function DashboardHeader({ isOpen, setIsOpen }) {
  return (
    <header className="bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4 lg:p-5 border-b border-cyan-700/30 sticky top-0 z-30">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <button
          className="p-2 sm:p-2.5 text-cyan-600 bg-slate-800/80 rounded-md lg:hidden"
          onClick={() => {
            console.log(`AdminHeader: Sidebar toggle - isOpen=${!isOpen}`);
            setIsOpen(!isOpen);
          }}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isOpen ? (
            <X className="w-5 sm:w-6 h-5 sm:h-6" />
          ) : (
            <Menu className="w-5 sm:w-6 h-5 sm:h-6" />
          )}
        </button>
        <ConnectButton
          client={client}
          wallets={wallets}
          connectButton={{
            label: (
              <span className="flex items-center text-xs sm:text-sm font-medium text-white hover:text-cyan-600 transition-colors duration-300">
                Account
                <ArrowRight className="ml-1 sm:ml-2 w-3 sm:w-4 h-3 sm:h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            ),
            style: {
              background: "transparent",
              border: "none",
              padding: "0.25rem 0.5rem sm:0.375rem 0.75rem",
              borderRadius: "0.375rem",
              transition: "all 0.3s ease",
            },
          }}
          connectModal={{
            size: "compact",
            title: "Manage Admin Account",
            maxWidth: "90vw sm:500px",
            showThirdwebBranding: false,
          }}
          theme="dark"
        />
      </div>
    </header>
  );
}
