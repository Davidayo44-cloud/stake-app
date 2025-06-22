
import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Copy,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  History,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";
import ReactModal from "react-modal";

// Environment variables
const requiredEnvVars = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_WEMA_BANK_ACCOUNT_NAME: import.meta.env.VITE_WEMA_BANK_ACCOUNT_NAME,
  VITE_WEMA_BANK_ACCOUNT_NUMBER: import.meta.env.VITE_WEMA_BANK_ACCOUNT_NUMBER,
  VITE_USDT_RATE: import.meta.env.VITE_USDT_RATE || "1600",
};

// Validate environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error(
    "BuyCrypto.jsx: Missing environment variables:",
    missingEnvVars
  );
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(
      ", "
    )}. Please check your .env file.`
  );
}

const {
  VITE_API_BASE_URL,
  VITE_WEMA_BANK_ACCOUNT_NAME,
  VITE_WEMA_BANK_ACCOUNT_NUMBER,
  VITE_USDT_RATE,
} = requiredEnvVars;

// Validate USDT rate
const usdtRate = parseFloat(VITE_USDT_RATE);
if (isNaN(usdtRate) || usdtRate <= 0) {
  console.error("BuyCrypto.jsx: Invalid USDT rate:", VITE_USDT_RATE);
  throw new Error("Invalid USDT rate");
}

export default function BuyCrypto() {
  const account = useActiveAccount();
  const [formData, setFormData] = useState({
    name: "",
    usdtAmount: "",
  });
  const [nairaEquivalent, setNairaEquivalent] = useState(0);
  const [isFormValid, setIsFormValid] = useState({
    name: true,
    usdtAmount: true,
  });
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isPaidConfirmModalOpen, setIsPaidConfirmModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [lastVerifiedTransaction, setLastVerifiedTransaction] = useState(null); // Track last verified transaction

  // Set modal app element
  useEffect(() => {
    try {
      ReactModal.setAppElement("#root");
    } catch (err) {
      console.warn("Failed to set ReactModal app element:", err.message);
    }
  }, []);

  // Load persisted transaction state and validate status
  useEffect(() => {
    const savedTransactionId = sessionStorage.getItem("pendingTransactionId");
    if (savedTransactionId && account?.address) {
      // Validate transaction status before setting state
      const validateTransaction = async () => {
        try {
          const response = await fetch(`${VITE_API_BASE_URL}/api/check-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId: savedTransactionId }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to check status");
          }
          if (data.status === "pending" || data.status === "awaiting verification") {
            setTransactionId(savedTransactionId);
            setShowBankDetails(true);
            setPendingTransaction({ _id: savedTransactionId, status: data.status });
            toast("You have a pending transaction. Please complete it.", {
              icon: "ℹ️",
            });
          } else if (data.status === "verified" || data.status === "failed") {
            sessionStorage.removeItem("pendingTransactionId");
            setLastVerifiedTransaction(savedTransactionId); // Mark as verified to avoid toast
          }
        } catch (error) {
          console.error("Validate transaction error:", error);
          sessionStorage.removeItem("pendingTransactionId"); // Clear invalid transaction
        }
      };
      validateTransaction();
    }
    if (account?.address) {
      checkPendingTransaction();
    }
  }, [account]);

  // Validate form inputs and calculate Naira equivalent
  useEffect(() => {
    const usdtAmountNum = Number(formData.usdtAmount);
    setIsFormValid({
      name: formData.name.trim().length > 0,
      usdtAmount: !isNaN(usdtAmountNum) && usdtAmountNum > 0,
    });
    setNairaEquivalent(usdtAmountNum * usdtRate);
  }, [formData]);

  // Fetch transaction history
  useEffect(() => {
    if (!account?.address) return;
    const fetchTransactions = async () => {
      try {
        const response = await fetch(`${VITE_API_BASE_URL}/api/transactions`, {
          headers: {
            "Content-Type": "application/json",
            useraddress: account.address,
          },
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Transaction fetch error response:", errorData);
          throw new Error(errorData.error || "Failed to fetch transactions");
        }
        const data = await response.json();
        const updatedTransactions = data.map((tx) => ({
          ...tx,
          status:
            tx.status === "awaiting verification" ? "awaiting" : tx.status,
        }));
        setTransactions(updatedTransactions);
        // Check for pending or awaiting transaction
        const pending = updatedTransactions.find(
          (tx) => tx.status === "pending" || tx.status === "awaiting"
        );
        if (pending && !pendingTransaction) {
          setPendingTransaction(pending);
          setTransactionId(pending._id);
          setShowBankDetails(true);
          setFormData({ name: pending.name, usdtAmount: pending.usdtAmount });
          sessionStorage.setItem("pendingTransactionId", pending._id);
          toast("You have a pending transaction. Please complete it.", {
            icon: "ℹ️",
          });
        }
      } catch (error) {
        console.error("Fetch transactions error:", error);
        toast.error(`Failed to load transaction history: ${error.message}`);
      }
    };
    fetchTransactions();
  }, [account?.address, pendingTransaction]);

  // Poll transaction status
  useEffect(() => {
    if (!transactionId || !showBankDetails) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${VITE_API_BASE_URL}/api/check-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Failed to check status");
        if (data.status === "verified" && transactionId !== lastVerifiedTransaction) {
          toast.success("Transaction verified! USDT credited.");
          setShowBankDetails(false);
          setTransactionId("");
          setPendingTransaction(null);
          setFormData({ name: "", usdtAmount: "" });
          setLastVerifiedTransaction(transactionId); // Mark as verified
          sessionStorage.removeItem("pendingTransactionId");
          if (account?.address) {
            const txResponse = await fetch(
              `${VITE_API_BASE_URL}/api/transactions`,
              {
                headers: {
                  "Content-Type": "application/json",
                  useraddress: account.address,
                },
              }
            );
            if (txResponse.ok) {
              const data = await txResponse.json();
              setTransactions(
                data.map((tx) => ({
                  ...tx,
                  status:
                    tx.status === "awaiting verification"
                      ? "awaiting"
                      : tx.status,
                }))
              );
            }
          }
        } else if (data.status === "failed") {
          toast.error("Transaction failed. Please contact support.");
          setShowBankDetails(false);
          setFormData({ name: "", usdtAmount: "" });
          setTransactionId("");
          setPendingTransaction(null);
          sessionStorage.removeItem("pendingTransactionId");
        }
      } catch (error) {
        console.error("Check status error:", error);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [transactionId, showBankDetails, account, lastVerifiedTransaction]);

  // Check for pending transactions
  const checkPendingTransaction = async () => {
    if (!account?.address) return;
    try {
      const response = await fetch(`${VITE_API_BASE_URL}/api/transactions`, {
        headers: {
          "Content-Type": "application/json",
          useraddress: account.address,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch transactions");
      }
      const data = await response.json();
      const pending = data.find(
        (tx) => tx.status === "pending" || tx.status === "awaiting verification"
      );
      if (pending) {
        setPendingTransaction(pending);
        setTransactionId(pending._id);
        setShowBankDetails(true);
        setFormData({ name: pending.name, usdtAmount: pending.usdtAmount });
        sessionStorage.setItem("pendingTransactionId", pending._id);
        toast("You have a pending transaction. Please complete it.", {
          icon: "ℹ️",
        });
      }
    } catch (error) {
      console.error("Check pending transaction error:", error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account?.address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!isFormValid.name || !isFormValid.usdtAmount) {
      toast.error("Please fill out all fields correctly");
      return;
    }
    if (!ethers.isAddress(account.address)) {
      toast.error("Invalid wallet address");
      return;
    }
    if (pendingTransaction) {
      toast.error("You have a pending transaction. Please complete it first.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Creating transaction...");
    try {
      const response = await fetch(
        `${VITE_API_BASE_URL}/api/create-transaction`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: account.address,
            name: formData.name,
            address: account.address,
            usdtAmount: Number(formData.usdtAmount),
            nairaAmount: nairaEquivalent,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        if (data.error.includes("pending transaction")) {
          setPendingTransaction({ _id: data.transactionId });
          setTransactionId(data.transactionId);
          setShowBankDetails(true);
          sessionStorage.setItem("pendingTransactionId", data.transactionId);
          toast("You have a pending transaction. Please complete it.", {
            id: toastId,
            icon: "ℹ️",
          });
          return;
        }
        throw new Error(data.error || "Failed to create transaction");
      }

      setTransactionId(data.transactionId);
      setShowBankDetails(true);
      setPendingTransaction({ _id: data.transactionId });
      sessionStorage.setItem("pendingTransactionId", data.transactionId);
      toast.success("Transaction created! Please make payment.", {
        id: toastId,
      });
    } catch (error) {
      console.error("Transaction creation error:", error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle "Paid" button click
  const handlePaidClick = () => {
    setIsPaidConfirmModalOpen(true);
  };

  // Confirm payment in modal
  const confirmPaid = async () => {
    if (!transactionId) {
      toast.error("No transaction found");
      setIsPaidConfirmModalOpen(false);
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Confirming payment...");
    try {
      const response = await fetch(`${VITE_API_BASE_URL}/api/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to mark payment");
      }

      toast.success(
        "Payment confirmed! Awaiting verification (up to 5 minutes).",
        {
          id: toastId,
        }
      );
      setPendingTransaction({ ...pendingTransaction, status: "awaiting" });
      setShowBankDetails(false);
      setTransactionId("");
      setPendingTransaction(null);
      sessionStorage.removeItem("pendingTransactionId");
      setFormData({ name: "", usdtAmount: "" });
      setIsPaidConfirmModalOpen(false);
      // Refresh transaction history
      if (account?.address) {
        const txResponse = await fetch(
          `${VITE_API_BASE_URL}/api/transactions`,
          {
            headers: {
              "Content-Type": "application/json",
              useraddress: account.address,
            },
          }
        );
        if (txResponse.ok) {
          const data = await txResponse.json();
          setTransactions(
            data.map((tx) => ({
              ...tx,
              status:
                tx.status === "awaiting verification" ? "awaiting" : tx.status,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Payment confirmation error:", error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new purchase
  const handleNewPurchase = () => {
    if (pendingTransaction) {
      setIsPendingModalOpen(true);
    } else {
      resetForm();
    }
  };

  // Reset form
  const resetForm = () => {
    setShowBankDetails(false);
    setTransactionId("");
    setPendingTransaction(null);
    sessionStorage.removeItem("pendingTransactionId");
    setFormData({ name: "", usdtAmount: "" });
  };

  // Copy bank account number
  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(VITE_WEMA_BANK_ACCOUNT_NUMBER);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Error copying account number:", err);
      toast.error("Failed to copy account number");
    }
  };

  // Toggle transaction history
  const toggleHistory = () => setShowHistory(!showHistory);

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

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden relative">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.3) 0%, transparent 50%),
                       radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.4) 0%, transparent 50%),
                       radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.3) 0%, transparent 50%)`,
        }}
      />
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gray-200 rounded-full opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "4s" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-teal-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "6s", animationDelay: "2s" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {walletError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-red-900/50 backdrop-blur-sm p-4 rounded-3xl border border-red-500/50 mb-8 max-w-2xl mx-auto"
          >
            <div className="flex items-center space-x-3">
              <Wallet className="w-6 h-6 text-red-400" />
              <p className="text-sm sm:text-base text-red-200">{walletError}</p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-10 lg:mb-16"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-400 bg-clip-text text-transparent mb-2 sm:mb-3 lg:mb-4 animate-pulse">
            Buy USDT with Naira
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Purchase USDT by bank transfer. Your wallet will be credited after
            verification
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-slate-800/40 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-3xl border border-cyan-700/30 mb-8 sm:mb-10 lg:mb-12 w-full max-w-7xl mx-auto"
        >
          {!showBankDetails ? (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm sm:text-base text-slate-400 font-geist-mono mb-2">
                  Full Name (as on bank account)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., John Doe"
                  className={`w-full px-4 py-3 bg-slate-800 border ${
                    isFormValid.name ? "border-cyan-600" : "border-red-500"
                  } rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-sm sm:text-base font-geist-mono`}
                />
                {!isFormValid.name && (
                  <p className="text-red-500 text-xs mt-1 font-geist-mono">
                    Please enter your full name
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm sm:text-base text-slate-400 font-geist-mono mb-2">
                  Wallet Address (for USDT crediting)
                </label>
                <input
                  type="text"
                  value={account?.address || ""}
                  readOnly
                  placeholder="Connect wallet to auto-fill"
                  className="w-full px-4 py-3 bg-gray-800 border border-cyan-600 rounded-xl text-slate-200 placeholder-gray-500 cursor-not-allowed text-sm sm:text-base font-geist-mono"
                />
              </div>
              <div>
                <label className="block text-sm sm:text-base text-slate-400 font-geist-mono mb-2">
                  USDT Amount
                </label>
                <input
                  type="number"
                  value={formData.usdtAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, usdtAmount: e.target.value })
                  }
                  placeholder="e.g., 100"
                  className={`w-full px-4 py-3 bg-gray-800 border ${
                    isFormValid.usdtAmount
                      ? "border-cyan-600"
                      : "border-red-500"
                  } rounded-xl text-slate-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-sm sm:text-base font-geist-mono`}
                />
                {!isFormValid.usdtAmount && (
                  <p className="text-red-500 text-xs mt-1 font-geist-mono">
                    Please enter a valid USDT amount
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm sm:text-base text-slate-400 font-geist-mono">
                  Naira Equivalent: ₦{nairaEquivalent.toLocaleString()}
                </p>
              </div>
              <button
                type="submit"
                disabled={isLoading || !account?.address || pendingTransaction}
                className={`group w-full flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-500 hover:to-teal-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25 text-sm sm:text-base ${
                  isLoading || !account?.address || pendingTransaction
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Submit
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </form>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                Make Payment
              </h3>
              <div className="bg-gray-700/20 p-4 rounded-xl">
                <p className="text-sm sm:text-base text-slate-400 font-geist-mono mb-2">
                  Bank: Wema Bank
                </p>
                <p className="text-sm sm:text-base text-slate-400 font-geist-mono mb-2">
                  Account Name: {VITE_WEMA_BANK_ACCOUNT_NAME}
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-sm sm:text-base text-slate-400 font-geist-mono">
                    Account Number: {VITE_WEMA_BANK_ACCOUNT_NUMBER}
                  </p>
                  <button
                    onClick={handleCopyAccount}
                    className="group p-1 text-cyan-600 hover:text-cyan-400 transition-colors"
                  >
                    {copySuccess ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Copy className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                    )}
                  </button>
                </div>
                <p className="text-sm sm:text-base text-slate-400 font-geist-mono mt-2">
                  Amount to Pay: ₦{nairaEquivalent.toLocaleString()}
                </p>
                <p className="text-sm sm:text-base text-slate-400 font-geist-mono mt-2">
                  Transaction ID: {transactionId}
                </p>
                <p className="text-sm sm:text-base text-slate-400 font-geist-mono mt-2">
                  Please transfer the exact amount from an account with the
                  name: <span className="text-cyan-400">{formData.name}</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={handlePaidClick}
                  disabled={
                    isLoading || pendingTransaction?.status === "awaiting"
                  }
                  className={`group flex-1 flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 text-sm sm:text-base ${
                    isLoading || pendingTransaction?.status === "awaiting"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {pendingTransaction?.status === "awaiting"
                    ? "Awaiting Verification"
                    : "I Have Paid"}
                  <Sparkles
                    className={`ml-2 w-4 h-4 sm:w-5 sm:h-5 ${
                      pendingTransaction?.status === "awaiting"
                        ? ""
                        : "group-hover:animate-spin"
                    }`}
                  />
                </button>
                <button
                  onClick={handleNewPurchase}
                  className="group flex-1 flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-gray-500/25 text-sm sm:text-base"
                >
                  New Purchase
                  <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative mt-8 sm:mt-10 lg:mt-16 max-w-7xl mx-auto"
        >
          <button
            onClick={toggleHistory}
            disabled={!account?.address}
            className={`group flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md hover:bg-slate-700 transition-all duration-300 transform hover:scale-105 shadow-lg  text-sm sm:text-base mb-4 ${
              !account?.address ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {showHistory ? "Hide History" : "Show Transaction History"}
            <History className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          {showHistory && (
            <div className="bg-gray-800/40 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-3xl border border-cyan-700/30">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-4">
                Transaction History
              </h3>
              {transactions.length === 0 ? (
                <p className="text-sm sm:text-base text-slate-400 font-geist-mono">
                  No transactions found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-slate-200 font-geist-mono text-xs sm:text-sm min-w-[300px]">
                    <thead>
                      <tr className="border-b border-cyan-700/30">
                        <th className="py-2 px-2 sm:px-3">Date</th>
                        <th className="py-2 px-2 sm:px-3">Status</th>
                        <th className="py-2 px-2 sm:px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr
                          key={tx._id}
                          className="border-b border-cyan-700/30"
                        >
                          <td className="py-2 px-2 sm:px-3">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2 px-2 sm:px-3">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(
                                tx.status
                              )} text-slate-200 whitespace-nowrap`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 sm:px-3">
                            <button
                              onClick={() => setSelectedTransaction(tx)}
                              className="text-cyan-600 hover:underline text-xs sm:text-sm"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative mt-8 sm:mt-10 lg:mt-16 max-w-7xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur-xl opacity-20" />
          <div className="relative bg-gray-800/30 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <AlertTriangle className="w-6 sm:w-8 h-6 sm:h-8 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-red-300 mb-1 sm:mb-2">
                  Important Notice
                </h3>
                <p className="text-sm sm:text-base md:text-lg text-red-200 leading-relaxed">
                  Ensure the bank account name matches the name provided.
                  Payments from mismatched accounts may delay or prevent USDT
                  crediting. Verification may take up to 5 minutes.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="text-center mt-8 sm:mt-10 lg:mt-16 pt-4 sm:pt-6 lg:pt-8 border-t border-gray-700/30">
          <p className="text-sm sm:text-base md:text-lg text-gray-400">
            Need help? Contact our support team at{" "}
            <a
              href="https://t.me/stakerm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              Telegram
            </a>
          </p>
        </div>
      </div>

      {/* Pending Transaction Modal */}
      <ReactModal
        isOpen={isPendingModalOpen}
        onRequestClose={() => setIsPendingModalOpen(false)}
        className="bg-gray-900 p-4 sm:p-6 rounded-2xl border border-cyan-700/30 max-w-[90vw] sm:max-w-md w-full mx-auto my-4 max-h-[80vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-200 font-geist">
              Pending Transaction
            </h3>
            <button
              onClick={() => setIsPendingModalOpen(false)}
              className="text-slate-400 hover:text-cyan-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm sm:text-base text-slate-200 font-geist-mono mb-4">
            You have a pending transaction. Please complete or await
            verification before starting a new purchase.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => {
                setShowBankDetails(true);
                setIsPendingModalOpen(false);
              }}
              className="group flex-1 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-500 hover:to-teal-500 transition-all duration-300 text-sm"
            >
              View Pending
              <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
            {(pendingTransaction?.status === "verified" ||
              pendingTransaction?.status === "failed") && (
              <button
                onClick={() => {
                  resetForm();
                  setIsPendingModalOpen(false);
                }}
                className="group flex-1 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-300 text-sm"
              >
                Start New
                <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </motion.div>
      </ReactModal>

      {/* Payment Confirmation Modal */}
      <ReactModal
        isOpen={isPaidConfirmModalOpen}
        onRequestClose={() => setIsPaidConfirmModalOpen(false)}
        className="bg-gray-900 p-4 sm:p-6 rounded-2xl border border-cyan-700/30 max-w-[90vw] sm:max-w-md w-full mx-auto my-4 max-h-[80vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-200 font-geist">
              Confirm Payment
            </h3>
            <button
              onClick={() => setIsPaidConfirmModalOpen(false)}
              className="text-slate-400 hover:text-cyan-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm sm:text-base text-slate-200 font-geist-mono mb-4">
            Have you transferred ₦{nairaEquivalent.toLocaleString()} to the Wema
            Bank account from an account with the name "{formData.name}"?
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={confirmPaid}
              disabled={isLoading}
              className={`group flex-1 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 text-sm ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Yes, Confirm
              <Sparkles className="ml-2 w-4 h-4 group-hover:animate-spin" />
            </button>
            <button
              onClick={() => setIsPaidConfirmModalOpen(false)}
              className="group flex-1 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all duration-300 text-sm"
            >
              Cancel
              <X className="ml-2 w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </ReactModal>

      {/* Transaction Details Modal */}
      <ReactModal
        isOpen={!!selectedTransaction}
        onRequestClose={() => setSelectedTransaction(null)}
        className="bg-gray-900 p-4 sm:p-6 rounded-2xl border border-cyan-700/30 max-w-[90vw] sm:max-w-md w-full mx-auto my-4 max-h-[80vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-200 font-geist">
              Transaction Details
            </h3>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="text-slate-400 hover:text-cyan-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {selectedTransaction && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-400 font-geist-mono">Date</p>
                <p className="text-base text-slate-200 font-geist">
                  {new Date(selectedTransaction.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 font-geist-mono">
                  Transaction ID
                </p>
                <p className="text-base text-slate-200 font-geist break-all">
                  {selectedTransaction._id}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 font-geist-mono">
                  Wallet Address
                </p>
                <p className="text-base text-slate-200 font-geist break-all">
                  {selectedTransaction.address}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 font-geist-mono">Name</p>
                <p className="text-base text-slate-200 font-geist">
                  {selectedTransaction.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 font-geist-mono">
                  USDT Amount
                </p>
                <p className="text-base text-slate-200 font-geist">
                  {selectedTransaction.usdtAmount}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 font-geist-mono">
                  Naira Amount
                </p>
                <p className="text-base text-slate-200 font-geist">
                  ₦{selectedTransaction.nairaAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 font-geist-mono">Status</p>
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(
                    selectedTransaction.status
                  )} text-slate-200`}
                >
                  {selectedTransaction.status}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </ReactModal>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}