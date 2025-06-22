import { useState, useEffect } from "react";
import {
  MessageSquare,
  ArrowRight,
  Wallet,
  Send,
  CheckCircle,
  AlertTriangle,
  Copy,
  Sparkles,
} from "lucide-react";

// Environment variable for Telegram link
const VITE_TELEGRAM_LINK = "https://t.me/stakerm";

// Image imports (replace with actual paths or URLs)
const dashboardImg = "/images/g1.png";
const walletSendImg = "/images/gtwo.png";
const sendFundsImg = "/images/g3.png"; // 
const selectTokenImg = "/images/gex.png"; // 
const tetherUSDTImg = "/images/g4.png"; // 
const defaultSendImg = "/images/g5.png"; // 

export default function SendUSDTInstructions() {
  const [copySuccess, setCopySuccess] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Track mouse movement for interactive effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Handle contact admin
  const handleContactAdmin = () => {
    try {
      window.open(VITE_TELEGRAM_LINK, "_blank");
    } catch (err) {
      console.error("Error opening Telegram link:", err);
    }
  };

  // Copy USDT contract address to clipboard
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(
        "0x55d398326f99059ff775485246999027b3197955"
      );
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Error copying address:", err);
    }
  };

  // Steps with responsive styling
  const steps = [
    {
      title: "Access Dashboard and Wallet",
      description:
        "From the 'StakePro' dashboard, click the wallet icon (e.g., showing your address) to open your wallet. Ensure it’s connected to Binance Smart Chain.",
      image: dashboardImg,
      icon: <Wallet className="w-8 h-8 text-cyan-400" />,
      gradient: "from-cyan-500 to-teal-500",
      glowColor: "cyan",
    },
    {
      title: "Click 'Send' in Your Wallet",
      description: "Click 'Send' in your wallet. The default is BNB.",
      image: walletSendImg,
      icon: <Send className="w-8 h-8 text-teal-400" />,
      gradient: "from-teal-500 to-blue-500",
      glowColor: "teal",
    },
    {
      title: "Click on the Default BNB in Send Funds Modal",
      description: "In the Send Funds modal, click on the default BNB.",
      image: sendFundsImg,
      icon: <Send className="w-8 h-8 text-emerald-400" />,
      gradient: "from-emerald-500 to-green-500",
      glowColor: "emerald",
    },
    {
      title: "Copy and Paste the USDT Address in Select a Token Modal",
      description:
        "In the Select a Token modal, copy and paste the USDT address.",
      image: selectTokenImg,
      icon: <Copy className="w-8 h-8 text-blue-400" />,
      gradient: "from-blue-500 to-indigo-500",
      glowColor: "blue",
      action: (
        <button
          onClick={handleCopyAddress}
          className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
        >
          <div className="flex items-center justify-center">
            <Copy className="w-5 h-5 mr-2" />
            {copySuccess ? "Copied!" : "Copy USDT Address"}
            <Sparkles className="w-4 h-4 ml-2 group-hover:animate-spin" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
        </button>
      ),
    },
    {
      title: "Select the Tether USDT",
      description: "Select the Tether USDT option that appears.",
      image: tetherUSDTImg,
      icon: <CheckCircle className="w-8 h-8 text-green-400" />,
      gradient: "from-green-500 to-emerald-500",
      glowColor: "green",
    },
    {
      title: "Enter Recipient Address and Amount, Then Click Send",
      description:
        "In the Send Funds modal, enter the recipient address and amount, then click Send.",
      image: defaultSendImg,
      icon: <Send className="w-8 h-8 text-gray-400" />,
      gradient: "from-gray-500 to-slate-500",
      glowColor: "gray",
      action: (
        <button
          onClick={handleContactAdmin}
          className="group relative px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-xl hover:from-gray-500 hover:to-slate-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-gray-500/25"
        >
          <div className="flex items-center justify-center">
            Need Help? Contact Support
            <MessageSquare className="ml-2 w-5 h-5 group-hover:animate-pulse" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-slate-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 overflow-hidden relative">
      {/* Dynamic background with mouse interaction */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(34, 211, 238, 0.3) 0%, transparent 50%), 
                       radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.4) 0%, transparent 50%), 
                       radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.3) 0%, transparent 50%),
                       radial-gradient(circle at 40% 40%, rgba(107, 114, 128, 0.2) 0%, transparent 70%)`,
        }}
      />

      {/* Animated particles */}
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

      {/* Floating orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "4s" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-teal-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "6s", animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full blur-2xl animate-pulse"
        style={{ animationDuration: "5s", animationDelay: "1s" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-400 bg-clip-text text-transparent mb-2 sm:mb-3 lg:mb-4 animate-pulse">
            Send USDT Guide
          </h1>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2 sm:mb-3">
            Step-by-Step Instructions
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Follow these simple steps to send USDT using your connected wallet.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 sm:space-y-8 lg:space-y-12">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <div
                className={`absolute inset-0 bg-gradient-to-r ${step.gradient} rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300`}
              />

              <div className="relative bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-4 sm:p-6 md:p-8 lg:p-12 hover:border-gray-600/50 transition-all duration-300">
                <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6 lg:space-x-8">
                  {/* Icon and step number */}
                  <div className="flex-shrink-0">
                    <div
                      className={`relative w-16 sm:w-20 lg:w-24 h-16 sm:h-20 lg:h-24 bg-gradient-to-r ${step.gradient} rounded-2xl flex items-center justify-center mb-2 sm:mb-4 shadow-lg`}
                    >
                      {step.icon}
                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${step.gradient} rounded-2xl blur opacity-50 animate-pulse`}
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3
                      className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent mb-2 sm:mb-3`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 mb-3 sm:mb-4 leading-relaxed">
                      {step.description}
                    </p>

                    {step.image && (
                      <div className="relative group/image mb-4 sm:mb-6">
                        <img
                          src={step.image}
                          alt={`Step ${index + 1}`}
                          className="w-full rounded-2xl border border-gray-700/50 shadow-2xl transform group-hover/image:scale-105 transition-transform duration-500"
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-r ${step.gradient} rounded-2xl opacity-0 group-hover/image:opacity-10 transition-opacity duration-300`}
                        />
                      </div>
                    )}

                    {step.action && (
                      <div className="flex justify-start">{step.action}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Warning section */}
        <div className="mt-8 sm:mt-10 lg:mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur-xl opacity-20" />
          <div className="relative bg-gray-800/30 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <AlertTriangle className="w-6 sm:w-8 h-6 sm:h-8 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-300 mb-1 sm:mb-2">
                  Important Warning
                </h3>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-red-200 leading-relaxed">
                  Always double-check the recipient's wallet address before
                  sending. Make sure you have enough BNB in your wallet for gas
                  fees. Once sent, USDT transactions cannot be reversed!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-10 lg:mt-16 pt-4 sm:pt-6 lg:pt-8 border-t border-gray-700/30">
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-400">
            Having trouble? Contact our support team for assistance
          </p>
        </div>
      </div>
    </div>
  );
}

// Custom CSS for glow effect
const style = document.createElement("style");
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.8; }
  }
`;
document.head.appendChild(style);
