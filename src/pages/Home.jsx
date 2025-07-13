import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import CarouselSection from "../components/CarouselSection";
import StatsSection from "../components/StatsSection";
import {
  Globe,
  Star,
  Shield,
  ArrowRightCircle,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Users,
  TrendingUp,
  Lock,
  Zap,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import CountUp from "react-countup";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import Header from "../components/Header";
import FeaturesSection from "../components/FeaturesSection";
import FAQSection from "../components/FAQSection";

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
  platformUptime: 99.9,
  userSatisfaction: 4.8,
  globalReach: 50,
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

const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(60)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
        initial={{
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
        }}
        animate={{
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
        }}
        transition={{
          duration: Math.random() * 20 + 10,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    ))}
  </div>
);

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const account = useActiveAccount();
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const [openFAQIndex, setOpenFAQIndex] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      setIsLoading(false);
    }, 500); // Simulate loading for better UX
  }, [account, navigate]);

  const toggleFAQ = (index) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-t-cyan-500 border-slate-700 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-geist overflow-hidden">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 to-slate-800/40" />
          <motion.div style={{ y }} className="absolute inset-0 opacity-25">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
          </motion.div>
        </div>
        <FloatingParticles/>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/70 backdrop-blur-md rounded-full border border-slate-600/50 shadow-sm"
                >
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-slate-200">
                    Now Live
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight"
                >
                  <span className="text-white">Stake</span>{" "}
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    USDT
                  </span>
                  <br />
                  <span className="text-slate-200 text-4xl lg:text-5xl">
                    Earn 30% Returns
                  </span>
                </motion.h1>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-xl text-slate-300 leading-relaxed max-w-2xl"
              >
                Professional-grade staking platform with institutional security. Lock
                your USDT for 5 days and earn guaranteed returns.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                {account ? (
                  <Link
                    to="/dashboard"
                    className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 hover:from-cyan-600 hover:to-blue-700 hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                  >
                    View Dashboard
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <ConnectButton
                    client={client}
                    wallets={wallets}
                    connectButton={{
                      label: (
                        <span className="group flex items-center text-white font-semibold">
                          Get Started
                          <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </span>
                      ),
                      style: {
                        background:
                          "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                        color: "white",
                        border: "none",
                        padding: "1rem 2rem",
                        borderRadius: "0.75rem",
                        fontWeight: "600",
                        transition: "all 0.3s ease",
                        boxShadow: "0 4px 14px 0 rgba(6, 182, 212, 0.2)",
                      },
                      className:
                        "hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900",
                    }}
                    connectModal={{
                      size: "compact",
                      title: "Connect to StakePro",
                      showThirdwebBranding: false,
                    }}
                    theme="dark"
                  />
                )}

                <a
                  href="https://t.me/stakerpro2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-slate-800/70 backdrop-blur-md text-slate-200 font-semibold rounded-xl border border-slate-600/50 transition-all duration-300 hover:bg-slate-700/70 hover:text-white hover:border-slate-500 hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  Learn More
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="flex items-center gap-3 pt-4"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-slate-300">
                  Secured by Binance Smart Chain
                </span>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl blur-xl" />
                <div className="relative z-10 p-8">
                  <img
                    src="/images/immm.png"
                    alt="StakePro Feature"
                    className="w-full max-w-md object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

        <CarouselSection/>

      {/* Stats Section */}
      {/* <section className="relative py-24 bg-slate-900/60 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/70 backdrop-blur-md rounded-full border border-slate-600/50 mb-6">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-slate-200">
                Live Performance
              </span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Platform Performance
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Real-time metrics showcasing our platform's reliability and user
              satisfaction
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                label: "Platform Uptime",
                value: mockData.platformUptime,
                suffix: "%",
                description: "Service Reliability",
                color: "emerald",
                trend: "+0.2%",
              },
              {
                icon: Star,
                label: "User Rating",
                value: mockData.userSatisfaction,
                suffix: "/5",
                description: "Customer Satisfaction",
                color: "amber",
                trend: "+0.1",
              },
              {
                icon: Globe,
                label: "Global Reach",
                value: mockData.globalReach,
                suffix: "+",
                description: "Countries Supported",
                color: "blue",
                trend: "+5",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="group relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-purple-500/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                <motion.div
                  className="relative p-8 bg-slate-800/40 backdrop-blur-xl rounded-3xl border border-slate-600/30 group-hover:border-cyan-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/20"
                  whileHover={{
                    rotateX: 5,
                    rotateY: 5,
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl" />
                  <div className="relative flex items-center justify-between mb-8">
                    <div className="relative">
                      <div className={`absolute inset-0 bg-${stat.color}-500/20 rounded-xl blur-md group-hover:blur-lg transition-all duration-300`} />
                      <div className={`relative p-3 bg-${stat.color}-500/10 rounded-xl group-hover:bg-${stat.color}-500/20 transition-colors duration-300`}>
                        <stat.icon className={`w-6 h-6 text-${stat.color}-400 group-hover:scale-110 transition-transform duration-300`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 rounded-full">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400">{stat.trend}</span>
                    </div>
                  </div>
                  <div className="relative mb-6">
                    <svg className="w-20 h-20 mx-auto transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-slate-700"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="45"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className={`text-${stat.color}-400`}
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: stat.value / 100 }}
                        transition={{ duration: 2, delay: index * 0.3 }}
                        viewport={{ once: true }}
                        style={{
                          strokeDasharray: "283",
                          strokeDashoffset: "283",
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          <CountUp
                            end={stat.value}
                            decimals={
                              stat.suffix.includes("/5")
                                ? 1
                                : stat.suffix.includes("%")
                                ? 1
                                : 0
                            }
                            duration={2.5}
                            separator=","
                          />
                        </div>
                        <div className="text-xs text-slate-400">{stat.suffix}</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 text-center">
                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-100 transition-colors duration-300">
                      {stat.label}
                    </h3>
                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                      {stat.description}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 group-hover:w-16 transition-all duration-500" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}
<StatsSection/>
      {/* Features Section */}
      {/* <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/70 backdrop-blur-md rounded-full border border-slate-600/50 mb-6">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-slate-200">
                Advanced Features
              </span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Why StakePro Stands Out
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Institutional-grade features designed for serious investors seeking
              consistent returns
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: DollarSign,
                title: "High Yield Returns",
                description:
                  "Earn 20% APY on your USDT holdings with our optimized staking protocol",
                highlight: "20% APY",
              },
              {
                icon: Users,
                title: "Referral Rewards",
                description:
                  "Build your network and earn 0.5 USDT for each successful referral",
                highlight: "0.5 USDT",
              },
              {
                icon: Lock,
                title: "Secure Custody",
                description:
                  "Multi-signature wallets and cold storage for maximum asset protection",
                highlight: "Bank-grade",
              },
              {
                icon: Zap,
                title: "Instant Liquidity",
                description:
                  "Quick 5-day lock periods with automated reward distribution",
                highlight: "5 days",
              },
              {
                icon: Shield,
                title: "Audited Protocol",
                description:
                  "Smart contracts audited by leading security firms for your peace of mind",
                highlight: "Audited",
              },
              {
                icon: TrendingUp,
                title: "Compound Growth",
                description:
                  "Reinvest your earnings automatically to maximize long-term returns",
                highlight: "Auto-compound",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative p-8 bg-slate-800/20 backdrop-blur-lg rounded-2xl border border-slate-600/30 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-cyan-500/10"
                style={{ transformStyle: "preserve-3d" }}
                whileHover={{ rotateX: 2, rotateY: 2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-2xl" />
                <div className="relative flex items-center justify-between mb-6">
                  <feature.icon className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-400/20 px-3 py-1 rounded-full group-hover:bg-emerald-400/30 transition-colors duration-300">
                    {feature.highlight}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

      <FeaturesSection/>

  

      {/* FAQ Section */}
   {/* FAQ Section */}
   
      {/* <section className="relative py-24 bg-gradient-to-b from-slate-950/70 to-slate-900/70">
        <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-5" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/70 backdrop-blur-md rounded-full border border-slate-600/50 mb-6">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-slate-200">
                Got Questions?
              </span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Everything you need to know about staking with StakePro
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                question: "What is the minimum amount to stake?",
                answer: "The minimum stake is 5 USDT, ensuring accessibility for all investors.",
              },
              {
                question: "How long is the staking period?",
                answer: "The staking period is 5 days, after which you can withdraw your principal and rewards or auto-restake.",
              },
              {
                question: "What is the reward rate for staking?",
                answer: "You earn a 20% APY on your staked USDT, providing high-yield returns.",
              },
              {
                question: "What is the referral bonus?",
                answer: "Earn 0.5 USDT for each successful referral when they stake with us.",
              },
              {
                question: "Can I withdraw my rewards early?",
                answer: "Yes, but early withdrawal halves your accrued rewards to maintain pool stability.",
              },
              {
                question: "How secure is the platform?",
                answer: "Our platform uses multi-signature wallets, cold storage, and audited smart contracts for maximum security.",
              },
            ].map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div
                  className="relative p-6 bg-slate-800/30 backdrop-blur-xl rounded-3xl border border-slate-600/20 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 hover:bg-slate-800/40"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="flex items-center justify-between w-full text-left focus:outline-none"
                      aria-expanded={openFAQIndex === index}
                    >
                      <div className="flex items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                        <h3 className="text-lg font-semibold text-white">
                          {faq.question}
                        </h3>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
                          openFAQIndex === index ? "rotate-180 text-cyan-400" : ""
                        }`}
                      />
                    </button>
                    <motion.div
                      initial={false}
                      animate={{
                        height: openFAQIndex === index ? "auto" : 0,
                        opacity: openFAQIndex === index ? 1 : 0,
                      }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 pb-2">
                        <p className="text-slate-300 leading-relaxed pl-8">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}
      <FAQSection/>

      {/* CTA Section */}
      <section className="relative py-24 bg-gradient-to-r from-slate-950/70 to-slate-900/70">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10" />
        <div className="relative mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/70 backdrop-blur-md rounded-full border border-slate-600/50">
              <ArrowRightCircle className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-medium text-slate-200">
                Ready to Start?
              </span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Start Earning Today
            </h2>

            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Join thousands of smart investors who trust StakePro for consistent,
              secure returns on their digital assets.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              {account ? (
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center justify-center px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl transition-all duration-300 hover:from-cyan-600 hover:to-blue-700 hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <ConnectButton
                  client={client}
                  wallets={wallets}
                  connectButton={{
                    label: (
                      <span className="group flex items-center text-white font-semibold">
                        Get Started Now
                        <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                      </span>
                    ),
                    style: {
                      background:
                        "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                      color: "white",
                      border: "none",
                      padding: "1rem 2.5rem",
                      borderRadius: "0.75rem",
                      fontWeight: "600",
                      transition: "all 0.3s ease",
                      boxShadow: "0 4px 14px 0 rgba(6, 182, 212, 0.2)",
                    },
                    className:
                      "hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900",
                  }}
                  connectModal={{
                    size: "compact",
                    title: "Connect to StakePro",
                    showThirdwebBranding: false,
                  }}
                  theme="dark"
                />
              )}

              <a
                href="https://t.me/stakerpro2"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center px-10 py-4 bg-slate-800/70 backdrop-blur-md text-slate-200 font-semibold rounded-xl border border-slate-600/50 transition-all duration-300 hover:bg-slate-700/70 hover:text-white hover:border-slate-500 hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Learn More
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div className="flex items-center justify-center gap-6 pt-8 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>SecureDeFi Audited</span>
              </div>
              <div className="w-1 h-1 bg-slate-600 rounded-full" />
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>10,000+ Active Users</span>
              </div>
              <div className="w-1 h-1 bg-slate-600 rounded-full" />
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Global Access</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 bg-slate-950/60">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <p className="text-slate-400">
              © {new Date().getFullYear()} StakePro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}