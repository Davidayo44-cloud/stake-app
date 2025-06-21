import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import ReactModal from "react-modal";
import { Tooltip } from "react-tooltip";
import toast from "react-hot-toast";
import { useActiveAccount } from "thirdweb/react";

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

// Modal animation variants
const modalVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// Error boundary component
function ErrorFallback({ error }) {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-200">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p>{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white border border-blue-600 rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

const BuyCrypto = () => {
  const account = useActiveAccount();
  const [walletAddress, setWalletAddress] = useState("");
  const [showTransak, setShowTransak] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState("");
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transakUrl, setTransakUrl] = useState("");

  // Transak API configuration
  const TRANSAK_CONFIG = {
    apiKey: "d3cb6f51-df24-4083-9781-a5ae0b058a68", // Staging API key
    environment: "STAGING", // Change to 'PRODUCTION' when ready
    fiatCurrency: "NGN", // Nigerian Naira
    defaultFiatCurrency: "NGN", // Enforce NGN as default
    cryptoCurrencyList: "ETH,BTC,USDT,USDC,BNB",
    networks: "ethereum,bsc,polygon",
    defaultCryptoCurrency: "ETH",
    defaultNetwork: "ethereum",
    walletAddress: walletAddress,
    redirectURL: `${window.location.origin}/transaction-status`,
    hideMenu: true,
    themeColor: "#fcba03",
  };

  // Set wallet address and initialize modal
  useEffect(() => {
    try {
      ReactModal.setAppElement("#root");
      if (account?.address) {
        setWalletAddress(account.address);
      } else {
        setTransactionStatus(
          "No wallet connected. Please connect via dashboard."
        );
        toast.error("No wallet connected. Please connect via dashboard.", {
          position: "top-right",
        });
        setError(new Error("Wallet not connected"));
      }
    } catch (err) {
      console.error("BuyCrypto.jsx: useEffect error:", err);
      setError(err);
      toast.error("Initialization failed: " + err.message, {
        position: "top-right",
      });
    }
  }, [account]);

  // Build Transak URL when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      const params = new URLSearchParams({
        apiKey: TRANSAK_CONFIG.apiKey,
        environment: TRANSAK_CONFIG.environment,
        fiatCurrency: TRANSAK_CONFIG.fiatCurrency,
        defaultFiatCurrency: TRANSAK_CONFIG.defaultFiatCurrency,
        cryptoCurrencyList: TRANSAK_CONFIG.cryptoCurrencyList,
        networks: TRANSAK_CONFIG.networks,
        defaultCryptoCurrency: TRANSAK_CONFIG.defaultCryptoCurrency,
        defaultNetwork: TRANSAK_CONFIG.defaultNetwork,
        walletAddress: walletAddress,
        redirectURL: TRANSAK_CONFIG.redirectURL,
        hideMenu: TRANSAK_CONFIG.hideMenu,
        themeColor: TRANSAK_CONFIG.themeColor,
      });
      setTransakUrl(`https://global-stg.transak.com/?${params.toString()}`);
    }
  }, [walletAddress]);

  // Initialize Transak widget in modal
  const initTransak = () => {
    if (!walletAddress) {
      setTransactionStatus(
        "No wallet connected. Please connect via dashboard."
      );
      toast.error("No wallet connected. Please connect via dashboard.", {
        position: "top-right",
      });
      return;
    }
    setIsButtonLoading(true);
    setShowTransak(true);
  };

  // Update localStorage order status
  const updateOrderStatus = (orderId, status, data = {}) => {
    try {
      const storedPurchases = JSON.parse(
        localStorage.getItem("purchaseHistory") || "[]"
      );
      const updatedPurchases = storedPurchases.map((order) => {
        if (order.orderId === orderId) {
          return {
            ...order,
            status,
            fiatCurrency: data.fiatCurrency || order.fiatCurrency,
            cryptoCurrency: data.cryptoCurrency || order.cryptoCurrency,
            fiatAmount: data.fiatAmount || order.fiatAmount,
            cryptoAmount: data.cryptoAmount || order.cryptoAmount,
            walletAddress: data.walletAddress || order.walletAddress,
            totalFeeInFiat: data.totalFeeInFiat || order.totalFeeInFiat,
            network: data.network || order.network,
            timestamp: data.createdAt || new Date().toISOString(),
          };
        }
        return order;
      });
      localStorage.setItem("purchaseHistory", JSON.stringify(updatedPurchases));
      window.dispatchEvent(new Event("storageUpdated"));
      console.log(`Updated order ${orderId} to status: ${status}`);
    } catch (err) {
      console.error("Failed to update order status:", err);
    }
  };

  // Poll Transak API for PROCESSING orders
  useEffect(() => {
    const pollOrderStatus = async (orderId) => {
      try {
        const response = await fetch(
          `https://api-stg.transak.com/v2/public/orders/${orderId}`,
          {
            headers: {
              "x-api-key": TRANSAK_CONFIG.apiKey,
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const order = await response.json();
        console.log(`Polled order ${orderId}:`, order);
        if (
          order.status === "COMPLETED" ||
          order.status === "FAILED" ||
          order.status === "CANCELLED"
        ) {
          updateOrderStatus(orderId, order.status, order);
          setTransactionStatus(
            `Order ${order.status.toLowerCase()}! Order ID: ${orderId}`
          );
          toast.success(
            `Order ${order.status.toLowerCase()}! Order ID: ${orderId}`,
            {
              position: "top-right",
            }
          );
          return true; // Stop polling
        }
        return false;
      } catch (err) {
        console.error(`Failed to poll order ${orderId}:`, err);
        return false;
      }
    };

    const storedPurchases = JSON.parse(
      localStorage.getItem("purchaseHistory") || "[]"
    );
    const processingOrders = storedPurchases.filter(
      (order) => order.status === "PROCESSING"
    );
    const intervals = processingOrders.map((order) => {
      const intervalId = setInterval(async () => {
        const shouldStop = await pollOrderStatus(order.orderId);
        if (shouldStop) {
          clearInterval(intervalId);
        }
      }, 60000); // Poll every minute
      return intervalId;
    });

    return () => intervals.forEach(clearInterval);
  }, []);

  // Handle Transak events
  useEffect(() => {
    const handleTransakEvents = (event) => {
      if (event.origin !== "https://global-stg.transak.com") return;

      const { event_id, data } = event.data;
      console.log("Transak event received:", {
        event_id,
        data: JSON.stringify(data, null, 2),
      });

      switch (event_id) {
        case "TRANSAK_ORDER_SUCCESSFUL":
          if (!data.id || !data.fiatAmount || !data.cryptoAmount) {
            console.error("Incomplete Transak order data:", data);
            setTransactionStatus(
              "Order processing but data is incomplete. Contact support."
            );
            toast.error(
              "Order processing but data is incomplete. Contact support.",
              {
                position: "top-right",
              }
            );
            setShowTransak(false);
            setIsButtonLoading(false);
            return;
          }
          setTransactionStatus(
            `Order ${data.status.toLowerCase()}! Order ID: ${data.id}`
          );
          toast.success(
            `Order ${data.status.toLowerCase()}! Order ID: ${data.id}`,
            {
              position: "top-right",
            }
          );
          // Save to localStorage
          const orderDetails = {
            orderId: data.id,
            fiatCurrency: data.fiatCurrency || "NGN",
            cryptoCurrency: data.cryptoCurrency || "UNKNOWN",
            fiatAmount: data.fiatAmount,
            cryptoAmount: data.cryptoAmount,
            status: data.status,
            walletAddress: data.walletAddress || walletAddress,
            totalFeeInFiat: data.totalFeeInFiat || "0",
            network: data.network || "ethereum",
            timestamp: data.createdAt || new Date().toISOString(),
          };
          console.log("Saving order details:", orderDetails);
          const storedPurchases = JSON.parse(
            localStorage.getItem("purchaseHistory") || "[]"
          );
          localStorage.setItem(
            "purchaseHistory",
            JSON.stringify([orderDetails, ...storedPurchases])
          );
          window.dispatchEvent(new Event("storageUpdated"));
          setShowTransak(false);
          setIsButtonLoading(false);
          break;
        case "TRANSAK_ORDER_COMPLETED":
          if (!data.id) {
            console.error("Incomplete Transak completion data:", data);
            return;
          }
          console.log(
            `Processing TRANSAK_ORDER_COMPLETED for order ${data.id}`
          );
          setTransactionStatus(`Order completed! Order ID: ${data.id}`);
          toast.success(`Order completed! Order ID: ${data.id}`, {
            position: "top-right",
          });
          updateOrderStatus(data.id, "COMPLETED", data);
          setShowTransak(false);
          setIsButtonLoading(false);
          break;
        case "TRANSAK_ORDER_FAILED":
          if (data.id) {
            setTransactionStatus(
              `Transaction failed for Order ID: ${data.id}. Please try again.`
            );
            toast.error(
              `Transaction failed for Order ID: ${data.id}. Please try again.`,
              {
                position: "top-right",
              }
            );
            updateOrderStatus(data.id, "FAILED", data);
          } else {
            setTransactionStatus("Transaction failed. Please try again.");
            toast.error("Transaction failed. Please try again.", {
              position: "top-right",
            });
          }
          setShowTransak(false);
          setIsButtonLoading(false);
          break;
        case "TRANSAK_ORDER_CANCELLED":
          setTransactionStatus("Transaction cancelled by user");
          toast.info("Transaction cancelled by user", {
            position: "top-right",
          });
          if (data.id) {
            updateOrderStatus(data.id, "CANCELLED", data);
          }
          setShowTransak(false);
          setIsButtonLoading(false);
          break;
        case "TRANSAK_WIDGET_CLOSE":
          setShowTransak(false);
          setIsButtonLoading(false);
          break;
        default:
          console.log(`Unhandled Transak event: ${event_id}`);
          break;
      }
    };

    window.addEventListener("message", handleTransakEvents);
    return () => window.removeEventListener("message", handleTransakEvents);
  }, [walletAddress]);

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (error) {
    return <ErrorFallback error={error} />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full bg-slate-900 max-w-full min-w-0">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-2xl sm:text-3xl font-bold text-slate-200 mb-8 font-geist"
      >
        Buy Crypto
      </motion.h2>

      {/* Wallet Status Card */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 sm:gap-4 mb-8 max-w-full">
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate={cardVariants.animate(0)}
          whileHover="hover"
          className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-cyan-700/30 flex flex-col space-y-3 w-full max-w-full min-w-0"
          data-tooltip-id="card-tooltip"
          data-tooltip-content="Your connected wallet address"
        >
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-400 font-geist-mono truncate">
                Wallet Status
              </p>
              <p className="text-lg sm:text-xl font-bold text-white font-geist truncate">
                Connected: {formatAddress(walletAddress)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Purchase Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-cyan-700/30 mb-8 max-w-full min-w-0"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-200 mb-3 font-geist">
          Purchase Cryptocurrency
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 max-w-full">
          <div className="bg-slate-700/20 p-3 sm:p-4 rounded-lg">
            <h4 className="text-sm sm:text-base font-semibold text-slate-200 mb-2 font-geist">
              Supported Features
            </h4>
            <ul className="space-y-1 text-slate-400 text-xs sm:text-sm font-geist-mono">
              <li>• Pay with Nigerian Naira (NGN)</li>
              <li>• Buy ETH, BTC, USDT, USDC, BNB</li>
              <li>• Multiple networks supported</li>
              <li>• Secure KYC verification</li>
              <li>• Bank transfer & card payments</li>
            </ul>
          </div>
          <div className="bg-slate-700/20 p-3 sm:p-4 rounded-lg">
            <h4 className="text-sm sm:text-base font-semibold text-slate-200 mb-2 font-geist">
              How It Works
            </h4>
            <ol className="space-y-1 text-slate-400 text-xs sm:text-sm font-geist-mono">
              <li>1. Ensure wallet is connected</li>
              <li>2. Click "Buy Crypto"</li>
              <li>3. Complete KYC verification</li>
              <li>4. Make payment in Naira</li>
              <li>5. Receive crypto in your wallet</li>
            </ol>
          </div>
        </div>
        <button
          onClick={initTransak}
          disabled={isButtonLoading || !walletAddress}
          className="group flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-700/20 disabled:text-gray-400 transition-all duration-200 text-xs sm:text-sm w-full relative"
          data-tooltip-id="buy-tooltip"
          data-tooltip-content="Buy crypto using Transak"
        >
          {isButtonLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <CreditCard className="mr-1.5 w-4 h-4" />
          )}
          {isButtonLoading ? "Processing..." : "Buy Crypto with Naira"}
        </button>
      </motion.div>

      {/* Status Messages */}
      {transactionStatus && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border mb-8 max-w-full min-w-0 flex items-center ${
            transactionStatus.includes("successful") ||
            transactionStatus.includes("processing") ||
            transactionStatus.includes("completed")
              ? "border-green-700/30"
              : transactionStatus.includes("failed") ||
                transactionStatus.includes("error")
              ? "border-red-600"
              : "border-blue-600"
          }`}
        >
          {transactionStatus.includes("successful") ||
          transactionStatus.includes("processing") ||
          transactionStatus.includes("completed") ? (
            <CheckCircle
              className="text-green-500 mr-2 flex-shrink-0"
              size={16}
            />
          ) : transactionStatus.includes("failed") ||
            transactionStatus.includes("error") ? (
            <AlertCircle
              className="text-red-600 mr-2 flex-shrink-0"
              size={16}
            />
          ) : (
            <AlertCircle
              className="text-blue-500 mr-2 flex-shrink-0"
              size={16}
            />
          )}
          <span
            className={`text-xs sm:text-sm font-geist-mono ${
              transactionStatus.includes("successful") ||
              transactionStatus.includes("processing") ||
              transactionStatus.includes("completed")
                ? "text-green-600"
                : transactionStatus.includes("failed") ||
                  transactionStatus.includes("error")
                ? "text-red-600"
                : "text-blue-600"
            }`}
          >
            {transactionStatus}
          </span>
        </motion.div>
      )}

      {/* Transak Modal with Iframe */}
      <ReactModal
        isOpen={showTransak}
        onRequestClose={() => {
          setShowTransak(false);
          setIsButtonLoading(false);
        }}
        className="max-w-[90vw] sm:max-w-[600px] w-full mx-auto my-4 p-4 sm:p-6 md:p-8 bg-white rounded-2xl border-none max-h-[80vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={true}
      >
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              Transak Purchase
            </h3>
            <button
              onClick={() => {
                setShowTransak(false);
                setIsButtonLoading(false);
              }}
              className="text-gray-600 hover:text-blue-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <iframe
            src={transakUrl}
            className="w-full h-[500px] border-none"
            title="Transak Purchase Widget"
          />
        </motion.div>
      </ReactModal>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center text-slate-400 font-geist-mono"
      >
        <p className="mb-2">
          Powered by <strong>Transak</strong> - Secure crypto purchases
        </p>
        <a
          href="https://transak.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
          data-tooltip-id="transak-tooltip"
          data-tooltip-content="Visit Transak's website"
        >
          Learn more about Transak
          <ExternalLink className="ml-1 w-4 h-4" />
        </a>
      </motion.div>

      <Tooltip
        id="card-tooltip"
        place="top"
        className="bg-gray-800 text-blue-400 text-sm max-w-xs break-all"
        style={{ fontFamily: "Geist" }}
      />
      <Tooltip
        id="buy-tooltip"
        place="top"
        className="bg-gray-800 text-blue-400 text-sm max-w-xs break-all"
        style={{ fontFamily: "Geist" }}
      />
      <Tooltip
        id="transak-tooltip"
        place="top"
        className="bg-gray-800 text-blue-400 text-sm max-w-xs break-all"
        style={{ fontFamily: "Geist" }}
      />
    </div>
  );
};

export default BuyCrypto;
