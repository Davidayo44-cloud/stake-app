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

  // Your Transak API configuration
  const TRANSAK_CONFIG = {
    apiKey: "56f0d5e4-5b20-4f2b-adf2-c0969129a0ce", // Your staging API key
    environment: "STAGING", // Change to 'PRODUCTION' when ready
    fiatCurrency: "NGN", // Nigerian Naira
    cryptoCurrencyList: "ETH,BTC,USDT,USDC,BNB", // Supported cryptocurrencies
    networks: "ethereum,bsc,polygon",
    defaultCryptoCurrency: "ETH",
    defaultNetwork: "ethereum",
    walletAddress: walletAddress,
    redirectURL: window.location.origin,
    hideMenu: true,
    themeColor: "#fcba03",
  };

  // Set wallet address from Thirdweb account
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

  // Initialize Transak widget
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

    // Build Transak URL with parameters
    const params = new URLSearchParams({
      apiKey: TRANSAK_CONFIG.apiKey,
      environment: TRANSAK_CONFIG.environment,
      fiatCurrency: TRANSAK_CONFIG.fiatCurrency,
      cryptoCurrencyList: TRANSAK_CONFIG.cryptoCurrencyList,
      networks: TRANSAK_CONFIG.networks,
      defaultCryptoCurrency: TRANSAK_CONFIG.defaultCryptoCurrency,
      defaultNetwork: TRANSAK_CONFIG.defaultNetwork,
      walletAddress: walletAddress,
      redirectURL: TRANSAK_CONFIG.redirectURL,
      hideMenu: TRANSAK_CONFIG.hideMenu,
      themeColor: TRANSAK_CONFIG.themeColor,
    });

    const transakURL = `https://global-stg.transak.com/?${params.toString()}`;

    // Open Transak in new window
    const transakWindow = window.open(
      transakURL,
      "transak",
      "width=500,height=700,scrollbars=yes,resizable=yes"
    );

    setShowTransak(true);

    // Listen for window close
    const checkClosed = setInterval(() => {
      if (transakWindow.closed) {
        clearInterval(checkClosed);
        setShowTransak(false);
        setIsButtonLoading(false);
        setTransactionStatus("Transaction window closed");
        toast.info("Transaction window closed", { position: "top-right" });
      }
    }, 1000);
  };

  // Handle Transak events
  useEffect(() => {
    const handleTransakEvents = (event) => {
      if (event.origin !== "https://global-stg.transak.com") return;

      const { event_id, data } = event.data;

      switch (event_id) {
        case "TRANSAK_ORDER_SUCCESSFUL":
          setTransactionStatus(`Order successful! Order ID: ${data.status.id}`);
          toast.success(`Order successful! Order ID: ${data.status.id}`, {
            position: "top-right",
          });
          setShowTransak(false);
          setIsButtonLoading(false);
          break;
        case "TRANSAK_ORDER_FAILED":
          setTransactionStatus("Transaction failed. Please try again.");
          toast.error("Transaction failed. Please try again.", {
            position: "top-right",
          });
          setShowTransak(false);
          setIsButtonLoading(false);
          break;
        case "TRANSAK_ORDER_CANCELLED":
          setTransactionStatus("Transaction cancelled by user");
          toast.info("Transaction cancelled by user", {
            position: "top-right",
          });
          setShowTransak(false);
          setIsButtonLoading(false);
          break;
        case "TRANSAK_WIDGET_CLOSE":
          setShowTransak(false);
          setIsButtonLoading(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handleTransakEvents);
    return () => window.removeEventListener("message", handleTransakEvents);
  }, []);

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
          className="group flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-md transition-all duration-300 text-xs sm:text-sm w-full relative"
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
          className={`bg-slate-800/40 backdrop-blur-sm p-3 sm:p-4 rounded-2xl border border-cyan-700/30 mb-8 max-w-full min-w-0 flex items-center ${
            transactionStatus.includes("successful")
              ? "border-green-700/30"
              : transactionStatus.includes("failed") ||
                transactionStatus.includes("error")
              ? "border-red-700/30"
              : "border-blue-700/30"
          }`}
        >
          {transactionStatus.includes("successful") ? (
            <CheckCircle
              className="text-green-500 mr-2 flex-shrink-0"
              size={16}
            />
          ) : transactionStatus.includes("failed") ||
            transactionStatus.includes("error") ? (
            <AlertCircle
              className="text-red-500 mr-2 flex-shrink-0"
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
              transactionStatus.includes("successful")
                ? "text-green-400"
                : transactionStatus.includes("failed") ||
                  transactionStatus.includes("error")
                ? "text-red-400"
                : "text-blue-400"
            }`}
          >
            {transactionStatus}
          </span>
        </motion.div>
      )}

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-center text-slate-400 font-geist-mono text-xs sm:text-sm"
      >
        <p className="mb-2">
          Powered by <strong>Transak</strong> - Secure crypto purchases
        </p>
        <a
          href="https://transak.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
          data-tooltip-id="transak-tooltip"
          data-tooltip-content="Visit Transak's website"
        >
          Learn more about Transak
          <ExternalLink className="ml-1 w-4 h-4" />
        </a>
      </motion.div>

      {/* Transaction Modal */}
      <ReactModal
        isOpen={showTransak}
        onRequestClose={() => setShowTransak(false)}
        className="bg-slate-900 p-3 sm:p-4 md:p-6 rounded-2xl border border-cyan-700/30 max-w-[90vw] sm:max-w-md md:max-w-lg w-full mx-auto my-4 max-h-[80vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-200 font-geist">
              Transak Purchase
            </h3>
            <button
              onClick={() => setShowTransak(false)}
              className="text-slate-400 hover:text-blue-600"
            >
              <X className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6" />
            </button>
          </div>
          <p className="text-slate-200 font-geist-mono text-xs sm:text-sm">
            The Transak purchase window has been opened. Complete the
            transaction there and return here to see the status.
          </p>
          <button
            onClick={() => setShowTransak(false)}
            className="mt-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white border border-blue-600 rounded-md hover:bg-blue-700 transition-all duration-300 text-xs sm:text-sm w-full"
          >
            Close
          </button>
        </motion.div>
      </ReactModal>

      <Tooltip
        id="card-tooltip"
        place="top"
        className="bg-slate-800 text-blue-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
        style={{ fontFamily: "Geist Mono" }}
      />
      <Tooltip
        id="buy-tooltip"
        place="top"
        className="bg-slate-800 text-blue-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
        style={{ fontFamily: "Geist Mono" }}
      />
      <Tooltip
        id="transak-tooltip"
        place="top"
        className="bg-slate-800 text-blue-600 text-xs sm:text-sm max-w-[200px] break-words z-50"
        style={{ fontFamily: "Geist Mono" }}
      />
    </div>
  );
};

export default BuyCrypto;
