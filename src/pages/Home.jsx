import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Globe,
  Star,
  Shield,
  ArrowRightCircle,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Users,
} from "lucide-react";
import CountUp from "react-countup";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import Header from "../components/Header";

// Validate environment variables
const VITE_THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!VITE_THIRDWEB_CLIENT_ID) {
  console.error(
    "Home.jsx: Missing VITE_THIRDWEB_CLIENT_ID environment variable"
  );
  throw new Error("VITE_THIRDWEB_CLIENT_ID is not defined in .env file");
}

// Mock data for stats
const mockData = {
  platformUptime: 99.9, // 99.9% reliability
  userSatisfaction: 4.8, // 4.8/5 star rating
  globalReach: 50, // Available in 50+ countries
};

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: VITE_THIRDWEB_CLIENT_ID,
});

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "farcaster",
        "email",
        "x",
        "passkey",
        "phone",
        "github",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const account = useActiveAccount();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
   
  }, [account, navigate]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-geist">
      <Header />

      {/* Hero Section */}
      <section className="relative py-8 sm:py-8 bg-gradient-to-b from-cyan-700/10 to-transparent overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Ccircle cx=%2220%22 cy=%2220%22 r=%222%22 fill=%22rgba(14,116,144,0.2)%22/%3E%3C/svg%3E')] opacity-30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="opacity-20"
          >
            <img
              src="/images/hero.png"
              alt="Ethereum Earth Logo"
              width={500}
              height={500}
              sizes="(max-width: 768px) 250px, 500px"
              className="object-contain"
            />
          </motion.div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center md:justify-end"
            >
              <img
                src="/images/im.png"
                alt="StakePro Feature Image"
                width={600}
                height={600}
                sizes="(max-width: 768px) 150px, 300px"
                className="object-contain"
              />
            </motion.div>
            {/* Right: Content */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative bg-slate-800/20 backdrop-blur-sm p-8 sm:p-12 rounded-3xl border border-cyan-700/30 shadow-inner hover:shadow-[0_0_20px_rgba(14,116,144,0.3)] transition-all duration-300"
            >
              <motion.p
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-base sm:text-lg font-semibold text-cyan-600 mb-4 font-geist-mono"
              >
                Grow Your Wealth Securely
              </motion.p>
              <style>
                {`
                  @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                  }
                  .headline:hover {
                    text-shadow: 0 0 10px rgba(14, 116, 144, 0.5);
                  }
                `}
              </style>
              <motion.h1
                id="hero-headline"
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{
                  fontSize: "2.25rem",
                  fontWeight: 800,
                  marginBottom: "1.5rem",
                  background: "linear-gradient(to right, #06b6d4, #0891b2)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  fontFamily: "Geist, sans-serif",
                  backgroundSize: "200% auto",
                  backgroundPosition: "0% 50%",
                  animation: "gradientShift 5s ease infinite",
                  transition: "all 0.3s ease",
                }}
                className="headline md:text-5xl"
                aria-label="Stake USDT to earn 13% rewards"
              >
                Stake USDT, Earn 13% Rewards!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg sm:text-xl mb-8 max-w-lg sm:max-w-xl mx-auto font-medium font-geist text-slate-300"
              >
                Lock your USDT for 5 days and grow your wealth with our secure
                staking platform and referral program.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="relative"
              >
                {account ? (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center px-4 py-2 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md font-medium text-sm transition-all duration-300 hover:bg-slate-700"
                      aria-label="Navigate to staking dashboard"
                    >
                      View Dashboard
                      <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ConnectButton
                      client={client}
                      wallets={wallets}
                      connectButton={{
                        label: (
                          <span className="group flex items-center text-cyan-600 text-sm font-medium transition-colors duration-300">
                            Get Started
                            <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                          </span>
                        ),
                        style: {
                          background: "#1e293b", // bg-slate-800
                          color: "#06b6d4", // text-cyan-600
                          border: "1px solid #06b6d4", // border-cyan-600
                          padding: "0.5rem 1rem",
                          borderRadius: "0.375rem",
                          transition: "all 0.3s ease",
                        },
                        className:
                          "bg-slate-800 text-cyan-600 border border-cyan-600 px-4 py-2 rounded-md font-medium text-sm transition-all duration-300 hover:bg-slate-700 flex items-center justify-center",
                      }}
                      connectModal={{
                        size: "compact",
                        title: "Connect to StakePro",
                        showThirdwebBranding: false,
                      }}
                      theme="dark"
                    />
                  </motion.div>
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="flex justify-center items-center gap-2 mt-6 text-base sm:text-lg text-slate-400 font-geist"
              >
                <ShieldCheck
                  className="w-5 h-5 text-cyan-600"
                  aria-hidden="true"
                />
                <span>Powered by Binance</span>
              </motion.div>
              <div id="hero-description" className="sr-only">
                Connect your wallet to stake USDT and earn 13% rewards on our
                secure platform.
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16 sm:py-20 bg-gradient-to-b from-cyan-700/10 to-transparent">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Ccircle cx=%2220%22 cy=%2220%22 r=%222%22 fill=%22rgba(14,116,144,0.2)%22/%3E%3C/svg%3E')] opacity-30" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-2xl md:text-3xl font-extrabold text-center mb-12 text-slate-200 font-geist hover:text-shadow-[0_0_10px_rgba(14,116,144,0.5)] transition-all duration-300"
            id="stats-heading"
          >
            Platform Stats
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
            {[
              {
                icon: Shield,
                label: "Platform Uptime",
                value: mockData.platformUptime,
                suffix: "% Reliability",
              },
              {
                icon: Star,
                label: "User Satisfaction",
                value: mockData.userSatisfaction,
                suffix: "/5 Star Rating",
              },
              {
                icon: Globe,
                label: "Global Reach",
                value: mockData.globalReach,
                suffix: "+ Countries",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative bg-slate-800/40 backdrop-blur-sm p-8 sm:p-10 rounded-2xl border border-cyan-700/30 shadow-inner transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(14,116,144,0.3)] group"
                aria-labelledby="stats-heading"
              >
                <stat.icon
                  className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-600 mb-4 animate-pulse"
                  aria-hidden="true"
                />
                <h3 className="text-lg sm:text-xl font-bold text-cyan-600 font-geist">
                  {stat.label}
                </h3>
                <p className="text-3xl sm:text-4xl font-bold text-slate-200 font-geist-mono mt-2">
                  <CountUp
                    end={stat.value}
                    decimals={
                      stat.suffix.includes("Rating")
                        ? 1
                        : stat.suffix.includes("Reliability")
                        ? 1
                        : 0
                    }
                    duration={2.5}
                    separator=","
                    suffix={stat.suffix}
                  />
                </p>
                <span className="absolute top-2 right-2 text-xs text-slate-400 font-geist opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Live
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-16 sm:py-20 bg-gradient-to-b from-cyan-700/10 to-transparent overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Ccircle cx=%2220%22 cy=%2220%22 r=%222%22 fill=%22rgba(14,116,144,0.2)%22/%3E%3C/svg%3E')] opacity-30" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-base sm:text-lg font-semibold text-cyan-600 mb-4 text-center font-geist-mono"
          >
            Built for Wealth Creation
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl md:text-3xl font-extrabold text-center mb-12 text-slate-200 font-geist hover:text-shadow-[0_0_10px_rgba(14,116,144,0.5)] transition-all duration-300"
            id="features-heading"
          >
            Why Choose StakePro?
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
            {[
              {
                icon: DollarSign,
                title: "High Rewards",
                description:
                  "Earn 13% rewards by staking USDT for just 5 days.",
                tooltip: "13% APY",
              },
              {
                icon: Users,
                title: "Referral Program",
                description: "Invite friends and earn 0.5 USDT per referral.",
                tooltip: "0.5 USDT per referral",
              },
              {
                icon: Shield,
                title: "Secure Platform",
                description:
                  "Your assets are protected with top-tier security.",
                tooltip: "Audited by SecureDeFi",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.2 + 0.4 }}
                className="relative bg-slate-800/40 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-cyan-700/30 shadow-inner transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(14,116,144,0.3)] group"
                style={{ transformStyle: "preserve-3d" }}
                aria-labelledby="features-heading"
              >
                <feature.icon
                  className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-600 mb-4 animate-pulse"
                  aria-hidden="true"
                />
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-slate-200 font-geist">
                  {feature.title}
                </h3>
                <motion.p
                  initial={{ y: 10, opacity: 0.8 }}
                  whileHover={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-base sm:text-lg text-slate-400 font-geist"
                >
                  {feature.description}
                </motion.p>
                <span className="absolute bottom-2 right-2 text-xs text-slate-400 font-geist opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {feature.tooltip}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-20 bg-gradient-to-b from-cyan-700/10 to-transparent overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Ccircle cx=%2220%22 cy=%2220%22 r=%222%22 fill=%22rgba(14,116,144,0.2)%22/%3E%3C/svg%3E')] opacity-30" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative bg-slate-800/40 backdrop-blur-sm p-8 sm:p-12 rounded-3xl border border-cyan-700/30 shadow-inner hover:shadow-[0_0_20px_rgba(14,116,144,0.3)] transition-all duration-300 group"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-700/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
            <ArrowRightCircle
              className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-600 mx-auto mb-6"
              aria-hidden="true"
            />
            <motion.p
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg font-semibold text-cyan-600 mb-4 font-geist-mono"
            >
              Earn 13% APY in just 5 days
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-2xl md:text-3xl font-extrabold mb-6 text-slate-200 font-geist hover:text-shadow-[0_0_10px_rgba(14,116,144,0.5)] transition-all duration-300"
            >
              Start Staking Today
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-lg sm:text-xl mb-8 max-w-lg sm:max-w-xl mx-auto font-medium font-geist text-slate-300"
            >
              Join thousands of users growing their wealth with StakePro’s
              secure platform.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6"
            >
              {account ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center px-4 py-3 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md font-medium text-sm transition-all duration-300 hover:bg-slate-700"
                    aria-label="Navigate to staking dashboard"
                    aria-describedby="cta-description"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ConnectButton
                    client={client}
                    wallets={wallets}
                    connectButton={{
                      label: (
                        <span className="group flex items-center text-cyan-600 text-sm font-medium transition-colors duration-300">
                          Get Started
                          <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                      ),
                      style: {
                        background: "#1e293b", // bg-slate-800
                        color: "#06b6d4", // text-cyan-600
                        border: "1px solid #06b6d4", // border-cyan-600
                        padding: "0.5rem 1rem",
                        borderRadius: "0.375rem",
                        transition: "all 0.3s ease",
                      },
                      className:
                        "bg-slate-800 text-cyan-600 border border-cyan-600 px-4 py-3 rounded-md font-medium text-sm transition-all duration-300 hover:bg-slate-700 flex items-center justify-center",
                    }}
                    connectModal={{
                      size: "compact",
                      title: "Connect to StakePro",
                      showThirdwebBranding: false,
                    }}
                    theme="dark"
                  />
                </motion.div>
              )}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <a
                  to="/about"
                  href="https://t.me/your_admin_support_channel"
                  target="_blank"
                  className="inline-flex items-center px-4 py-3 bg-slate-800 text-cyan-600 border border-cyan-600 rounded-md font-medium text-sm transition-all duration-300 hover:bg-slate-700"
                  aria-label="Learn more about StakePro"
                  aria-describedby="cta-description"
                >
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                </a>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="flex justify-center items-center gap-2 mt-8 text-base sm:text-lg text-slate-400 font-geist"
            >
              <ShieldCheck
                className="w-5 h-5 text-cyan-600"
                aria-hidden="true"
              />
              <span>Trusted by thousands of users | Audited by SecureDeFi</span>
            </motion.div>
            <div id="cta-description" className="sr-only">
              Start staking USDT to earn 13% rewards or learn more about
              StakePro’s secure platform.
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 sm:py-20 bg-gradient-to-b from-cyan-700/10 to-transparent">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22%3E%3Ccircle cx=%2220%22 cy=%2220%22 r=%222%22 fill=%22rgba(14,116,144,0.2)%22/%3E%3C/svg%3E')] opacity-30" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-base sm:text-lg text-slate-400 font-geist"
          >
            © {new Date().getFullYear()} StakePro. All rights reserved.
          </motion.p>
        </div>
      </footer>
    </div>
  );
}
