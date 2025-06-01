
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract, defineChain } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import { AlertTriangle, Settings, UserX, UserCheck, RefreshCw, Copy } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";
import { StakingContractABI } from "../config/abis";

// Validate environment variables
const requiredEnvVars = {
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  VITE_STAKING_ADDRESS: import.meta.env.VITE_STAKING_ADDRESS,
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
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
  VITE_API_BASE_URL,
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

// Define chain (BSC)
const bscChain = defineChain({
  id: chainId,
  rpc: VITE_RPC_URL,
  nativeCurrency: {
    name: VITE_NATIVE_CURRENCY_NAME,
    symbol: VITE_NATIVE_CURRENCY_SYMBOL,
    decimals: nativeCurrencyDecimals,
  },
  blockExplorers: [
    {
      name: "BscScan",
      url: "https://bscscan.com",
    },
  ],
});

// Initialize contract
const stakingContract = getContract({
  client,
  chain: bscChain,
  address: VITE_STAKING_ADDRESS,
  abi: StakingContractABI,
  rpcOverride: VITE_RPC_URL,
});

// Card animation variants
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: index * 0.1 },
  }),
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

// Truncate address function
const truncateAddress = (address) => {
  if (!address || !ethers.isAddress(address)) return "Invalid address";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Truncate reason function
const truncateReason = (reason, maxLength = 20) => {
  if (!reason) return "No reason provided";
  if (reason.length <= maxLength) return reason;
  return `${reason.slice(0, maxLength - 3)}...`;
};

export function ContractControls() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState({
    togglePause: false,
    suspend: false,
    unsuspend: false,
    refresh: false,
  });
  const [suspendedAccounts, setSuspendedAccounts] = useState([]);
  const [suspendAddress, setSuspendAddress] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [isAddressValid, setIsAddressValid] = useState(null); // null: empty, true: valid, false: invalid
  const account = useActiveAccount();

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

  // Validate address on input change
  useEffect(() => {
    if (suspendAddress === "") {
      setIsAddressValid(null);
    } else {
      setIsAddressValid(ethers.isAddress(suspendAddress));
    }
  }, [suspendAddress]);

  // Fetch suspended accounts
  const fetchSuspendedAccounts = async (showToast = true) => {
    if (!isAdmin || !account) {
      console.log("ContractControls.jsx: fetchSuspendedAccounts: Not admin or no account", {
        isAdmin,
        accountAddress: account?.address,
      });
      return;
    }
    setIsActionLoading((prev) => ({ ...prev, refresh: true }));
    let toastId;
    if (showToast) {
      toastId = toast.loading("Fetching suspended accounts...");
    }
    try {
      console.log("ContractControls.jsx: Fetching suspended accounts", {
        adminAddress: account.address?.toLowerCase(),
      });
      let signature = localStorage.getItem("adminSignature");
      if (!signature) {
        const message = "Admin access";
        signature = await account.signMessage({ message });
        localStorage.setItem("adminSignature", signature);
        console.log("ContractControls.jsx: Signature generated", {
          message,
          signature,
          adminAddress: account.address?.toLowerCase(),
        });
      }
      const response = await fetch(`${VITE_API_BASE_URL}/api/suspended-accounts`, {
        headers: {
          adminaddress: account.address.toLowerCase(),
          signature,
        },
      });
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        console.error("ContractControls.jsx: Fetch error", {
          status: response.status,
          errorText,
        });
        if (response.status === 403 && errorText.error === "Invalid signature") {
          localStorage.removeItem("adminSignature");
        }
        throw new Error(`HTTP error! status: ${response.status}, response: ${JSON.stringify(errorText)}`);
      }
      const data = await response.json();
      console.log("ContractControls.jsx: Suspended accounts fetched", data);
      setSuspendedAccounts(data);
      if (showToast) {
        toast.success("Suspended accounts fetched", { id: toastId });
      }
    } catch (err) {
      console.error("ContractControls.jsx: Fetch suspended accounts error:", {
        message: err.message,
        stack: err.stack,
      });
      if (showToast) {
        toast.error(`Failed to fetch suspended accounts: ${err.message}`, { id: toastId });
      }
    } finally {
      setIsActionLoading((prev) => ({ ...prev, refresh: false }));
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    if (!isAdmin || !account) return;
    fetchSuspendedAccounts(false); // Initial fetch without toast
  }, [isAdmin, account]);

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
      toast.error("Please connect a valid wallet via MetaMask");
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
        "ContractControls.jsx: togglePause: Transaction sent successfully completed"
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

  // Suspend account function
  const suspendAccount = async () => {
    if (!isAddressValid) {
      console.error("ContractControls.jsx: suspendAccount: Invalid address", {
        suspendAddress,
      });
      toast.error("Invalid address entered");
      return;
    }

    setIsActionLoading((prev) => ({ ...prev, suspend: true }));
    const toastId = toast.loading("Suspending account...");
    try {
      let signature = localStorage.getItem("adminSignature");
      if (!signature) {
        const message = "Admin access";
        signature = await account.signMessage({ message });
        localStorage.setItem("adminSignature", signature);
      }
      const response = await fetch(`${VITE_API_BASE_URL}/api/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          adminaddress: account.address.toLowerCase(),
          signature,
        },
        body: JSON.stringify({
          address: suspendAddress,
          reason: suspendReason || "No reason provided",
        }),
      });
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        console.error("ContractControls.jsx: Suspend error", {
          status: response.status,
          errorText,
        });
        if (response.status === 403 && errorText.error === "Invalid signature") {
          localStorage.removeItem("adminSignature");
        }
        throw new Error(`HTTP error! status: ${response.status}, response: ${JSON.stringify(errorText)}`);
      }
      const data = await response.json();
      console.log("ContractControls.jsx: suspendAccount: Account suspended", data);
      toast.success(`Account ${truncateAddress(suspendAddress)} suspended`, { id: toastId });
      setSuspendAddress("");
      setSuspendReason("");
      await fetchSuspendedAccounts(false); // Refresh list without toast
    } catch (err) {
      console.error("ContractControls.jsx: suspendAccount error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, suspend: false }));
    }
  };

  // Unsuspend account function
  const unsuspendAccount = async (address) => {
    setIsActionLoading((prev) => ({ ...prev, unsuspend: true }));
    const toastId = toast.loading(`Unsuspending ${truncateAddress(address)}...`);
    try {
      let signature = localStorage.getItem("adminSignature");
      if (!signature) {
        const message = "Admin access";
        signature = await account.signMessage({ message });
        localStorage.setItem("adminSignature", signature);
      }
      const response = await fetch(`${VITE_API_BASE_URL}/api/unsuspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          adminaddress: account.address.toLowerCase(),
          signature,
        },
        body: JSON.stringify({ address }),
      });
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        console.error("ContractControls.jsx: Unsuspend error", {
          status: response.status,
          errorText,
        });
        if (response.status === 403 && errorText.error === "Invalid signature") {
          localStorage.removeItem("adminSignature");
        }
        throw new Error(`HTTP error! status: ${response.status}, response: ${JSON.stringify(errorText)}`);
      }
      const data = await response.json();
      console.log("ContractControls.jsx: unsuspendAccount: Account unsuspended", data);
      toast.success(`Account ${truncateAddress(address)} unsuspended`, { id: toastId });
      await fetchSuspendedAccounts(false); // Refresh list without toast
    } catch (err) {
      console.error("ContractControls.jsx: unsuspendAccount error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, unsuspend: false }));
    }
  };

  // Copy address to clipboard
  const copyToClipboard = (address) => {
    navigator.clipboard.writeText(address).then(() => {
      toast.success("Full address copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy address");
    });
  };

  // Admin access check
  if (
    account &&
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
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-geist">
            Access Denied
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-geist-mono">
            Only the admin address ({truncateAddress(adminAddress)}) can access this page.
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
        <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-4 border-cyan-600 border-t-transparent"></div>
      </div>
    );
  }

  console.log("ContractControls.jsx: Rendering UI", {
    adminAddress,
    isPaused,
    suspendedAccounts,
  });

  return (
    <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 bg-gradient-to-b from-cyan-700/10 to-transparent overflow-x-hidden">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-200 mb-6 sm:mb-8 lg:mb-10 font-geist"
      >
        Contract Controls
      </motion.h2>

      {/* Contract Status */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(0)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8 lg:mb-10"
        data-tooltip-id="card-tooltip"
        data-tooltip-content="Current state of the contract"
        role="region"
        aria-label="Contract Status"
      >
        <div className="flex items-center space-x-4">
          <AlertTriangle className="w-8 sm:w-10 h-8 sm:h-10 text-cyan-600 flex-shrink-0" />
          <div>
            <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
              Contract Status
            </p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-geist">
              {isPaused ? "Paused" : "Active"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Control Actions */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(1)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8 lg:mb-10"
      >
        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 mb-4 sm:mb-6 font-geist">
          Control Actions
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={() => {
              console.log("ContractControls.jsx: Toggle Pause button clicked");
              togglePause();
            }}
            disabled={isActionLoading.togglePause || !isAdmin}
            className={`group flex items-center justify-center w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-lg hover:bg-slate-700 transition-all duration-300 text-sm sm:text-base font-geist-mono ${
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
                <Settings className="ml-2 w-4 sm:w-5 h-4 sm:h-5 transform group-hover:rotate-45 transition-transform duration-300" />
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

      {/* Suspension Management */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(2)}
        whileHover="hover"
        className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30"
        role="region"
        aria-label="Suspension Management"
      >
        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 mb-4 sm:mb-6 font-geist">
          Suspension Management
        </h3>
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="Enter address to suspend"
              value={suspendAddress}
              onChange={(e) => setSuspendAddress(e.target.value)}
              className={`w-full sm:flex-1 px-4 py-2 sm:py-3 bg-slate-900 text-slate-200 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-600 text-xs sm:text-sm font-geist-mono transition-colors ${
                isAddressValid === null
                  ? "border-cyan-700/50"
                  : isAddressValid
                  ? "border-green-500"
                  : "border-red-500"
              }`}
              aria-label="Address to suspend"
            />
            <input
              type="text"
              placeholder="Reason (optional)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full sm:flex-1 px-4 py-2 sm:py-3 bg-slate-900 text-slate-200 border border-cyan-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-600 text-xs sm:text-sm font-geist-mono"
              aria-label="Suspension reason"
            />
            <button
              onClick={suspendAccount}
              disabled={isActionLoading.suspend || !isAdmin || !isAddressValid}
              className={`group flex items-center justify-center w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-lg transition-all duration-300 text-xs sm:text-sm font-geist-mono ${
                isActionLoading.suspend || !isAdmin || !isAddressValid
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-slate-700"
              }`}
              data-tooltip-id="action-tooltip"
              data-tooltip-content="Suspend a user"
              aria-label="Suspend account"
            >
              {isActionLoading.suspend ? (
                <div className="animate-spin rounded-full h-5 sm:h-6 w-5 sm:w-6 border-t-2 border-cyan-600 mx-auto"></div>
              ) : (
                <>
                  Suspend Account
                  <UserX className="ml-2 w-4 sm:w-5 h-4 sm:h-5" />
                </>
              )}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
            <h4 className="text-sm sm:text-base lg:text-lg font-bold text-slate-200 font-geist">
              Suspended Accounts
            </h4>
            <button
              onClick={() => fetchSuspendedAccounts(true)}
              disabled={isActionLoading.refresh || !isAdmin}
              className={`group flex items-center justify-center w-full sm:w-auto px-4 py-2 sm:py-3 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-lg transition-all duration-300 text-xs sm:text-sm font-geist-mono ${
                isActionLoading.refresh || !isAdmin
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-slate-700"
              }`}
              data-tooltip-id="action-tooltip"
              data-tooltip-content="Refresh suspended accounts list"
              aria-label="Refresh suspended accounts"
            >
              {isActionLoading.refresh ? (
                <div className="animate-spin rounded-full h-5 sm:h-6 w-5 sm:w-6 border-t-2 border-cyan-600 mx-auto"></div>
              ) : (
                <>
                  Refresh
                  <RefreshCw className="ml-2 w-4 sm:w-5 h-4 sm:h-5" />
                </>
              )}
            </button>
          </div>
          {suspendedAccounts.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-400 font-geist-mono">
              No accounts are currently suspended.
            </p>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="min-w-full text-left text-xs sm:text-sm text-slate-200 font-sans">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="p-2 sm:p-3 min-w-[100px] sm:min-w-[120px] font-medium">
                      Address
                    </th>
                    <th className="p-2 sm:p-3 min-w-[100px] sm:min-w-[120px] font-medium hidden sm:table-cell">
                      Reason
                    </th>
                    <th className="p-2 sm:p-3 min-w-[100px] sm:min-w-[140px] font-medium hidden sm:table-cell">
                      Suspended At
                    </th>
                    <th className="p-2 sm:p-3 min-w-[100px] sm:min-w-[100px] font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {suspendedAccounts.map((account, index) => (
                    <motion.tr
                      key={account.address}
                      variants={cardVariants}
                      initial="initial"
                      animate={cardVariants.animate(index)}
                      className="border-b border-gray-600"
                    >
                      <td className="p-2 sm:p-3">
                        <div className="flex items-center">
                          <span className="whitespace-nowrap">
                            {truncateAddress(account.address)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(account.address)}
                            className="ml-1 p-1 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
                            data-tooltip-id="action-tooltip"
                            data-tooltip-content="Copy full address"
                            aria-label="Copy address"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Mobile: Show Reason and Suspended At */}
                        <div className="sm:hidden mt-1 text-xs text-gray-400">
                          <div>{truncateReason(account.reason, 40)}</div>
                          <div>{new Date(account.suspendedAt).toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 hidden sm:table-cell max-w-[150px]">
                        <span
                          className="truncate block"
                          data-tooltip-id={`reason-tooltip-${account.address}`}
                          data-tooltip-content={account.reason || "No reason provided"}
                        >
                          {truncateReason(account.reason)}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">
                        {new Date(account.suspendedAt).toLocaleString()}
                      </td>
                      <td className="p-2 sm:p-3">
                        <button
                          onClick={() => unsuspendAccount(account.address)}
                          disabled={isActionLoading.unsuspend || !isAdmin}
                          className={`group flex items-center justify-center w-full py-1 sm:py-2 px-3 bg-gray-700 text-white border border-green-500 rounded-lg transition-all duration-200 text-xs font-medium hover:bg-gray-600 ${
                            isActionLoading.unsuspend || !isAdmin
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          data-tooltip-content="Unsuspend this account"
                          aria-label="Unsuspend account"
                        >
                          {isActionLoading.unsuspend ? (
                            <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:h-5 border-t-2 border-white"></div>
                          ) : (
                            <>
                              Unsuspend
                              <UserCheck className="ml-2 w-4 h-4" />
                            </>
                          )}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tooltips */}
        <Tooltip
          id="card-tooltip"
          className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm font-semibold"
        />
        <Tooltip
          id="action-tooltip"
          className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm font-semibold"
        />
        {suspendedAccounts.map((account) => (
          <Tooltip
            key={account.address}
            id={`reason-tooltip-${account.address}`}
            className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm"
          />
        ))}
      </motion.div>
    </div>
  );
}
