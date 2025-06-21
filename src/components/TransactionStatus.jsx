import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";

// Animation variants
const containerVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const TransactionStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const [orderDetails, setOrderDetails] = useState({});
  const [isIncomplete, setIsIncomplete] = useState(false);

  useEffect(() => {
    const details = {
      orderId: queryParams.get("orderId") || "N/A",
      fiatCurrency: queryParams.get("fiatCurrency") || "NGN",
      cryptoCurrency: queryParams.get("cryptoCurrency") || "UNKNOWN",
      fiatAmount: queryParams.get("fiatAmount") || "0",
      cryptoAmount: queryParams.get("cryptoAmount") || "0",
      status: queryParams.get("status") || "UNKNOWN",
      walletAddress: queryParams.get("walletAddress") || "",
      totalFeeInFiat: queryParams.get("totalFeeInFiat") || "0",
      network: queryParams.get("network") || "unknown",
    };
    console.log("TransactionStatus details:", details);
    setOrderDetails(details);

    // Check if data is incomplete
    if (
      details.orderId.startsWith("UNKNOWN_") ||
      details.fiatAmount === "0" ||
      details.cryptoAmount === "0" ||
      details.cryptoCurrency === "UNKNOWN"
    ) {
      setIsIncomplete(true);
      toast.error("Incomplete transaction data. Please contact support.", {
        position: "top-right",
      });
    } else if (details.status === "PROCESSING") {
      toast.loading("Your order is being processed...", {
        position: "top-right",
      });
    } else if (details.status === "COMPLETED") {
      toast.success("Order completed successfully!", { position: "top-right" });
    } else if (details.status === "FAILED") {
      toast.error("Order failed. Please try again.", { position: "top-right" });
    }
  }, [location.search]);

  const formatAddress = (address) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full bg-slate-900 min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="bg-slate-800/40 backdrop-blur-sm p-4 rounded-2xl border border-cyan-700/30 max-w-2xl mx-auto"
      >
        <h2 className="text-2xl font-bold text-slate-200 mb-4 font-geist">
          Transaction Status
        </h2>
        {isIncomplete && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-600 rounded-md flex items-center">
            <AlertCircle className="text-red-500 mr-2" size={16} />
            <p className="text-sm text-red-400 font-geist-mono">
              Incomplete transaction data detected. Contact support for
              assistance.
            </p>
          </div>
        )}
        <div className="flex items-center mb-4">
          {orderDetails.status === "COMPLETED" ? (
            <CheckCircle className="text-green-500 mr-2" size={24} />
          ) : orderDetails.status === "PROCESSING" ? (
            <AlertCircle className="text-blue-500 mr-2" size={24} />
          ) : (
            <AlertCircle className="text-red-500 mr-2" size={24} />
          )}
          <p className="text-lg text-slate-200 font-geist">
            Order Status:{" "}
            <span className="text-blue-600">{orderDetails.status}</span>
          </p>
        </div>
        <div className="text-slate-400 text-sm font-geist-mono space-y-2">
          <p>
            <strong>Order ID:</strong> {orderDetails.orderId}
          </p>
          <p>
            <strong>Fiat Amount:</strong> {orderDetails.fiatAmount}{" "}
            {orderDetails.fiatCurrency}
          </p>
          <p>
            <strong>Crypto Amount:</strong> {orderDetails.cryptoAmount}{" "}
            {orderDetails.cryptoCurrency}
          </p>
          <p>
            <strong>Fee:</strong> {orderDetails.totalFeeInFiat}{" "}
            {orderDetails.fiatCurrency}
          </p>
          <p>
            <strong>Wallet Address:</strong>{" "}
            {formatAddress(orderDetails.walletAddress)}
          </p>
          <p>
            <strong>Network:</strong> {orderDetails.network}
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard/purchase")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200"
        >
          View Transaction History
        </button>
      </motion.div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid #22d3ee",
            fontFamily: "Geist, sans-serif",
            fontSize: "14px",
            borderRadius: "8px",
          },
          success: { style: { borderColor: "#14b8a6" } },
          error: { style: { borderColor: "#f43f5e" } },
        }}
      />
    </div>
  );
};

export default TransactionStatus;
