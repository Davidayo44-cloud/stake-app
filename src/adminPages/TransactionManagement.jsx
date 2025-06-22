import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract, defineChain } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
} from "lucide-react";
import { Tooltip } from "react-tooltip";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";
import { StakingContractABI } from "../config/abis/";

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
  VITE_USDT_ADDRESS: import.meta.env.VITE_USDT_ADDRESS,
  VITE_USDT_DECIMALS: import.meta.env.VITE_USDT_DECIMALS,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error(
    "TransactionManagement.jsx: Missing environment variables:",
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
  VITE_USDT_ADDRESS,
  VITE_USDT_DECIMALS,
} = requiredEnvVars;

// Debug environment variables
console.log("TransactionManagement.jsx: Loaded environment variables:", {
  VITE_THIRDWEB_CLIENT_ID,
  VITE_STAKING_ADDRESS,
  VITE_CHAIN_ID,
  VITE_RPC_URL,
  VITE_API_BASE_URL,
  VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS,
  VITE_USDT_ADDRESS,
  VITE_USDT_DECIMALS,
});

// Validate contract addresses
if (!ethers.isAddress(VITE_STAKING_ADDRESS)) {
  console.error(
    "TransactionManagement.jsx: Invalid Staking contract address:",
    VITE_STAKING_ADDRESS
  );
  throw new Error("Invalid Staking contract address");
}

if (!ethers.isAddress(VITE_USDT_ADDRESS)) {
  console.error(
    "TransactionManagement.jsx: Invalid USDT contract address:",
    VITE_USDT_ADDRESS || "undefined"
  );
  throw new Error("Invalid USDT contract address");
}

// Validate chain ID and decimals
const chainId = parseInt(VITE_CHAIN_ID, 10);
if (isNaN(chainId) || chainId <= 0) {
  console.error("TransactionManagement.jsx: Invalid chain ID:", VITE_CHAIN_ID);
  throw new Error("Invalid chain ID");
}
const nativeCurrencyDecimals = parseInt(VITE_NATIVE_CURRENCY_DECIMALS, 10);
if (isNaN(nativeCurrencyDecimals) || nativeCurrencyDecimals < 0) {
  console.error(
    "TransactionManagement.jsx: Invalid native currency decimals:",
    VITE_NATIVE_CURRENCY_DECIMALS
  );
  throw new Error("Invalid native currency decimals");
}
const usdtDecimals = parseInt(VITE_USDT_DECIMALS, 10);
if (isNaN(usdtDecimals) || usdtDecimals < 0) {
  console.error(
    "TransactionManagement.jsx: Invalid USDT decimals:",
    VITE_USDT_DECIMALS
  );
  throw new Error("Invalid USDT decimals");
}

// Initialize thirdweb client
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
  console.error("TransactionManagement.jsx: ErrorFallback:", {
    message: error.message,
    stack: error.stack,
  });
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent text-slate-200">
      <div className="text-center p-4">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 font-geist">
          Something went wrong
        </h2>
        <p className="text-sm sm:text-base text-slate-400 font-sans">
          {error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-gray-800 text-cyan-600 border border-cyan-600/60 rounded-lg hover:bg-gray-700 text-sm sm:text-base font-medium"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

// Truncate address function
const truncateAddress = (address) => {
  if (!address) return "Invalid address";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Truncate name function
const truncateName = (name, maxLength = 20) => {
  if (!name) return "N/A";
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 3)}...`;
};

export default function TransactionManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState({
    refresh: false,
    verify: {},
  });
  const [transactions, setTransactions] = useState([]);
  const account = useActiveAccount();

  // Contract data hooks
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

  // Check if user is admin (for actions, not fetching)
  const isAdmin =
    account?.address &&
    adminAddress 

  // Debug account and admin status
  console.log("TransactionManagement.jsx: Account and admin status:", {
    accountAddress: account?.address,
    adminAddress,
    isAdmin,
  });

  // Fetch transactions
  const fetchTransactions = async (showToast = true) => {
    if (!account || !account.address) {
      console.log(
        "TransactionManagement.jsx: fetchTransactions: No account or address",
        {
          accountAddress: account?.address,
        }
      );
      if (showToast) {
        toast.error("Please connect a wallet to fetch transactions");
      }
      return;
    }
    setIsActionLoading((prev) => ({ ...prev, refresh: true }));
    let toastId;
    if (showToast) {
      toastId = toast.loading("Fetching transactions...");
    }
    try {
      console.log("TransactionManagement.jsx: Fetching transactions...", {
        accountAddress: account.address.toLowerCase(),
      });
      let signature = localStorage.getItem("adminSignature");
      if (!signature) {
        const message = "Admin access";
        signature = await account.signMessage({ message });
        localStorage.setItem("adminSignature", signature);
        console.log("TransactionManagement.jsx: Signature generated", {
          signature,
          accountAddress: account.address.toLowerCase(),
        });
      }
      const response = await fetch(`${VITE_API_BASE_URL}/api/transactions`, {
        headers: {
          "Content-Type": "application/json",
          adminaddress: account.address.toLowerCase(),
          signature,
        },
      });
      console.log("TransactionManagement.jsx: Fetch response:", {
        status: response.status,
        ok: response.ok,
      });
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        console.error("TransactionManagement.jsx: Fetch error:", {
          status: response.status,
          errorText,
        });
        if (
          response.status === 403 &&
          errorText.error === "Invalid signature"
        ) {
          localStorage.removeItem("adminSignature");
        }
        throw new Error(
          `Error ${response.status}: ${JSON.stringify(errorText)}`
        );
      }
      const data = await response.json();
      console.log("TransactionManagement.jsx: Transactions fetched:", data);
      setTransactions(
        data.map((tx) => ({
          ...tx,
          status:
            tx.status === "awaiting verification" ? "awaiting" : tx.status,
        }))
      );
      if (showToast) {
        toast.success("Transactions fetched successfully", { id: toastId });
      }
    } catch (err) {
      console.error("TransactionManagement.jsx: Fetch transactions error:", {
        message: err.message,
        stack: err.stack,
      });
      if (showToast) {
        toast.error(`Error fetching transactions: ${err.message}`, {
          id: toastId,
        });
      }
    } finally {
      setIsActionLoading((prev) => ({ ...prev, refresh: false }));
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    if (!account || !account.address) {
      console.log(
        "TransactionManagement.jsx: Auto-fetch skipped: No account or address"
      );
      return;
    }
    console.log(
      "TransactionManagement.jsx: Auto-fetching transactions on mount"
    );
    fetchTransactions(false); // Initial fetch without toast
  }, [account]);

  // Data fetching
  useEffect(() => {
    console.log(
      "TransactionManagement.jsx: useEffect for data fetching triggered"
    );
    const updateData = async () => {
      setIsLoading(true);
      try {
        if (isAdminLoading) {
          return;
        }
        console.log("TransactionManagement.jsx: updateData: Data fetched", {
          adminAddress,
        });
        setIsLoading(false);
      } catch (err) {
        console.error("TransactionManagement.jsx: updateData error:", {
          message: err.message,
          stack: err.stack,
        });
        setError(err);
        setIsLoading(false);
      }
    };
    updateData();
  }, [adminAddress, isAdminLoading]);

  // Handle errors
  useEffect(() => {
    console.log(
      "TransactionManagement.jsx: useEffect for error handling triggered"
    );
    if (adminError) {
      console.error("TransactionManagement.jsx: adminError:", {
        message: adminError.message,
        stack: adminError.stack,
      });
      toast.error(`Failed to fetch admin address: ${adminError.message}`);
      setError(adminError);
    }
  }, [adminError]);

  // Update transaction status function
  const updateTransactionStatus = async (transactionId, status) => {
    setIsActionLoading((prev) => ({
      ...prev,
      verify: { ...prev.verify, [transactionId]: true },
    }));
    const toastId = toast.loading(
      `${
        status === "verified" ? "Verifying" : "Failing"
      } transaction ${truncateAddress(transactionId)}...`
    );
    try {
      let signature = localStorage.getItem("adminSignature");
      if (!signature) {
        const message = "Admin access";
        signature = await account.signMessage({ message });
        localStorage.setItem("adminSignature", signature);
      }
      const response = await fetch(
        `${VITE_API_BASE_URL}/api/verify-transaction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            adminaddress: account.address.toLowerCase(),
            signature,
          },
          body: JSON.stringify({ transactionId, status }),
        }
      );
      console.log("TransactionManagement.jsx: Update transaction response:", {
        status: response.status,
        ok: response.ok,
      });
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        console.error(
          "TransactionManagement.jsx: Update transaction status error:",
          {
            status: response.status,
            errorText,
          }
        );
        if (
          response.status === 403 &&
          errorText.error === "Invalid signature"
        ) {
          localStorage.removeItem("adminSignature");
        }
        throw new Error(
          `Error ${response.status}: ${JSON.stringify(errorText)}`
        );
      }
      const data = await response.json();
      console.log(`TransactionManagement.jsx: Transaction ${status}:`, data);
      toast.success(`Transaction ${truncateAddress(transactionId)} ${status}`, {
        id: toastId,
      });
      await fetchTransactions(false); // Refresh list without toast
    } catch (err) {
      console.error(
        "TransactionManagement.jsx: updateTransactionStatus error:",
        {
          message: err.message,
          stack: err.stack,
        }
      );
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({
        ...prev,
        verify: { ...prev.verify, [transactionId]: false },
      }));
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy");
      });
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-red-600";
      case "verified":
        return "bg-green-600";
      case "failed":
        return "bg-red-600";
      case "awaiting":
        return "bg-yellow-600";
      default:
        return "bg-gray-600";
    }
  };

  // Format USDT amount
  const formatUsdtAmount = (amount) => {
    console.log("formatUsdtAmount: Input:", { amount, type: typeof amount });
    const parsedAmount =
      typeof amount === "string" ? parseFloat(amount) : amount;
    if (!parsedAmount || isNaN(parsedAmount)) {
      console.warn("formatUsdtAmount: Invalid amount, returning 0.00", {
        parsedAmount,
      });
      return "0.00";
    }
    const formatted = parsedAmount.toFixed(2);
    console.log("formatUsdtAmount: Output:", formatted);
    return formatted;
  };

  // // Admin access check (commented out for testing)
  // if (
  //   account &&
  //   adminAddress &&
  //   account.address.toLowerCase() !== adminAddress.toLowerCase()
  // ) {
  //   console.log("TransactionManagement.jsx: Access denied", {
  //     connectedAddress: account.address,
  //     adminAddress,
  //   });
  //   return (
  //     <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent text-slate-200">
  //       <div className="text-center p-4">
  //         <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-geist">
  //           Access Denied
  //         </h2>
  //         <p className="text-sm sm:text-base text-slate-400 font-sans">
  //           Only the admin address ({truncateAddress(adminAddress)}) can access this page.
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  // No wallet connected
  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent text-slate-200">
        <div className="text-center p-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-geist">
            Wallet Not Connected
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-sans">
            Please connect a wallet to view transactions.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (isLoading || isAdminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent">
        <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-4 border-cyan-600 border-t-transparent"></div>
      </div>
    );
  }

  console.log("TransactionManagement.jsx: Rendering UI", {
    adminAddress,
    transactions,
  });

  return (
    <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 bg-gradient-to-b from-cyan-700/10 to-transparent overflow-x-hidden">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-200 mb-6 sm:mb-8 lg:mb-10 font-geist"
      >
        Transaction Management
      </motion.h2>

      {/* Transaction Management */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(0)}
        whileHover="hover"
        className="bg-gray-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30"
        role="region"
        aria-label="Transaction Management"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 font-geist">
            All Transactions
          </h3>
          <button
            onClick={() => fetchTransactions(true)}
            disabled={isActionLoading.refresh || !account.address}
            className={`group flex items-center justify-center w-full sm:w-auto px-4 py-2 sm:py-3 bg-gray-800 text-cyan-600 border border-cyan-600/60 rounded-lg transition-all duration-300 text-xs sm:text-sm font-sans ${
              isActionLoading.refresh || !account.address
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-700"
            }`}
            data-tooltip-id="action-tooltip"
            data-tooltip-content="Refresh transactions list"
            aria-label="Refresh transactions"
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
        {transactions.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-400 font-sans">
            No transactions found.
          </p>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="min-w-full text-left text-xs sm:text-sm text-slate-200 font-sans">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-2 sm:p-3 min-w-[100px] sm:min-w-[120px] font-medium">
                    Transaction ID
                  </th>
                  <th className="p-2 sm:p-3 min-w-[100px] sm:min-w-[120px] font-medium">
                    User Address
                  </th>
                  <th className="p-2 sm:p-3 min-w-[80px] font-medium">Name</th>
                  <th className="p-2 sm:p-3 min-w-[80px] font-medium hidden sm:table-cell">
                    USDT Amount
                  </th>
                  <th className="p-2 sm:p-3 min-w-[100px] sm:min-w-[120px] font-medium hidden sm:table-cell">
                    Naira Amount
                  </th>
                  <th className="p-2 sm:p-3 min-w-[80px] font-medium">
                    Status
                  </th>
                  <th className="p-2 sm:p-3 min-w-[100px] sm:min-w-[120px] font-medium hidden sm:table-cell">
                    Created At
                  </th>
                  <th className="p-2 sm:p-3 min-w-[120px] sm:min-w-[140px] font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <motion.tr
                    key={tx._id}
                    variants={cardVariants}
                    initial="initial"
                    animate={cardVariants.animate(index)}
                    className="border-b border-gray-700"
                  >
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center">
                        <span
                          className="whitespace-nowrap cursor-pointer"
                          data-tooltip-id={`tx-tooltip-${tx._id}`}
                          data-tooltip-content={tx._id}
                        >
                          {truncateAddress(tx._id)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(tx._id)}
                          className="ml-1 p-1 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
                          data-tooltip-id="action-tooltip"
                          data-tooltip-content="Copy transaction ID"
                          aria-label="Copy transaction ID"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <Tooltip
                        id={`tx-tooltip-${tx._id}`}
                        className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm"
                      />
                    </td>
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center">
                        <span
                          className="whitespace-nowrap cursor-pointer"
                          data-tooltip-id={`addr-tooltip-${tx._id}`}
                          data-tooltip-content={tx.address}
                        >
                          {truncateAddress(tx.address)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(tx.address)}
                          className="ml-1 p-1 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
                          data-tooltip-id="action-tooltip"
                          data-tooltip-content="Copy user address"
                          aria-label="Copy user address"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <Tooltip
                        id={`addr-tooltip-${tx._id}`}
                        className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm"
                      />
                    </td>
                    <td className="p-2 sm:p-3">
                      <span
                        className="truncate block max-w-[100px]"
                        data-tooltip-id={`name-tooltip-${tx._id}`}
                        data-tooltip-content={tx.name}
                      >
                        {truncateName(tx.name)}
                      </span>
                      <Tooltip
                        id={`name-tooltip-${tx._id}`}
                        className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm"
                      />
                    </td>
                    <td className="p-2 sm:p-3 hidden sm:table-cell">
                      {formatUsdtAmount(tx.usdtAmount)} USDT
                    </td>
                    <td className="p-2 sm:p-3 hidden sm:table-cell">
                      ₦{tx.nairaAmount.toLocaleString()}
                    </td>
                    <td className="p-2 sm:p-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(
                          tx.status
                        )} text-slate-200 whitespace-nowrap`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 whitespace-nowrap hidden sm:table-cell">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2 sm:p-3">
                      {tx.status === "awaiting" && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() =>
                              updateTransactionStatus(tx._id, "verified")
                            }
                            disabled={
                              isActionLoading.verify[tx._id] || !isAdmin
                            }
                            className={`group flex items-center justify-center w-full py-1 sm:py-2 px-3 bg-gray-700 text-white border border-green-500 rounded-lg transition-all duration-200 text-xs font-medium hover:bg-gray-600 ${
                              isActionLoading.verify[tx._id] || !isAdmin
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            data-tooltip-id="action-tooltip"
                            data-tooltip-content="Verify this transaction"
                            aria-label="Verify transaction"
                          >
                            {isActionLoading.verify[tx._id] ? (
                              <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-t-2 border-white"></div>
                            ) : (
                              <>
                                Verify
                                <CheckCircle className="ml-2 w-4 h-4" />
                              </>
                            )}
                          </button>
                          <button
                            onClick={() =>
                              updateTransactionStatus(tx._id, "failed")
                            }
                            disabled={
                              isActionLoading.verify[tx._id] || !isAdmin
                            }
                            className={`group flex items-center justify-center w-full py-1 sm:py-2 px-3 bg-gray-700 text-white border border-red-500 rounded-lg transition-all duration-200 text-xs font-medium hover:bg-gray-600 ${
                              isActionLoading.verify[tx._id] || !isAdmin
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            data-tooltip-id="action-tooltip"
                            data-tooltip-content="Mark this transaction as failed"
                            aria-label="Fail transaction"
                          >
                            {isActionLoading.verify[tx._id] ? (
                              <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-t-2 border-white"></div>
                            ) : (
                              <>
                                Fail
                                <XCircle className="ml-2 w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Tooltip
          id="action-tooltip"
          className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm font-semibold"
        />
      </motion.div>
    </div>
  );
}
