import React, { useState, useEffect, useRef } from 'react';
import { ArrowRightCircle, ArrowRight, Lock, DollarSign, TrendingUp, Zap, Trophy } from 'lucide-react';
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { Link, useNavigate } from "react-router-dom";

// Validate environment variables
const VITE_THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!VITE_THIRDWEB_CLIENT_ID) {
  console.error(
    "Home.jsx: Missing VITE_THIRDWEB_CLIENT_ID environment variable"
  );
  throw new Error("VITE_THIRDWEB_CLIENT_ID is not defined in .env file");
}
const CarouselSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
      const account = useActiveAccount();
  const [scrollLeft, setScrollLeft] = useState(0);
    const carouselRef = useRef(null);
    
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

 const steps = [
    {
      step: "Step 1",
      title: "Connect Your Wallet",
      description: "Securely connect with MetaMask, Coinbase Wallet, or other supported wallets via Thirdweb integration.",
      icon: Lock,
      color: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/20 to-pink-500/20"
    },
    {
      step: "Step 2", 
      title: "Stake USDT",
      description: "Deposit a minimum of 2 USDT for a 5-day staking period to start earning.",
      icon: DollarSign,
      color: "from-green-500 to-emerald-500",
      bgGradient: "from-green-500/20 to-emerald-500/20"
    },
    {
      step: "Step 3",
      title: "Earn Rewards",
      description: "Enjoy 30% APY on your stake and earn 0.5 USDT per referral.",
      icon: TrendingUp,
      color: "from-cyan-500 to-blue-500",
      bgGradient: "from-cyan-500/20 to-blue-500/20"
    },
    {
      step: "Step 4",
      title: "Withdraw or Compound",
      description: "Withdraw your rewards or compound them for higher returns, with gasless meta-transactions.",
      icon: Zap,
      color: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/20 to-red-500/20"
    },
    {
      step: "Step 5",
      title: "Congratulations!",
      description: "You've successfully staked, earned, and managed your rewards. Keep growing your wealth!",
      icon: Trophy,
      color: "from-yellow-500 to-amber-500",
      bgGradient: "from-yellow-500/20 to-amber-500/20"
    },
];

  // Touch/Mouse handlers
  const handleStart = (e) => {
    setIsDragging(true);
    const x = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    setStartX(x);
    setScrollLeft(x);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
    const diff = x - startX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe right - go to previous
        setActiveIndex((prev) => (prev - 1 + steps.length) % steps.length);
      } else {
        // Swipe left - go to next
        setActiveIndex((prev) => (prev + 1) % steps.length);
      }
      setIsDragging(false);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Auto-play functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % steps.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const getCardTransform = (index) => {
    const diff = index - activeIndex;
    const totalCards = steps.length;
    
    // Normalize the difference to handle wrap-around
    let normalizedDiff = diff;
    if (diff > totalCards / 2) {
      normalizedDiff = diff - totalCards;
    } else if (diff < -totalCards / 2) {
      normalizedDiff = diff + totalCards;
    }

    const isActive = index === activeIndex;
    const translateX = normalizedDiff * 280; // Spacing between cards
    const scale = isActive ? 1 : 0.85;
    const opacity = isActive ? 1 : Math.max(0.3, 1 - Math.abs(normalizedDiff) * 0.3);
    const rotateY = normalizedDiff * -15; // 3D rotation effect
    const zIndex = isActive ? 20 : 10 - Math.abs(normalizedDiff);

    return {
      transform: `translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
      opacity,
      zIndex,
      filter: isActive ? 'brightness(1)' : 'brightness(0.7)',
    };
  };

  return (
    <section className="relative py-10 bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-purple-500/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/70 backdrop-blur-md rounded-full border border-slate-600/50 mb-6">
            <ArrowRightCircle className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-slate-200">How It Works</span>
          </div>
          <h2 className="text-4xl lg:text-4xl font-bold text-white mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Start Staking in 4 Simple Steps
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Discover how easy it is to stake USDT and earn high-yield returns with StakePro.
          </p>
        </div>

        {/* Carousel */}
        <div className="relative">
          {/* Cards Container */}
          <div 
            ref={carouselRef}
            className="relative h-[500px] flex items-center justify-center overflow-hidden perspective-1000"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const cardStyle = getCardTransform(index);
              const isActive = index === activeIndex;
              
              return (
                <div
                  key={step.title}
                  className={`absolute w-80 h-96 transition-all duration-700 ease-out transform-gpu ${
                    isActive ? 'cursor-pointer' : 'cursor-pointer'
                  }`}
                  style={cardStyle}
                  onClick={() => setActiveIndex(index)}
                >
                  <div className={`relative h-full p-8 rounded-3xl border backdrop-blur-xl transition-all duration-500 ${
                    isActive 
                      ? 'bg-slate-800/80 border-slate-500/50 shadow-2xl shadow-cyan-500/20' 
                      : 'bg-slate-800/40 border-slate-600/30'
                  }`}>
                    {/* Gradient overlay */}
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${step.bgGradient} opacity-${isActive ? '100' : '50'}`} />
                    
                    {/* Content */}
                    <div className="relative h-full flex flex-col">
                      {/* Step indicator */}
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-3 rounded-2xl bg-gradient-to-r ${step.color} shadow-lg`}>
                          <StepIcon className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-300 bg-slate-700/50 backdrop-blur-sm px-3 py-1 rounded-full">
                          {step.step}
                        </span>
                      </div>
                      
                      {/* Title */}
                      <h3 className={`text-2xl font-bold mb-4 transition-all duration-500 ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}>
                        {step.title}
                      </h3>
                      
                      {/* Description */}
                      <p className={`leading-relaxed flex-1 transition-all duration-500 ${
                        isActive ? 'text-slate-300' : 'text-slate-400'
                      }`}>
                        {step.description}
                      </p>
                      
                      {/* Active indicator */}
                      {isActive && (
                        <div className="mt-6 flex items-center gap-2 text-cyan-400">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                          <span className="text-sm font-medium">Active Step</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center mt-4 space-x-3">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`relative w-3 h-3 rounded-full transition-all duration-300 ${
                  index === activeIndex 
                    ? 'bg-cyan-500 scale-125 shadow-lg shadow-cyan-500/50' 
                    : 'bg-slate-600 hover:bg-slate-500 hover:scale-110'
                }`}
              >
                {index === activeIndex && (
                  <div className="absolute inset-0 bg-cyan-500 rounded-full animate-ping" />
                )}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          {/* <div className="flex justify-center mt-3">
            <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700 ease-out"
                style={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div> */}
        </div>

        {/* CTA Button */}
        <div className="mt-10 text-center">
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
                          Start Staking
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
        </div>
      </div>
    </section>
  );
};

export default CarouselSection;