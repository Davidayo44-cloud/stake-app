import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { Toaster } from "react-hot-toast";

// Animation variants for table rows
const rowVariants = {
  initial: { opacity: 0, y: 10 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: index * 0.05 },
  }),
  hover: { backgroundColor: "rgba(21, 94, 117, 0.2)" },
};

const PurchaseHistory = () => {
  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch purchase history from localStorage
  useEffect(() => {
    const fetchPurchases = () => {
      try {
        const storedPurchases = JSON.parse(
          localStorage.getItem("purchaseHistory") || "[]"
        );
        // Log raw data for debugging
        console.log("Raw localStorage purchaseHistory:", storedPurchases);
        // Allow partial records with fallback values
        const validPurchases = storedPurchases.map((purchase) => ({
          orderId: purchase.orderId || "N/A",
          fiatCurrency: purchase.fiatCurrency || "NGN",
          cryptoCurrency: purchase.cryptoCurrency || "UNKNOWN",
          fiatAmount: purchase.fiatAmount || "0",
          cryptoAmount: purchase.cryptoAmount || "0",
          status: purchase.status || "UNKNOWN",
          walletAddress: purchase.walletAddress || "N/A",
          totalFeeInFiat: purchase.totalFeeInFiat || "0",
          network: purchase.network || "unknown",
          timestamp: purchase.timestamp || new Date().toISOString(),
        }));
        console.log("Processed valid purchases:", validPurchases);
        setPurchases(validPurchases);
      } catch (err) {
        console.error("Failed to load purchases:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchases();

    const handleStorageUpdate = () => {
      fetchPurchases();
    };

    window.addEventListener("storageUpdated", handleStorageUpdate);
    return () =>
      window.removeEventListener("storageUpdated", handleStorageUpdate);
  }, []);

  // Navigate to TransactionStatus with query params
  const handleRowClick = (purchase) => {
    const params = new URLSearchParams({
      orderId: purchase.orderId,
      fiatCurrency: purchase.fiatCurrency,
      cryptoCurrency: purchase.cryptoCurrency,
      fiatAmount: purchase.fiatAmount,
      cryptoAmount: purchase.cryptoAmount,
      status: purchase.status,
      walletAddress: purchase.walletAddress,
      totalFeeInFiat: purchase.totalFeeInFiat,
      network: purchase.network,
    });
    navigate(`/transaction-status?${params.toString()}`);
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full bg-slate-900 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-slate-800/40 backdrop-blur-sm p-4 rounded-2xl border border-cyan-700/30 max-w-4xl mx-auto"
      >
        <h2 className="text-2xl font-bold text-slate-200 mb-4 font-geist">
          Purchase History
        </h2>
        {isLoading ? (
          <p className="text-slate-400 text-sm font-geist-mono">Loading...</p>
        ) : purchases.length === 0 ? (
          <p className="text-slate-400 text-sm font-geist-mono">
            No purchase history found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-geist-mono">
              <thead>
                <tr className="text-slate-200 border-b border-cyan-700/30">
                  <th className="py-2 px-3">Order ID</th>
                  <th className="py-2 px-3">Fiat Amount</th>
                  <th className="py-2 px-3">Crypto Amount</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase, index) => (
                  <motion.tr
                    key={purchase.orderId + index} // Use index to avoid duplicate key issues
                    variants={rowVariants}
                    initial="initial"
                    animate={rowVariants.animate(index)}
                    whileHover="hover"
                    className="cursor-pointer text-slate-400 border-b border-cyan-700/20 hover:text-slate-200"
                    onClick={() => handleRowClick(purchase)}
                  >
                    <td className="py-2 px-3 truncate max-w-[120px]">
                      {purchase.orderId !== "N/A"
                        ? purchase.orderId.slice(0, 8) + "..."
                        : "N/A"}
                    </td>
                    <td className="py-2 px-3">
                      {purchase.fiatAmount} {purchase.fiatCurrency}
                    </td>
                    <td className="py-2 px-3">
                      {purchase.cryptoAmount} {purchase.cryptoCurrency}
                    </td>
                    <td className="py-2 px-3 flex items-center">
                      {purchase.status === "COMPLETED" ? (
                        <CheckCircle
                          className="text-green-500 mr-1"
                          size={16}
                        />
                      ) : purchase.status === "PROCESSING" ? (
                        <AlertCircle className="text-blue-500 mr-1" size={16} />
                      ) : (
                        <AlertCircle className="text-red-500 mr-1" size={16} />
                      )}
                      {purchase.status}
                    </td>
                    <td className="py-2 px-3">
                      {formatDate(purchase.timestamp)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          onClick={() => navigate("/dashboard/buy")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200"
        >
          Back to Buy Crypto
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

export default PurchaseHistory;
