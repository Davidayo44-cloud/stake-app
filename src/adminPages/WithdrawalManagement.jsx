/**
 * WithdrawalManagement.jsx
 * A React component for managing USDT withdrawals on the Binance Smart Chain (BSC).
 * Handles contract balance, minimum withdrawal amount, and withdrawal transactions.
 * Includes input validation with visual feedback and follows senior developer standards.
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  useActiveAccount,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import { getContract, defineChain } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  DollarSign,
} from "lucide-react";
import { Tooltip } from "react-tooltip";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";
import ReactModal from "react-modal";
import { WithdrawalContractABI } from "../config/abis";

// Validate environment variables
const requiredEnvVars = {
  VITE_THIRDWEB_CLIENT_ID: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
  VITE_WITHDRAWAL_CONTRACT_ADDRESS: import.meta.env
    .VITE_WITHDRAWAL_CONTRACT_ADDRESS,
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
  VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_NATIVE_CURRENCY_NAME: import.meta.env.VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL: import.meta.env.VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS: import.meta.env.VITE_NATIVE_CURRENCY_DECIMALS,
  VITE_USDT_ADDRESS: import.meta.env.VITE_USDT_ADDRESS,
  VITE_USDT_DECIMALS: import.meta.env.VITE_USDT_DECIMALS,
  VITE_ADMIN_ADDRESS: import.meta.env.VITE_MOCK_ADMIN_ADDRESS,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error(
    "WithdrawalManagement.jsx: Missing environment variables:",
    missingEnvVars
  );
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(", ")}`
  );
}

const {
  VITE_THIRDWEB_CLIENT_ID,
  VITE_WITHDRAWAL_CONTRACT_ADDRESS,
  VITE_CHAIN_ID,
  VITE_RPC_URL,
  VITE_API_BASE_URL,
  VITE_NATIVE_CURRENCY_NAME,
  VITE_NATIVE_CURRENCY_SYMBOL,
  VITE_NATIVE_CURRENCY_DECIMALS,
  VITE_USDT_ADDRESS,
  VITE_USDT_DECIMALS,
  VITE_ADMIN_ADDRESS,
} = requiredEnvVars;

// Validate contract addresses
if (!ethers.isAddress(VITE_WITHDRAWAL_CONTRACT_ADDRESS)) {
  console.error(
    "WithdrawalManagement.jsx: Invalid Withdrawal contract address:",
    VITE_WITHDRAWAL_CONTRACT_ADDRESS
  );
  throw new Error("Invalid Withdrawal contract address");
}

if (!ethers.isAddress(VITE_USDT_ADDRESS)) {
  console.error(
    "WithdrawalManagement.jsx: Invalid USDT contract address:",
    VITE_USDT_ADDRESS
  );
  throw new Error("Invalid USDT contract address");
}

if (!ethers.isAddress(VITE_ADMIN_ADDRESS)) {
  console.error(
    "WithdrawalManagement.jsx: Invalid Admin address:",
    VITE_ADMIN_ADDRESS
  );
  throw new Error("Invalid Admin address");
}

// Validate chain ID and decimals
const chainId = parseInt(VITE_CHAIN_ID, 10);
if (isNaN(chainId) || chainId <= 0) {
  console.error("WithdrawalManagement.jsx: Invalid chain ID:", VITE_CHAIN_ID);
  throw new Error("Invalid chain ID");
}
const nativeCurrencyDecimals = parseInt(VITE_NATIVE_CURRENCY_DECIMALS, 10);
if (isNaN(nativeCurrencyDecimals) || nativeCurrencyDecimals < 0) {
  console.error(
    "WithdrawalManagement.jsx: Invalid native currency decimals:",
    VITE_NATIVE_CURRENCY_DECIMALS
  );
  throw new Error("Invalid native currency decimals");
}
const usdtDecimals = parseInt(VITE_USDT_DECIMALS, 10);
if (isNaN(usdtDecimals) || usdtDecimals < 0) {
  console.error(
    "WithdrawalManagement.jsx: Invalid USDT decimals:",
    VITE_USDT_DECIMALS
  );
  throw new Error("Invalid USDT decimals");
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
  blockExplorers: [{ name: "BscScan", url: "https://bscscan.com" }],
});

// Initialize contract
const withdrawalContract = getContract({
  client,
  chain: bscChain,
  address: VITE_WITHDRAWAL_CONTRACT_ADDRESS,
  abi: WithdrawalContractABI,
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

/**
 * Error boundary component for rendering error states
 * @param {Object} props - Component props
 * @param {Error} props.error - The error object
 */
function ErrorFallback({ error }) {
  console.error("WithdrawalManagement.jsx: ErrorFallback:", {
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

/**
 * Formats a USDT amount for display
 * @param {BigInt|string|number} amount - The amount to format
 * @returns {string} Formatted amount with 2 decimal places
 */
const formatUsdtAmount = (amount) => {
  try {
    let parsedAmount;
    if (typeof amount === "bigint") {
      parsedAmount = Number(ethers.formatUnits(amount, usdtDecimals));
    } else if (typeof amount === "string" || typeof amount === "number") {
      parsedAmount = Number(amount);
    } else {
      console.warn("formatUsdtAmount: Invalid amount type", {
        amount,
        type: typeof amount,
      });
      return "0.00";
    }
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      console.warn("formatUsdtAmount: Invalid amount", { parsedAmount });
      return "0.00";
    }
    return parsedAmount.toFixed(2);
  } catch (error) {
    console.error("formatUsdtAmount: Error formatting amount", {
      error,
      amount,
    });
    return "0.00";
  }
};

/**
 * Validates the withdrawal form inputs
 * @param {Object} form - The withdrawal form data
 * @param {string} form.to - The recipient address
 * @param {string} form.amount - The withdrawal amount
 * @param {string} minWithdrawalAmount - The minimum withdrawal amount
 * @returns {Object} Validation results
 */
const validateWithdrawForm = ({ to, amount, minWithdrawalAmount }) => {
  const errors = {};
  if (!ethers.isAddress(to)) {
    errors.to = "Invalid Ethereum address";
  }
  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.amount = "Amount must be a positive number";
  } else if (parsedAmount < Number(minWithdrawalAmount)) {
    errors.amount = `Amount must be at least ${minWithdrawalAmount} USDT`;
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default function WithdrawalManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState({
    refresh: false,
    verify: {},
    withdraw: false,
    setMinAmount: false,
  });
  const [withdrawals, setWithdrawals] = useState([]);
  const [contractBalance, setContractBalance] = useState("0");
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState("");
  const [withdrawForm, setWithdrawForm] = useState({ to: "", amount: "" });
  const [formErrors, setFormErrors] = useState({ to: "", amount: "" });
  const [showVerifyModal, setShowVerifyModal] = useState(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showMinAmountModal, setShowMinAmountModal] = useState(false);
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();

  // Contract data hooks
  const {
    data: contractBalanceData,
    isLoading: isBalanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useReadContract({
    contract: withdrawalContract,
    method: "getContractBalance",
    params: [],
    queryOptions: { enabled: true, retry: 3, retryDelay: 1000 },
  });

  const {
    data: minWithdrawalAmountData,
    isLoading: isMinAmountLoading,
    error: minAmountError,
    refetch: refetchMinAmount,
  } = useReadContract({
    contract: withdrawalContract,
    method: "minWithdrawalAmount",
    params: [],
    queryOptions: { enabled: true, retry: 3, retryDelay: 1000 },
  });

  // Check if user is admin
  const isAdmin =
    account?.address?.toLowerCase() === VITE_ADMIN_ADDRESS.toLowerCase();

  // Fetch withdrawals
  const fetchWithdrawals = useCallback(
    async (showToast = true) => {
      if (!account || !account.address) {
        console.log(
          "WithdrawalManagement.jsx: fetchWithdrawals: No account or address",
          {
            accountAddress: account?.address,
          }
        );
        if (showToast) {
          toast.error("Please connect a wallet to fetch withdrawals");
        }
        return;
      }
      setIsActionLoading((prev) => ({ ...prev, refresh: true }));
      let toastId;
      if (showToast) {
        toastId = toast.loading("Fetching withdrawals...");
      }
      try {
        let signature = localStorage.getItem("adminSignature");
        if (!signature) {
          const message = "Admin access";
          signature = await account.signMessage({ message });
          localStorage.setItem("adminSignature", signature);
        }
        const response = await fetch(`${VITE_API_BASE_URL}/api/withdrawals`, {
          headers: {
            "Content-Type": "application/json",
            adminAddress: account.address.toLowerCase(),
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
          console.error("WithdrawalManagement.jsx: Fetch error:", {
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
        setWithdrawals(
          data.map((wd) => ({
            ...wd,
            status:
              wd.status === "awaiting verification" ? "awaiting" : wd.status,
            transactionId: wd._id, // Ensure transactionId is set
          }))
        );
        if (showToast) {
          toast.success("Withdrawals fetched successfully", { id: toastId });
        }
      } catch (err) {
        console.error("WithdrawalManagement.jsx: Fetch withdrawals error:", {
          message: err.message,
          stack: err.stack,
        });
        if (showToast) {
          toast.error(`Error fetching withdrawals: ${err.message}`, {
            id: toastId,
          });
        }
      } finally {
        setIsActionLoading((prev) => ({ ...prev, refresh: false }));
      }
    },
    [account]
  );

  // Fetch contract data
  useEffect(() => {
    const updateData = async () => {
      setIsLoading(true);
      try {
        if (contractBalanceData) {
          setContractBalance(formatUsdtAmount(contractBalanceData));
        }
        if (minWithdrawalAmountData) {
          setMinWithdrawalAmount(formatUsdtAmount(minWithdrawalAmountData));
        }
        setIsLoading(false);
      } catch (err) {
        console.error("WithdrawalManagement.jsx: updateData error:", {
          message: err.message,
          stack: err.stack,
        });
        setError(new Error(`Failed to fetch contract data: ${err.message}`));
        setIsLoading(false);
      }
    };
    updateData();
  }, [contractBalanceData, minWithdrawalAmountData]);

  // Handle errors
  useEffect(() => {
    if (balanceError) {
      console.error("WithdrawalManagement.jsx: balanceError:", {
        message: balanceError.message,
        stack: balanceError.stack,
      });
      toast.error(
        `Failed to fetch contract balance: ${balanceError.message}. Check contract address and network.`
      );
      setError(new Error(`Contract balance error: ${balanceError.message}`));
    }
    if (minAmountError) {
      console.error("WithdrawalManagement.jsx: minAmountError:", {
        message: minAmountError.message,
        stack: minAmountError.stack,
      });
      toast.error(
        `Failed to fetch minimum withdrawal amount: ${minAmountError.message}. Check contract address and network.`
      );
      setError(
        new Error(`Minimum withdrawal amount error: ${minAmountError.message}`)
      );
    }
  }, [balanceError, minAmountError]);

  // Update withdrawal status
  const updateWithdrawalStatus = async (transactionId, status) => {
    setIsActionLoading((prev) => ({
      ...prev,
      verify: { ...prev.verify, [transactionId]: true },
    }));
    const toastId = toast.loading(
      `${
        status === "verified" ? "Verifying" : "Rejecting"
      } withdrawal ${truncateAddress(transactionId)}...`
    );
    try {
      let signature = localStorage.getItem("adminSignature");
      if (!signature) {
        const message = "Admin access";
        signature = await account.signMessage({ message });
        localStorage.setItem("adminSignature", signature);
      }
      const response = await fetch(
        `${VITE_API_BASE_URL}/api/verify-withdrawal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            adminAddress: account.address.toLowerCase(),
            signature,
          },
          body: JSON.stringify({ transactionId, status }),
        }
      );
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        console.error(
          "WithdrawalManagement.jsx: Update withdrawal status error:",
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
      toast.success(`Withdrawal ${truncateAddress(transactionId)} ${status}`, {
        id: toastId,
      });
      await fetchWithdrawals(false);
    } catch (err) {
      console.error("WithdrawalManagement.jsx: updateWithdrawalStatus error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({
        ...prev,
        verify: { ...prev.verify, [transactionId]: false },
      }));
      setShowVerifyModal(null);
    }
  };

  // Withdraw USDT from contract
  const handleWithdrawUSDT = async () => {
    const { isValid, errors } = validateWithdrawForm({
      ...withdrawForm,
      minWithdrawalAmount,
    });
    if (!isValid) {
      setFormErrors(errors);
      toast.error("Invalid recipient address or amount");
      return;
    }
    setIsActionLoading((prev) => ({ ...prev, withdraw: true }));
    const toastId = toast.loading("Withdrawing USDT...");
    try {
      const amount = ethers.parseUnits(withdrawForm.amount, usdtDecimals);
      const tx = {
        to: VITE_WITHDRAWAL_CONTRACT_ADDRESS,
        data: withdrawalContract.interface.encodeFunctionData("withdrawUSDT", [
          withdrawForm.to,
          amount,
        ]),
      };
      await sendTransaction(tx, {
        onSuccess: (result) => {
          toast.success(
            `Withdrawn ${withdrawForm.amount} USDT to ${truncateAddress(
              withdrawForm.to
            )}`,
            { id: toastId }
          );
          setWithdrawForm({ to: "", amount: "" });
          setFormErrors({ to: "", amount: "" });
          refetchBalance();
          fetchWithdrawals(false);
        },
        onError: (error) => {
          console.error("WithdrawalManagement.jsx: USDT withdrawal error:", {
            message: error.message,
            stack: error.stack,
          });
          toast.error(`Failed to withdraw USDT: ${error.message}`, {
            id: toastId,
          });
        },
      });
    } catch (err) {
      console.error("WithdrawalManagement.jsx: handleWithdrawUSDT error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, withdraw: false }));
      setShowWithdrawModal(false);
    }
  };

  // Set minimum withdrawal amount
  const handleSetMinAmount = async () => {
    const parsedAmount = Number(minWithdrawalAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Invalid minimum amount");
      return;
    }
    setIsActionLoading((prev) => ({ ...prev, setMinAmount: true }));
    const toastId = toast.loading("Setting minimum withdrawal amount...");
    try {
      const amount = ethers.parseUnits(minWithdrawalAmount, usdtDecimals);
      const tx = {
        to: VITE_WITHDRAWAL_CONTRACT_ADDRESS,
        data: withdrawalContract.interface.encodeFunctionData(
          "setMinWithdrawalAmount",
          [amount]
        ),
      };
      await sendTransaction(tx, {
        onSuccess: () => {
          toast.success(
            `Minimum withdrawal amount set to ${minWithdrawalAmount} USDT`,
            { id: toastId }
          );
          setMinWithdrawalAmount("");
          refetchMinAmount();
        },
        onError: (error) => {
          console.error("WithdrawalManagement.jsx: Set minimum amount error:", {
            message: error.message,
            stack: error.stack,
          });
          toast.error(`Failed to set minimum amount: ${error.message}`, {
            id: toastId,
          });
        },
      });
    } catch (err) {
      console.error("WithdrawalManagement.jsx: handleSetMinAmount error:", {
        message: err.message,
        stack: err.stack,
      });
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsActionLoading((prev) => ({ ...prev, setMinAmount: false }));
      setShowMinAmountModal(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-600";
      case "verified":
        return "bg-green-600";
      case "failed":
        return "bg-red-600";
      case "awaiting":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
    }
  };

  // Handle input changes with validation
  const handleWithdrawFormChange = (field, value) => {
    setWithdrawForm((prev) => ({ ...prev, [field]: value }));
    const { errors } = validateWithdrawForm({
      ...withdrawForm,
      [field]: value,
      minWithdrawalAmount,
    });
    setFormErrors((prev) => ({ ...prev, [field]: errors[field] || "" }));
  };

  // Auto-fetch on mount
  useEffect(() => {
    ReactModal.setAppElement("#root");
    if (!account || !account.address) {
      console.log(
        "WithdrawalManagement.jsx: Auto-fetch skipped: No account or address"
      );
      return;
    }
    fetchWithdrawals(false);
  }, [account, fetchWithdrawals]);

  // Handle no wallet connected
  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent text-slate-200">
        <div className="text-center p-4">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 font-geist">
            Wallet Not Connected
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-sans">
            Please connect a wallet to manage withdrawals.
          </p>
        </div>
      </div>
    );
  }

  // Handle errors
  if (error) {
    return <ErrorFallback error={error} />;
  }

  // Handle loading state
  if (isLoading || isBalanceLoading || isMinAmountLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-cyan-700/10 to-transparent">
        <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-4 border-cyan-600 border-t-transparent"></div>
      </div>
    );
  }

  // Validate withdraw form for button enablement
  const { isValid: isWithdrawFormValid } = validateWithdrawForm({
    ...withdrawForm,
    minWithdrawalAmount,
  });

  return (
    <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 bg-gradient-to-b from-cyan-700/10 to-transparent overflow-x-hidden">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-200 mb-6 sm:mb-8 lg:mb-10 font-geist"
      >
        Withdrawal Management
      </motion.h2>

      {/* Dashboard Overview */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(0)}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
      >
        <div className="bg-gray-800/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-700/30">
          <h3 className="text-sm sm:text-base font-medium text-slate-400">
            Total Withdrawals
          </h3>
          <p className="text-lg sm:text-xl font-bold text-slate-200">
            {withdrawals.length}
          </p>
        </div>
        <div className="bg-gray-800/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-700/30">
          <h3 className="text-sm sm:text-base font-medium text-slate-400">
            Pending/Awaiting
          </h3>
          <p className="text-lg sm:text-xl font-bold text-slate-200">
            {
              withdrawals.filter(
                (wd) => wd.status === "pending" || wd.status === "awaiting"
              ).length
            }
          </p>
        </div>
        <div className="bg-gray-800/40 backdrop-blur-sm p-4 rounded-lg border border-cyan-700/30">
          <h3 className="text-sm sm:text-base font-medium text-slate-400">
            Contract Balance
          </h3>
          <p className="text-lg sm:text-xl font-bold text-slate-200">
            {contractBalance} USDT
          </p>
        </div>
      </motion.div>

      {/* Withdrawal Management */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(1)}
        whileHover="hover"
        className="bg-gray-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8"
        role="region"
        aria-label="Withdrawal Management"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 font-geist">
            All Withdrawals
          </h3>
          <button
            onClick={() => fetchWithdrawals(true)}
            disabled={isActionLoading.refresh || !account.address}
            className={`group flex items-center justify-center w-full sm:w-auto px-4 py-2 sm:py-3 bg-gray-800 text-cyan-600 border border-cyan-600/60 rounded-lg transition-all duration-300 text-xs sm:text-sm font-sans ${
              isActionLoading.refresh || !account.address
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-700"
            }`}
            data-tooltip-id="action-tooltip"
            data-tooltip-content="Refresh withdrawals list"
            aria-label="Refresh withdrawals"
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
        {withdrawals.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-400 font-sans">
            No withdrawals found.
          </p>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="min-w-full text-left text-xs sm:text-sm text-slate-200 font-sans">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-2 sm:p-3 min-w-[120px] font-medium">
                    Transaction ID
                  </th>
                  <th className="p-2 sm:p-3 min-w-[120px] font-medium">
                    User Address
                  </th>
                  <th className="p-2 sm:p-3 min-w-[150px] font-medium">
                    Bank Details
                  </th>
                  <th className="p-2 sm:p-3 min-w-[100px] font-medium">
                    USDT Amount
                  </th>
                  <th className="p-2 sm:p-3 min-w-[120px] font-medium">
                    Tx Hash
                  </th>
                  <th className="p-2 sm:p-3 min-w-[80px] font-medium">
                    Status
                  </th>
                  <th className="p-2 sm:p-3 min-w-[120px] font-medium">
                    Created At
                  </th>
                  <th className="p-2 sm:p-3 min-w-[140px] font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((wd, index) => (
                  <motion.tr
                    key={wd.transactionId}
                    variants={cardVariants}
                    initial="initial"
                    animate={cardVariants.animate(index)}
                    className="border-b border-gray-700"
                  >
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center">
                        <a
                          href={`https://bscscan.com/tx/${wd.transactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whitespace-nowrap cursor-pointer text-cyan-600 hover:underline"
                          data-tooltip-id={`tx-tooltip-${wd.transactionId}`}
                          data-tooltip-content={wd.transactionId}
                        >
                          {wd.transactionId.slice(0, 6)}...
                          {wd.transactionId.slice(-4)}
                        </a>
                        <button
                          onClick={() => copyToClipboard(wd.transactionId)}
                          className="ml-1 p-1 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
                          data-tooltip-id="action-tooltip"
                          data-tooltip-content="Copy transaction ID"
                          aria-label="Copy transaction ID"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <Tooltip
                        id={`tx-tooltip-${wd.transactionId}`}
                        className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm"
                      />
                    </td>
                    <td className="p-2 sm:p-3">
                      <div className="flex items-center">
                        <a
                          href={`https://bscscan.com/address/${wd.userId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whitespace-nowrap cursor-pointer text-cyan-600 hover:underline"
                          data-tooltip-id={`addr-tooltip-${wd.transactionId}`}
                          data-tooltip-content={wd.userId}
                        >
                          {truncateAddress(wd.userId)}
                        </a>
                        <button
                          onClick={() => copyToClipboard(wd.userId)}
                          className="ml-1 p-1 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
                          data-tooltip-id="action-tooltip"
                          data-tooltip-content="Copy user address"
                          aria-label="Copy user address"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <Tooltip
                        id={`addr-tooltip-${wd.transactionId}`}
                        className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm"
                      />
                    </td>
                    <td className="p-2 sm:p-3">
                      <span
                        className="truncate block max-w-[150px]"
                        data-tooltip-id={`bank-tooltip-${wd.transactionId}`}
                        data-tooltip-content={`${
                          wd.bankDetails?.bankName || "N/A"
                        } - ${wd.bankDetails?.accountNumber || "N/A"} (${
                          wd.bankDetails?.accountName || "N/A"
                        })`}
                      >
                        {wd.bankDetails?.bankName || "N/A"} -{" "}
                        {wd.bankDetails?.accountNumber || "N/A"}
                      </span>
                      <Tooltip
                        id={`bank-tooltip-${wd.transactionId}`}
                        className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm"
                      />
                    </td>
                    <td className="p-2 sm:p-3">
                      {formatUsdtAmount(wd.usdtAmount)} USDT
                    </td>
                    <td className="p-2 sm:p-3">
                      {wd.txHash ? (
                        <div className="flex items-center">
                          <a
                            href={`https://bscscan.com/tx/${wd.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate block max-w-[100px] text-cyan-600 hover:underline"
                            data-tooltip-id={`txhash-tooltip-${wd.transactionId}`}
                            data-tooltip-content={wd.txHash}
                          >
                            {truncateAddress(wd.txHash)}
                          </a>
                          <button
                            onClick={() => copyToClipboard(wd.txHash)}
                            className="ml-1 p-1 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
                            data-tooltip-id="action-tooltip"
                            data-tooltip-content="Copy transaction hash"
                            aria-label="Copy transaction hash"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        "N/A"
                      )}
                      <Tooltip
                        id={`txhash-tooltip-${wd.transactionId}`}
                        className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm"
                      />
                    </td>
                    <td className="p-2 sm:p-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(
                          wd.status
                        )} text-slate-200 whitespace-nowrap`}
                      >
                        {wd.status}
                      </span>
                    </td>
                    <td className="p-2 sm:p-3 whitespace-nowrap">
                      {new Date(wd.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2 sm:p-3">
                      {(wd.status === "pending" ||
                        wd.status === "awaiting") && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => setShowVerifyModal(wd.transactionId)}
                            disabled={
                              isActionLoading.verify[wd.transactionId] ||
                              !isAdmin
                            }
                            className={`group flex items-center justify-center w-full py-1 sm:py-2 px-3 bg-gray-700 text-white border border-green-500 rounded-lg transition-all duration-200 text-xs font-medium hover:bg-gray-600 ${
                              isActionLoading.verify[wd.transactionId] ||
                              !isAdmin
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                            data-tooltip-id="action-tooltip"
                            data-tooltip-content="Verify or reject this withdrawal"
                            aria-label="Verify withdrawal"
                          >
                            {isActionLoading.verify[wd.transactionId] ? (
                              <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-t-2 border-white"></div>
                            ) : (
                              <>
                                Verify/Reject
                                <CheckCircle className="ml-2 w-4 h-4" />
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
      </motion.div>

      {/* Contract Management */}
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate={cardVariants.animate(2)}
        whileHover="hover"
        className="bg-gray-800/40 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-cyan-700/30 mb-6 sm:mb-8"
      >
        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 font-geist mb-4 sm:mb-6">
          Contract Management
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h4 className="text-sm sm:text-base font-medium text-slate-400 mb-2">
              Withdraw USDT
            </h4>
            <div className="space-y-2">
              <div>
                <input
                  type="text"
                  placeholder="Recipient Address"
                  value={withdrawForm.to}
                  onChange={(e) =>
                    handleWithdrawFormChange("to", e.target.value)
                  }
                  className={`w-full px-3 py-2 bg-gray-900 text-slate-200 border rounded-lg focus:outline-none focus:border-cyan-600 text-xs sm:text-sm ${
                    formErrors.to ? "border-red-500" : "border-gray-700"
                  }`}
                />
                {formErrors.to && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.to}</p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  placeholder={`Amount (USDT, min: ${minWithdrawalAmount})`}
                  value={withdrawForm.amount}
                  onChange={(e) =>
                    handleWithdrawFormChange("amount", e.target.value)
                  }
                  className={`w-full px-3 py-2 bg-gray-900 text-slate-200 border rounded-lg focus:outline-none focus:border-cyan-600 text-xs sm:text-sm ${
                    formErrors.amount ? "border-red-500" : "border-gray-700"
                  }`}
                />
                {formErrors.amount && (
                  <p className="text-xs text-red-500 mt-1">
                    {formErrors.amount}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={
                  isActionLoading.withdraw || !isAdmin || !isWithdrawFormValid
                }
                className={`w-full px-4 py-2 bg-gray-800 text-cyan-600 border border-cyan-600/60 rounded-lg text-xs sm:text-sm font-sans ${
                  isActionLoading.withdraw || !isAdmin || !isWithdrawFormValid
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-700"
                }`}
                data-tooltip-id="action-tooltip"
                data-tooltip-content="Withdraw USDT from contract"
              >
                {isActionLoading.withdraw ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-cyan-600 mx-auto"></div>
                ) : (
                  <>
                    Withdraw USDT
                    <DollarSign className="ml-2 w-4 sm:w-5 h-4 sm:h-5 inline" />
                  </>
                )}
              </button>
            </div>
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-medium text-slate-400 mb-2">
              Minimum Withdrawal Amount (Current: {minWithdrawalAmount} USDT)
            </h4>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="New Minimum Amount (USDT)"
                value={minWithdrawalAmount}
                onChange={(e) => setMinWithdrawalAmount(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 text-slate-200 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-600 text-xs sm:text-sm"
              />
              <button
                onClick={() => setShowMinAmountModal(true)}
                disabled={
                  isActionLoading.setMinAmount ||
                  !isAdmin ||
                  !minWithdrawalAmount ||
                  Number(minWithdrawalAmount) <= 0
                }
                className={`w-full px-4 py-2 bg-gray-800 text-cyan-600 border border-cyan-600/60 rounded-lg text-xs sm:text-sm font-sans ${
                  isActionLoading.setMinAmount ||
                  !isAdmin ||
                  !minWithdrawalAmount ||
                  Number(minWithdrawalAmount) <= 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-700"
                }`}
                data-tooltip-id="action-tooltip"
                data-tooltip-content="Set minimum withdrawal amount"
              >
                {isActionLoading.setMinAmount ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-cyan-600 mx-auto"></div>
                ) : (
                  <>
                    Set Minimum Amount
                    <DollarSign className="ml-2 w-4 sm:w-5 h-4 sm:h-5 inline" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Verify Withdrawal Modal */}
      <ReactModal
        isOpen={!!showVerifyModal}
        onRequestClose={() => setShowVerifyModal(null)}
        className="bg-slate-800 p-6 rounded-xl max-w-md mx-auto my-12 border border-cyan-500/20 shadow-xl z-[60]"
        overlayClassName="fixed inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 z-[50]"
      >
        <h3 className="text-lg sm:text-xl font-bold text-slate-200 mb-4">
          Verify Withdrawal
        </h3>
        {showVerifyModal && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-2">Transaction ID:</p>
              <div className="flex items-center">
                <a
                  href={`https://bscscan.com/tx/${showVerifyModal}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:underline text-sm break-all"
                  data-tooltip-id={`modal-tx-tooltip-${showVerifyModal}`}
                  data-tooltip-content={showVerifyModal}
                >
                  {truncateAddress(showVerifyModal, true)}
                </a>
                <button
                  onClick={() => copyToClipboard(showVerifyModal)}
                  className="ml-2 p-1 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300"
                  data-tooltip-id="action-tooltip"
                  data-tooltip-content="Copy transaction ID"
                  aria-label="Copy transaction ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <Tooltip
                id={`modal-tx-tooltip-${showVerifyModal}`}
                className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() =>
                  updateWithdrawalStatus(showVerifyModal, "verified")
                }
                disabled={isActionLoading.verify[showVerifyModal]}
                className={`w-full py-2 px-4 bg-gray-700 text-white border border-green-500 rounded-lg hover:bg-gray-600 text-sm font-medium ${
                  isActionLoading.verify[showVerifyModal]
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {isActionLoading.verify[showVerifyModal] ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mx-auto"></div>
                ) : (
                  "Verify"
                )}
              </button>
              <button
                onClick={() =>
                  updateWithdrawalStatus(showVerifyModal, "failed")
                }
                disabled={isActionLoading.verify[showVerifyModal]}
                className={`w-full py-2 px-4 bg-gray-700 text-white border border-red-500 rounded-lg hover:bg-gray-600 text-sm font-medium ${
                  isActionLoading.verify[showVerifyModal]
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {isActionLoading.verify[showVerifyModal] ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mx-auto"></div>
                ) : (
                  "Reject"
                )}
              </button>
            </div>
            <button
              onClick={() => setShowVerifyModal(null)}
              className="w-full py-2 px-4 bg-gray-800 text-cyan-600 border border-cyan-600/60 rounded-lg hover:bg-gray-700 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </ReactModal>

      {/* Withdraw USDT Modal */}
      <ReactModal
        isOpen={showWithdrawModal}
        onRequestClose={() => setShowWithdrawModal(false)}
        className="bg-slate-800 p-6 rounded-xl max-w-md mx-auto my-12 border border-cyan-500/20 shadow-xl z-[60]"
        overlayClassName="fixed inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 z-[50]"
      >
        <h3 className="text-lg sm:text-xl font-bold text-slate-200 mb-4">
          Confirm USDT Withdrawal
        </h3>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Recipient: {truncateAddress(withdrawForm.to)}
          </p>
          <p className="text-sm text-slate-400">
            Amount: {withdrawForm.amount} USDT
          </p>
          <button
            onClick={handleWithdrawUSDT}
            disabled={isActionLoading.withdraw || !isWithdrawFormValid}
            className={`w-full py-2 px-4 bg-gray-700 text-white border border-green-500 rounded-lg hover:bg-gray-600 text-sm font-medium ${
              isActionLoading.withdraw || !isWithdrawFormValid
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isActionLoading.withdraw ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mx-auto"></div>
            ) : (
              "Confirm Withdrawal"
            )}
          </button>
          <button
            onClick={() => setShowWithdrawModal(false)}
            className="w-full py-2 px-4 bg-gray-800 text-cyan-600 border border-cyan-600/60 rounded-lg hover:bg-gray-700 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </ReactModal>

      {/* Set Minimum Amount Modal */}
      <ReactModal
        isOpen={showMinAmountModal}
        onRequestClose={() => setShowMinAmountModal(false)}
        className="bg-slate-800 p-6 rounded-xl max-w-md mx-auto my-12 border border-cyan-500/20 shadow-xl z-[60]"
        overlayClassName="fixed inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 z-[50]"
      >
        <h3 className="text-lg sm:text-xl font-bold text-slate-200 mb-4">
          Confirm Minimum Withdrawal Amount
        </h3>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            New Minimum Amount: {minWithdrawalAmount} USDT
          </p>
          <button
            onClick={handleSetMinAmount}
            disabled={
              isActionLoading.setMinAmount || Number(minWithdrawalAmount) <= 0
            }
            className={`w-full py-2 px-4 bg-gray-700 text-white border border-green-500 rounded-lg hover:bg-gray-600 text-sm font-medium ${
              isActionLoading.setMinAmount || Number(minWithdrawalAmount) <= 0
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isActionLoading.setMinAmount ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mx-auto"></div>
            ) : (
              "Confirm Set Amount"
            )}
          </button>
          <button
            onClick={() => setShowMinAmountModal(false)}
            className="w-full py-2 px-4 bg-gray-800 text-cyan-600 border border-cyan-600/60 rounded-lg hover:bg-gray-700 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </ReactModal>

      <Tooltip
        id="action-tooltip"
        className="bg-gray-100 text-gray-900 rounded-lg p-2 text-xs sm:text-sm font-semibold"
      />
    </div>
  );
}

/**
 * Truncates an Ethereum address or transaction hash for display
 * @param {string} value - The address or hash to truncate
 * @returns {string} Truncated value or "N/A"
 */
const truncateAddress = (value, showFull = false) => {
  if (!value || typeof value !== "string") return "N/A";
  if (showFull) return value;
  if (value.length === 42 || value.length === 66) {
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  }
  return "N/A";
};