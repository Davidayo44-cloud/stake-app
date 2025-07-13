import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Shield, 
  Star, 
  Globe, 
  Users, 
  Zap, 
  Award,
  ArrowUp,
  Activity
} from 'lucide-react';

// Custom CSS for fluid typography with clamp
const styles = `
  html {
    font-size: clamp(16px, 2.5vw, 18px);
  }
`;

// Enhanced CountUp component
const CountUp = ({ end, decimals = 0, duration = 2.5, separator = "," }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = end * easeOutQuart;
      
      setCount(currentCount);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  const formatNumber = (num) => {
    const rounded = decimals > 0 ? num.toFixed(decimals) : Math.floor(num);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  };
  
  return <span>{formatNumber(count)}</span>;
};

// Mock data
const mockData = {
  platformUptime: 99.9,
  userSatisfaction: 4.8,
  globalReach: 50,
  activeUsers: 500,
  transactionsPerSecond: 15000,
  securityScore: 98.5
};

// Floating particles background
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(30)].map((_, i) => (
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

const StatsSection = () => {
  const [activeTab, setActiveTab] = useState('performance');
  
  const statCategories = {
    performance: [
      {
        icon: Shield,
        label: "Platform Uptime",
        value: mockData.platformUptime,
        suffix: "%",
        description: "Service Reliability",
        color: "emerald",
        trend: "+0.2%",
        pulse: true
      },
      {
        icon: Zap,
        label: "Response Time",
        value: 45,
        suffix: "ms",
        description: "Average API Response",
        color: "yellow",
        trend: "-12ms",
        pulse: true
      },
      {
        icon: Activity,
        label: "Transactions/sec",
        value: mockData.transactionsPerSecond,
        suffix: "",
        description: "Real-time Processing",
        color: "purple",
        trend: "+2.5K",
        pulse: true
      },
    ],
    users: [
      {
        icon: Users,
        label: "Active Users",
        value: mockData.activeUsers,
        suffix: "",
        description: "Monthly Active Users",
        color: "blue",
        trend: "+15%",
        pulse: false
      },
      {
        icon: Star,
        label: "User Rating",
        value: mockData.userSatisfaction,
        suffix: "/5",
        description: "Customer Satisfaction",
        color: "amber",
        trend: "+0.1",
        pulse: false
      },
      {
        icon: Globe,
        label: "Global Reach",
        value: mockData.globalReach,
        suffix: "+",
        description: "Countries Supported",
        color: "cyan",
        trend: "+5",
        pulse: false
      },
    ]
  };

  return (
    <>
      <style>{styles}</style>
      <section className="relative py-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        {/* Enhanced background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <FloatingParticles />
        
        {/* Animated grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="h-full w-full" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-xl rounded-full border border-slate-600/50 mb-8 shadow-2xl">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span className="text-xs sm:text-sm font-medium text-slate-200">
                Live Performance Metrics
              </span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            
            <h2 className="text-4xl sm:text-4xl lg:text-4xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-6 leading-tight">
              Platform Performance
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Real-time insights into our platform's exceptional performance, reliability, and global impact
            </p>
          </motion.div>

          {/* Category tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex justify-center mb-12"
          >
            <div className="flex p-1 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-600/30">
              {Object.keys(statCategories).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveTab(category)}
                  className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 text-xs sm:text-sm ${
                    activeTab === category
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Enhanced stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {statCategories[activeTab].map((stat, index) => (
              <motion.div
                key={`${activeTab}-${stat.label}`}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="group relative"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-lg" />
                
                <motion.div
                  className="relative p-6 sm:p-8 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-600/30 group-hover:border-cyan-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10"
                  whileHover={{
                    y: -10,
                    rotateX: 2,
                    rotateY: 2,
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                >
                  {/* Glass effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-3xl" />
                  
                  {/* Header with icon and trend */}
                  <div className="relative flex items-center justify-between mb-8">
                    <div className="relative">
                      <div className={`absolute inset-0 bg-${stat.color}-500/30 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500`} />
                      <div className={`relative p-4 bg-gradient-to-br from-${stat.color}-500/20 to-${stat.color}-600/20 rounded-2xl border border-${stat.color}-500/20 group-hover:border-${stat.color}-500/40 transition-all duration-300`}>
                        <stat.icon className={`w-7 h-7 text-${stat.color}-400 group-hover:scale-110 transition-transform duration-300`} />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 backdrop-blur-sm">
                      <ArrowUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400">{stat.trend}</span>
                    </div>
                  </div>

                  {/* Enhanced circular progress */}
                  <div className="relative mb-8 flex justify-center">
                    <div className="relative">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="none"
                          className="text-slate-700/50"
                        />
                        {/* Progress circle */}
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="url(#gradient)"
                          strokeWidth="6"
                          fill="none"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          whileInView={{ pathLength: Math.min(stat.value / 100, 1) }}
                          transition={{ duration: 2.5, delay: index * 0.4, ease: "easeOut" }}
                          viewport={{ once: true }}
                          className="drop-shadow-lg"
                          style={{
                            strokeDasharray: "264",
                            strokeDashoffset: "264",
                          }}
                        />
                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" className={`stop-${stat.color}-400`} />
                            <stop offset="100%" className={`stop-${stat.color}-600`} />
                          </linearGradient>
                        </defs>
                      </svg>
                      
                      {/* Center content */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-base sm:text-lg lg:text-xl font-bold text-white mb-1 tracking-tight">
                            <CountUp
                              end={stat.value}
                              decimals={
                                stat.suffix.includes("/5") ? 1 :
                                stat.suffix.includes("%") ? 1 : 0
                              }
                              duration={2.5}
                              separator=","
                            />
                          </div>
                          <div className="text-xs font-medium text-slate-400">{stat.suffix}</div>
                        </div>
                      </div>
                      
                      {/* Pulse effect for real-time stats */}
                      {stat.pulse && (
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 animate-ping" />
                      )}
                    </div>
                  </div>

                  {/* Text content */}
                  <div className="space-y-3 text-center relative">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white group-hover:text-cyan-100 transition-colors duration-300">
                      {stat.label}
                    </h3>
                    <p className="text-sm sm:text-base lg:text-lg text-slate-400 group-hover:text-slate-300 transition-colors duration-300 leading-relaxed">
                      {stat.description}
                    </p>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 group-hover:w-20 transition-all duration-700 rounded-full" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default StatsSection;