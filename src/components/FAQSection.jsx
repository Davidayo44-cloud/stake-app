import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  ChevronDown, 
  Search,
  MessageCircle,
  Star,
  Check,
  Info,
  Shield,
  DollarSign,
  Clock,
  Users,
  Zap,
  Award,
  Filter,
  ExternalLink
} from 'lucide-react';

// Custom CSS for fluid typography with clamp
const styles = `
  html {
    font-size: clamp(16px, 2.5vw, 18px);
  }
`;

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

const FAQSection = () => {
  const [openFAQIndex, setOpenFAQIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const toggleFAQ = (index) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  const faqData = [
    {
      question: "What is the minimum amount to stake?",
      answer: "The minimum stake is 2 USDT, ensuring accessibility for all investors. This low barrier allows anyone to start earning passive income through our platform.",
      category: "staking",
      icon: DollarSign,
      popular: true,
      tags: ["minimum", "USDT", "accessibility"]
    },
    {
      question: "How long is the staking period?",
      answer: "The staking period is 5 days, after which you can withdraw your principal and rewards or auto-restake for compound growth. This short period provides flexibility while maintaining attractive returns.",
      category: "staking",
      icon: Clock,
      popular: true,
      tags: ["period", "withdrawal", "flexibility"]
    },
    {
      question: "What is the reward rate for staking?",
      answer: "You earn a 30% APY on your staked USDT, providing high-yield returns that outperform traditional savings accounts and many DeFi protocols.",
      category: "rewards",
      icon: Star,
      popular: true,
      tags: ["APY", "returns", "yield"]
    },
    {
      question: "What is the referral bonus?",
      answer: "Earn 0.5 USDT for each successful referral when they stake with us. There's no limit to how many people you can refer, creating unlimited earning potential.",
      category: "rewards",
      icon: Users,
      popular: false,
      tags: ["referral", "bonus", "unlimited"]
    },
    {
      question: "Can I withdraw my rewards early?",
      answer: "Yes, but early withdrawal halves your accrued rewards to maintain pool stability. We recommend completing the full 5-day period for maximum returns.",
      category: "staking",
      icon: Zap,
      popular: false,
      tags: ["early", "withdrawal", "penalty"]
    },
    {
      question: "How secure is the platform?",
      answer: "Our platform uses multi-signature wallets, cold storage, and audited smart contracts for maximum security. We've also implemented advanced encryption and regular security audits.",
      category: "security",
      icon: Shield,
      popular: true,
      tags: ["security", "audit", "protection"]
    },
    {
      question: "Are there any fees for staking?",
      answer: "No, there are no fees for staking or withdrawing your funds. We believe in transparent pricing with no hidden costs.",
      category: "staking",
      icon: Award,
      popular: false,
      tags: ["fees", "transparent", "no cost"]
    },
    {
      question: "How do I get started?",
      answer: "Simply create an account, deposit your USDT, and start staking. The entire process takes less than 5 minutes and requires no technical knowledge.",
      category: "getting-started",
      icon: Info,
      popular: true,
      tags: ["start", "account", "simple"]
    }
  ];

  const categories = [
    { id: 'all', label: 'All Questions', icon: HelpCircle },
    { id: 'staking', label: 'Staking', icon: DollarSign },
    { id: 'rewards', label: 'Rewards', icon: Star },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'getting-started', label: 'Getting Started', icon: Info }
  ];

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const popularFAQs = faqData.filter(faq => faq.popular);

  return (
    <>
      <style>{styles}</style>
      <section className="relative py-10 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-slate-800/80">
        {/* Enhanced background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

          <FloatingParticles />

        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="h-full w-full" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-xl rounded-full border border-slate-600/50 mb-8 shadow-2xl">
              <MessageCircle className="w-5 h-5 text-cyan-400" />
              <span className="text-xs sm:text-sm font-medium text-slate-200">
                Got Questions?
              </span>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-6 leading-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-4xl mx-auto leading-relaxed">
              Everything you need to know about staking with StakePro - your questions answered
            </p>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-800/50 backdrop-blur-xl border border-slate-600/30 rounded-2xl text-xs sm:text-sm lg:text-base placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                      activeCategory === category.id
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`}
                  >
                    <category.icon className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">{category.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Popular Questions */}
          {searchQuery === '' && activeCategory === 'all' && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-6">
                <Star className="w-6 h-6 text-yellow-400" />
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white">Popular Questions</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularFAQs.slice(0, 3).map((faq, index) => (
                  <motion.button
                    key={`popular-${index}`}
                    onClick={() => {
                      const originalIndex = faqData.findIndex(f => f.question === faq.question);
                      setOpenFAQIndex(originalIndex);
                      document.getElementById(`faq-${originalIndex}`)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="group p-4 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-600/30 hover:border-cyan-500/50 transition-all duration-300 text-left"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <faq.icon className="w-5 h-5 text-cyan-400" />
                      <span className="text-xs sm:text-sm font-medium text-white group-hover:text-cyan-100 transition-colors">
                        {faq.question}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className="text-xs text-slate-400">Popular</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* FAQ Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {filteredFAQs.map((faq, index) => {
                const originalIndex = faqData.findIndex(f => f.question === faq.question);
                return (
                  <motion.div
                    key={faq.question}
                    id={`faq-${originalIndex}`}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="group relative"
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-lg" />
                    
                    <div className="relative p-8 bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-600/30 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10">
                      {/* Glass effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl" />
                      
                      {/* Popular badge */}
                      {faq.popular && (
                        <div className="absolute top-2 right-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs font-medium text-yellow-400">Popular</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="relative">
                        <button
                          onClick={() => toggleFAQ(originalIndex)}
                          className="flex items-center justify-between w-full text-left focus:outline-none group/btn"
                          aria-expanded={openFAQIndex === originalIndex}
                        >
                          <div className="flex items-center gap-4 flex-1 mr-4">
                            <div className="relative">
                              <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-md group-hover:blur-lg transition-all duration-300" />
                              <div className="relative p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 group-hover:border-cyan-500/40 transition-all duration-300">
                                <faq.icon className="w-5 h-5 text-cyan-400 group-hover/btn:scale-110 transition-transform duration-300" />
                              </div>
                            </div>
                            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-white group-hover/btn:text-cyan-100 transition-colors duration-300">
                              {faq.question}
                            </h3>
                          </div>
                          <ChevronDown
                            className={`w-6 h-6 text-slate-400 transition-all duration-300 flex-shrink-0 ${
                              openFAQIndex === originalIndex ? "rotate-180 text-cyan-400" : "group-hover/btn:text-slate-300"
                            }`}
                          />
                        </button>
                        
                        <AnimatePresence>
                          {openFAQIndex === originalIndex && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="pt-6 pb-2">
                                <div className="pl-20">
                                  <p className="text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed mb-4">
                                    {faq.answer}
                                  </p>
                                  
                                  {/* Tags */}
                                  <div className="flex flex-wrap gap-2 mb-4">
                                    {faq.tags.map((tag, tagIndex) => (
                                      <span
                                        key={tagIndex}
                                        className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-400 border border-slate-600/30"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                  
                                  {/* Helpful indicator */}
                                  <div className="flex items-center gap-2 text-emerald-400">
                                    <Check className="w-4 h-4" />
                                    <span className="text-xs sm:text-sm">Helpful answer</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* No results message */}
          {filteredFAQs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <HelpCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-400 mb-2">No questions found</h3>
              <p className="text-xs sm:text-sm lg:text-base text-slate-500">Try adjusting your search or browse different categories</p>
            </motion.div>
          )}

          {/* Contact Support */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-xl rounded-2xl border border-slate-600/30 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer group">
              <MessageCircle className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-left">
                <div className="text-xs sm:text-sm lg:text-base font-medium text-white">Still have questions?</div>
                <div className="text-xs sm:text-sm text-slate-400">Contact our support team</div>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors duration-300" />
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default FAQSection;