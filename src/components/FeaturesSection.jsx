import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Lock, 
  Zap, 
  Shield, 
  ArrowRight,
  Sparkles,
  Check,
  Star,
  Target,
  Award
} from 'lucide-react';

// Custom CSS for fluid typography with clamp
const styles = `
  html {
    font-size: clamp(16px, 2.5vw, 18px);
  }
`;

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

const FeaturesSection = () => {
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const features = [
    {
      icon: DollarSign,
      title: "High Yield Returns",
      description: "Earn 30% APY on your USDT holdings with our optimized staking protocol",
      highlight: "30% APY",
      color: "emerald",
      stats: "Up to 30% annually",
      badge: "Popular",
      benefits: ["Guaranteed returns", "Daily compounding", "No hidden fees"]
    },
    {
      icon: Users,
      title: "Referral Rewards",
      description: "Build your network and earn 0.5 USDT for each successful referral",
      highlight: "0.5 USDT",
      color: "blue",
      stats: "Per referral",
      badge: "Unlimited",
      benefits: ["Multi-tier rewards", "Instant payouts", "Lifetime earnings"]
    },
    {
      icon: Lock,
      title: "Secure Custody",
      description: "Multi-signature wallets and cold storage for maximum asset protection",
      highlight: "Bank-grade",
      color: "purple",
      stats: "99.9% uptime",
      badge: "Secure",
      benefits: ["Multi-sig wallets", "Cold storage", "Insurance covered"]
    },
    {
      icon: Zap,
      title: "Instant Liquidity",
      description: "Quick 5-day lock periods with automated reward distribution",
      highlight: "5 days",
      color: "yellow",
      stats: "Fast unlock",
      badge: "Flexible",
      benefits: ["Quick access", "Auto-distribution", "No penalties"]
    },
    {
      icon: Shield,
      title: "Audited Protocol",
      description: "Smart contracts audited by leading security firms for your peace of mind",
      highlight: "Audited",
      color: "red",
      stats: "3rd party verified",
      badge: "Trusted",
      benefits: ["CertiK audited", "Bug bounty", "Regular updates"]
    },
    {
      icon: TrendingUp,
      title: "Compound Growth",
      description: "Reinvest your earnings automatically to maximize long-term returns",
      highlight: "Auto-compound",
      color: "cyan",
      stats: "Maximized gains",
      badge: "Smart",
      benefits: ["Auto-reinvest", "Optimized timing", "Maximum returns"]
    },
  ];

  const getBadgeColor = (badge) => {
    const colors = {
      Popular: "bg-gradient-to-r from-emerald-500 to-green-500",
      Unlimited: "bg-gradient-to-r from-blue-500 to-indigo-500",
      Secure: "bg-gradient-to-r from-purple-500 to-violet-500",
      Flexible: "bg-gradient-to-r from-yellow-500 to-orange-500",
      Trusted: "bg-gradient-to-r from-red-500 to-pink-500",
      Smart: "bg-gradient-to-r from-cyan-500 to-teal-500"
    };
    return colors[badge] || "bg-gradient-to-r from-gray-500 to-gray-600";
  };

  return (
    <>
      <style>{styles}</style>
      <section className="relative py-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Enhanced background effects */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              </div>
                <FloatingParticles />

        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="h-full w-full" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-xl rounded-full border border-slate-600/50 mb-8 shadow-2xl">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-xs sm:text-sm font-medium text-slate-200">
                Advanced Features
              </span>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            </div>
            
            <h2 className="text-4xl sm:text-4xl lg:text-4xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-6 leading-tight">
              Why StakePro Stands Out
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-4xl mx-auto leading-relaxed">
              Institutional-grade features designed for serious investors seeking consistent returns with maximum security
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />
                
                <motion.div
                  className="relative p-6 sm:p-8 bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-600/30 group-hover:border-cyan-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 overflow-hidden"
                  whileHover={{
                    y: -8,
                    rotateX: 5,
                    rotateY: 5,
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                >
                  {/* Glass effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-3xl" />
                  
                  {/* Badge */}
                  <div className="absolute top-2 right-2">
                    <div className={`${getBadgeColor(feature.badge)} text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg`}>
                      {feature.badge}
                    </div>
                  </div>

                  {/* Icon and highlight */}
                  <div className="relative flex items-center justify-between mb-6">
                    <div className="relative mr-4">
                      <div className={`absolute inset-0 bg-${feature.color}-500/30 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500`} />
                      <div className={`relative p-4 bg-gradient-to-br from-${feature.color}-500/20 to-${feature.color}-600/20 rounded-2xl border border-${feature.color}-500/20 group-hover:border-${feature.color}-500/40 transition-all duration-300`}>
                        <feature.icon className={`w-8 h-8 text-${feature.color}-400 group-hover:scale-110 transition-transform duration-300`} />
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-base sm:text-lg lg:text-xl font-bold text-${feature.color}-400 mb-1`}>
                        {feature.highlight}
                      </div>
                      <div className="text-xs text-slate-400">
                        {feature.stats}
                      </div>
                    </div>
                  </div>

                  {/* Title and description */}
                  <div className="relative mb-6">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-3 group-hover:text-cyan-100 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed group-hover:text-slate-200 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>

                  {/* Benefits list - shown on hover */}
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ 
                      opacity: hoveredFeature === index ? 1 : 0,
                      height: hoveredFeature === index ? 'auto' : 0
                    }}
                    transition={{ duration: 0.3 }}
                    className="relative overflow-hidden"
                  >
                    <div className="border-t border-slate-600/30 pt-4">
                      <div className="space-y-2">
                        {feature.benefits.map((benefit, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs sm:text-sm text-slate-300">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Learn more button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: hoveredFeature === index ? 1 : 0,
                      y: hoveredFeature === index ? 0 : 10
                    }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="mt-4"
                  >
                    <button className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors duration-300 group/btn">
                      <span className="text-xs sm:text-sm font-medium">Learn more</span>
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </button>
                  </motion.div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 group-hover:w-16 transition-all duration-700 rounded-full" />
                  
                  {/* Sparkle effect */}
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <Star className="w-4 h-4 text-yellow-400 animate-pulse" />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-white font-medium shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-300  group">
              <Target className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs sm:text-sm lg:text-base">Start Earning Today</span>
              {/* <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" /> */}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default FeaturesSection;