import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract, defineChain } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import { AlertTriangle, Settings } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { Toaster, toast } from "react-hot-toast";
import { ethers } from "ethers";
import { StakingContractABI } from "../config/abis";

// Validate environment variables
const requiredEnvVars = {
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  VITE_STAKING_ADDRESS: import.meta.env.VITE_STAKING_ADDRESS,
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
  console.error(
    "ContractControls.jsx: Missing environment variables:",
    missingEnvVars
  );
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(
      ", "
    )}. Please check your .env file.`
  );
}

const {
  VITE_THIRDWEB_CLIENT_ID,
  VITE_STAKING_ADDRESS,
  VITE_CHAIN_ID,
  VITE_RPC_URL,
  VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS,
} = requiredEnvVars;

// Validate contract address
if (!ethers.isAddress(VITE_STAKING_ADDRESS)) {
  console.error(
    "ContractControls.jsx: Invalid Staking contract address:",
    VITE_STAKING_ADDRESS
  );
  throw new Error("Invalid Staking contract address");
}

// Validate chain ID and decimals
const chainId = parseInt(VITE_CHAIN_ID, 10);
if (isNaN(chainId) || chainId <= 0) {
  console.error("ContractControls.jsx: Invalid chain ID:", VITE_CHAIN_ID);
  throw new Error("Invalid chain ID");
}
const nativeCurrencyDecimals = parseInt(VITE_NATIVE_CURRENCY_DECIMALS, 10);
if (isNaN(nativeCurrencyDecimals) || nativeCurrencyDecimals < 0) {
  console.error(
    "ContractControls.jsx: Invalid native currency decimals:",
    VITE_NATIVE_CURRENCY_DECIMALS
  );
  throw new Error("Invalid native currency decimals");
}

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: VITE_THIRDWEB_CLIENT_ID,
});

// Define Hardhat chain
const hardhatChain = defineChain({
  id: chainId,
  rpc: VITE_RPC_URL,
  nativeCurrency: {
    name: VITE_NATIVE_CURRENCY_NAME,
    symbol: VITE_NATIVE_CURRENCY_SYMBOL,
    decimals: nativeCurrencyDecimals,
  },
  blockExplorers: [],
});

// Initialize contract
const stakingContract = getContract({
  client,
  chain: hardhatChain,
  address: VITE_STAKING_ADDRESS,
  abi: StakingContractABI,
  rpcOverride: VITE_RPC_URL,
});

// Utility function to truncate address
const truncateAddress = (address) => {
  if (!address || !ethers.isAddress(address)) return "Invalid address";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Card animation variants
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: index * 0.1 },
 } ),
  hover: { scale: 1.05, boxShadow: "0 0 20px rgba(14, 116, 144, 0.3)" },
};

// Error boundary component
function ErrorFallback({ error }) {
  console.error("ContractControls.jsx: ErrorFallback:", {
    message: error.message,
    stack: error.stack,
  });
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent text-slate-200">
      <div className="text-center p-4">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 font-geist">
          Something went wrong
        </h2>
        <p className="text-sm sm:text-base text-slate-400 font-geist-mono">
          {error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 text-sm sm:text-base font-geist"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export function ContractControls() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState({
    togglePause: false,
  });
  const account = useActiveAccount();

  // Log account state
  console.log("ContractControls.jsx: Component rendered", {
    account: account ? { address: account.address } : null,
    accountAddress: account?.address,
    isAccountValid: !!account && ethers.isAddress(account?.address),
  });

  // Contract data hooks
  const {
    data: isPaused,
    isLoading: isPausedLoading,
    error: pausedError,
    refetch: refetchPaused,
  } = useReadContract({
    contract: stakingContract,
    method: "paused",
    params: [],
    queryOptions: { enabled: true, retry: 3, retryDelay: 1000 },
  });

  const {
    data: adminAddress,
    isLoading: isAdminLoading,
    error: adminError,
    refetch: refetchAdmin,
  } = useReadContract({
    contract: stakingContract,
    method: "admin",
    params: [],
    queryOptions: { enabled: true, retry: 3, retryDelay: 1000 },
  });

  // Check if user is admin
  const isAdmin =
    account?.address &&
    adminAddress &&
    account.address.toLowerCase() === adminAddress.toLowerCase();

  // Data fetching
  useEffect(() => {
    console.log("ContractControls.jsx: useEffect for data fetching triggered");
    const updateData = async () => {
      setIsLoading(true);
      try {
        if (isPausedLoading || isAdminLoading) {
          return;
        }
        console.log("ContractControls.jsx: updateData: Data fetched", {
          isPaused,
          adminAddress,
        });
        setIsLoading(false);
      } catch (err) {
        console.error("ContractControls.jsx: updateData error:", {
          message: err.message,
          stack: err.stack,
        });
        setError(err);
        setIsLoading(false);
      }
    };
    updateData();
  }, [isPaused, adminAddress, isPausedLoading, isAdminLoading]);

  // Handle errors
  useEffect(() => {
    console.log("ContractControls.jsx: useEffect for error handling triggered");
    if (pausedError) {
      console.error("ContractControls.jsx: pausedError:", {
        message: pausedError.message,
        stack: pausedError.stack,
      });
      toast.error(`Failed to fetch pause status: ${pausedError.message}`);
      setError(pausedError);
    }
    if (adminError) {
      console.error("ContractControls.jsx: adminError:", {
        message: adminError.message,
        stack: adminError.stack,
      });
      toast.error(`Failed to fetch admin address: ${adminError.message}`);
      setError(adminError);
    }
  }, [pausedError, adminError]);

  // Toggle pause function
  const togglePause = async () => {
    console.log("ContractControls.jsx: togglePause called", {
      accountAddress: account?.address,
      isPaused,
    });

    if (!account || !account.address || !ethers.isAddress(account.address)) {
      console.error("ContractControls.jsx: togglePause: Invalid account", {
        account,
        accountAddress: account?.address,
      });
      toast.error("Please connect a valid wallet via the Account button");
      return;
    }

    if (!isAdmin) {
      console.error("ContractControls.jsx: togglePause: Not admin account", {
        accountAddress: account.address,
        adminAddress,
      });
      toast.error("Only the admin can toggle pause");
      return;
    }

    setIsActionLoading((prev) => ({ ...prev, togglePause: true }));
    const toastId = toast.loading(
      isPaused ? "Unpausing contract..." : "Pausing contract..."
    );
    try {
      const method = isPaused ? "unpause" : "pause";
      console.log("ContractControls.jsx: togglePause: Preparing transaction", {
        method,
        contractAddress: stakingContract.address,
        abi: StakingContractABI.find((item) => item.name === method),
      });

      // Encode transaction data
      const contractInterface = new ethers.Interface(StakingContractABI);
      const encodedData = contractInterface.encodeFunctionData(method, []);

      if (!encodedData || encodedData === "0x") {
        console.error(
          "ContractControls.jsx: togglePause: Invalid encoded data"
        );
        throw new Error(
          "Failed to encode transaction. Verify StakingContract ABI."
        );
      }

      // Send transaction
      const transaction = {
        to: VITE_STAKING_ADDRESS,
        data: encodedData,
        value: "0",
      };
      console.log(
        "ContractControls.jsx: togglePause: Sending transaction",
        transaction
      );
      await account.sendTransaction(transaction);
      console.log(
        "ContractControls.jsx: togglePause: Transaction sent successfully"
      );

      toast.success(isPaused ? "Contract unpaused!" : "Contract paused!", {
        id: toastId,
      });
      await refetchPaused();
    } catch (err) {
      console.error("ContractControls.jsx: togglePause error:", {
        message: err.message,
        stack: err.stack,
        accountAddress: account?.address,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, togglePause: false }));
      console.log("ContractControls.jsx: togglePause completed");
    }
  };

  // Admin access check
  if (
    account?.address &&
    adminAddress &&
    account.address.toLowerCase() !== adminAddress.toLowerCase()
  ) {
    console.log("ContractControls.jsx: Access denied", {
      connectedAddress: account.address,
      adminAddress,
    });
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent text-slate-200">
        <div className="text-center p-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 font-geist">
            Access Denied
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-geist-mono">
            Only the admin address ({truncateAddress(adminAddress)}) can access
            this page.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (isLoading || isPausedLoading || isAdminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-600 border-t-transparent"></div>
      </div>
    );
  }

  console.log("ContractControls.jsx: Rendering UI", {
    adminAddress,
    isPaused,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-b from-cyan-700/10 to-transparent">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl sm:text-3xl font-bold text-slate-200 mb-6 sm:mb-8 font-geist"
      >
        Contract Controls
      </motion.h2>

      {/* Contract Status */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(0)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-cyan-700/30 mb-6 sm:mb-8"
        data-tooltip-id="card-tooltip"
        data-tooltip-content="Current state of the contract"
      >
        <div className="flex items-center space-x-4">
          <AlertTriangle className="w-8 sm:w-10 h-8 sm:h-10 text-cyan-600 flex-shrink-0" />
          <div>
            <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
              Contract Status
            </p>
            <p className="text-xl sm:text-2xl font-bold text-white font-geist">
              {isPaused ? "Paused" : "Active"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Control Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-cyan-700/30"
      >
        <h3 className="text-lg sm:text-xl font-bold text-slate-200 mb-4 font-geist">
          Control Actions
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => {
              console.log("ContractControls.jsx: Toggle Pause button clicked");
              togglePause();
            }}
            disabled={isActionLoading.togglePause || !isAdmin}
            className={`group flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 text-sm sm:text-base font-geist ${
              isActionLoading.togglePause || !isAdmin
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            data-tooltip-id="action-tooltip"
            data-tooltip-content={
              isPaused ? "Unpause the contract" : "Pause the contract"
            }
            aria-label={isPaused ? "Unpause contract" : "Pause contract"}
          >
            {isActionLoading.togglePause ? (
              <div className="animate-spin rounded-full h-5 sm:h-6 w-5 sm:w-6 border-t-2 border-cyan-600 mx-auto"></div>
            ) : (
              <>
                {isPaused ? "Unpause Contract" : "Pause Contract"}
                <Settings className="ml-2 w-4 h-4 transform group-hover:rotate-45 transition-transform duration-300" />
              </>
            )}
          </button>
        </div>
        {!isAdmin && (
          <p className="text-xs sm:text-sm text-slate-400 mt-2 font-geist-mono">
            Only the admin can toggle the contract pause state.
          </p>
        )}
      </motion.div>

      <Tooltip
        id="card-tooltip"
        place="top"
        className="bg-slate-800 text-cyan-600 font-geist-mono text-xs"
      />
      <Tooltip
        id="action-tooltip"
        place="top"
        className="bg-slate-800 text-cyan-600 font-geist-mono text-xs"
      />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #22d3ee",
            fontFamily: "Geist Mono",
            fontSize: "14px",
          },
        }}
      />
    </div>
  );
}