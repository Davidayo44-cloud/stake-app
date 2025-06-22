import { Routes, Route } from "react-router-dom";
import { ThirdwebProvider } from "thirdweb/react";
import { createThirdwebClient, defineChain } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import Home from "./pages/Home";
import DashboardLayout from "./DashboardLayout";
import Staking from "./userPages/Staking";
import Referrals from "./userPages/Referrals";
import Rewards from "./userPages/Rewards";
// import PurchaseHistory from "./userPages/PurchaseHistory";
import DashboardHome from "./userPages/DashboardHome";
import { AdminLayout } from "./AdminLayout";
import { AdminHome } from "./adminPages/Home";
import { ManagePool } from "./adminPages/ManagePool";
import { ContractControls } from "./adminPages/ContractControls";
// import BuyCrypto from "./userPages/BuyCrypto";
// import TransactionStatus from "./components/TransactionStatus"; // New component
import NotFound from "./pages/NotFound";
import SendUSDTInstructions from "./userPages/SendUSDTInstructions";

// Validate environment variables
const requiredEnvVars = {
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
  VITE_NATIVE_CURRENCY_NAME: import.meta.env.VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL: import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS: import.meta.env.VITE_NATIVE_CURRENCY_DECIMALS,
}


const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error("App.jsx: Missing environment variables:", missingEnvVars);
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(
      ", "
    )}. Please check your .env file.`
  );
}

// Validate chain ID and decimals
const chainId = parseInt(requiredEnvVars.VITE_CHAIN_ID, 10);
if (isNaN(chainId) || chainId <= 0) {
  console.error("App.jsx: Invalid chain ID:", requiredEnvVars.VITE_CHAIN_ID);
  throw new Error("Invalid chain ID");
}
const decimals = parseInt(requiredEnvVars.VITE_NATIVE_CURRENCY_DECIMALS, 10);
if (isNaN(decimals) || decimals < 0) {
  console.error(
    "App.jsx: Invalid native currency decimals:",
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

// Wallet configurations
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

export default function App() {
  return (
    <ThirdwebProvider
      clientId={client.clientId}
      activeChain={hardhatChain}
      supportedChains={[hardhatChain]}
      wallets={wallets}
    >
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* <Route
            path="/transaction-status"
            element={<TransactionStatus />}
          />{" "} */}
          {/* New route */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="staking" element={<Staking />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="rewards" element={<Rewards />} />
            {/* <Route path="buy" element={<BuyCrypto />} /> */}
            <Route path="instruction" element={<SendUSDTInstructions />} />
            
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="manage-pool" element={<ManagePool />} />
            <Route path="controls" element={<ContractControls />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </ThirdwebProvider>
  );
}
