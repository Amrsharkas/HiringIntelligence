import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Clock, 
  UserMinus, 
  Filter, 
  Brain, 
  Target, 
  Check,
  Moon,
  Sun,
  Building2,
  Users,
  BarChart3,
  Zap
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import SignInModal from "@/components/SignInModal";
import SignUpModal from "@/components/SignUpModal";

// Import company logos
import fridgenoMoreLogo from "@assets/image_1752003678355.png";
import quantaLogo from "@assets/image_1752003682343.png";
import implefLogo from "@assets/image_1752003686195.png";
import neuroSignalsLogo from "@assets/image_1752003689944.png";
import polygonLogo from "@assets/image_1752003694043.png";
import groveLogo from "@assets/image_1752003699461.png";
import melaniteLogo from "@assets/image_1752003765140.png";
import monumentLogo from "@assets/image_1752003880641.png";
import skillcredsLogo from "@assets/image_1752003885271.png";
import jaugmentorLogo from "@assets/image_1752003889182.png";
import aiCanSellLogo from "@assets/image_1752003892804.png";
import fridgenoMore2Logo from "@assets/image_1752004479413.png";
import quanta2Logo from "@assets/image_1752004485103.png";
import implef2Logo from "@assets/image_1752004496691.png";
import neuroSignals2Logo from "@assets/image_1752004504429.png";
import polygon2Logo from "@assets/image_1752004514079.png";
import grove2Logo from "@assets/image_1752004524180.png";
import melanite2Logo from "@assets/image_1752004532230.png";
import monument2Logo from "@assets/image_1752004540355.png";
import skillcreds2Logo from "@assets/image_1752004548842.png";
import jaugmentor2Logo from "@assets/image_1752004558896.png";
import logo from "@assets/logo.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);

  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const companyLogos = [
    { name: "Fridge No More", logo: fridgenoMoreLogo },
    { name: "Quanta", logo: quantaLogo },
    { name: "Implef", logo: implefLogo },
    { name: "Neuro Signals", logo: neuroSignalsLogo },
    { name: "Polygon", logo: polygonLogo },
    { name: "Grove", logo: groveLogo },
    { name: "Melanite", logo: melaniteLogo },
    { name: "Monument", logo: monumentLogo },
    { name: "Skillcreds", logo: skillcredsLogo },
    { name: "Jaugmentor", logo: jaugmentorLogo },
    { name: "AiCanSell", logo: aiCanSellLogo },
    { name: "Fridge No More", logo: fridgenoMore2Logo },
    { name: "Quanta", logo: quanta2Logo },
    { name: "Implef", logo: implef2Logo },
    { name: "Neuro Signals", logo: neuroSignals2Logo },
    { name: "Polygon", logo: polygon2Logo },
    { name: "Grove", logo: grove2Logo },
    { name: "Melanite", logo: melanite2Logo },
    { name: "Monument", logo: monument2Logo },
    { name: "Skillcreds", logo: skillcreds2Logo },
    { name: "Jaugmentor", logo: jaugmentor2Logo }
  ];

  // Auto-cycle through logos every 5 seconds (slower)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLogoIndex((prevIndex) => 
        prevIndex === companyLogos.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const floatAnimation = {
    y: [0, -20, 0],
    transition: {
      duration: 6,
      ease: "easeInOut",
      repeat: Infinity,
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-blue-900/30 overflow-x-hidden">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
      >
        {theme === "light" ? (
          <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        ) : (
          <Sun className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        )}
      </button>

      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <img 
              src={logo} 
              alt="Plato Logo" 
              className="h-10 w-auto p-2"
            />
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setShowSignIn(true)}
                className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
              >
                Sign In
              </Button>
              <Button
                onClick={() => setShowSignUp(true)}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <motion.div 
            animate={floatAnimation}
            className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{
              ...floatAnimation,
              transition: { ...floatAnimation.transition, delay: 3 }
            }}
            className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl"
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
              Hiring is{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Broken
              </span>
              .<br />
              We're Here to Fix It.
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              Stop wasting time on unqualified candidates. Our AI conducts interviews, 
              generates detailed profiles, and matches candidates to your jobs with 1-100 ratings.
            </p>
            <div className="flex items-center justify-center space-x-6">
              <Button
                onClick={() => setShowSignUp(true)}
                size="lg"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowSignIn(true)}
                className="px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Sign In
              </Button>
            </div>
          </motion.div>

          {/* Client Success Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-32 mb-24"
          >
            {/* Success Stats */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">95%</div>
                <div className="text-gray-600 dark:text-gray-400">Hiring Success Rate</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">60%</div>
                <div className="text-gray-600 dark:text-gray-400">Time Reduction</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400 mb-2">98%</div>
                <div className="text-gray-600 dark:text-gray-400">Client Satisfaction</div>
              </motion.div>
            </div>

            {/* Logo Carousel Section - Moved after stats */}
            <div className="mt-20 text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Trusted by Industry Leaders
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Join successful companies who've transformed their hiring process and discovered exceptional talent with our AI-powered platform. From startups to enterprises, they trust our technology to find the perfect match.
              </p>
            </div>

            {/* Logo Carousel - Podium Style */}
            <div className="relative w-full max-w-6xl mx-auto mb-20">
              <div className="flex items-center justify-center h-96 relative">
                {/* Left Logo */}
                <motion.div
                  initial={{ opacity: 0, x: -100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="absolute left-0 z-10"
                >
                  <div className="w-80 h-56 flex items-center justify-center bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/40 dark:border-slate-700/40 transform scale-75 filter blur-sm opacity-70">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`left-${currentLogoIndex}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="flex items-center justify-center"
                      >
                        <img
                          src={companyLogos[currentLogoIndex === 0 ? companyLogos.length - 1 : currentLogoIndex - 1].logo}
                          alt={companyLogos[currentLogoIndex === 0 ? companyLogos.length - 1 : currentLogoIndex - 1].name}
                          className="max-w-[160px] max-h-[60px] object-contain filter contrast-75 dark:brightness-90"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Center Logo (Main Focus) */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="z-20"
                >
                  <div className="w-96 h-64 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`center-${currentLogoIndex}`}
                        initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        exit={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                        transition={{ 
                          duration: 0.8, 
                          ease: "easeInOut",
                          rotateY: { duration: 1 }
                        }}
                        className="flex items-center justify-center"
                      >
                        <img
                          src={companyLogos[currentLogoIndex].logo}
                          alt={companyLogos[currentLogoIndex].name}
                          className="max-w-[240px] max-h-[100px] object-contain filter contrast-100 dark:brightness-100"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Right Logo */}
                <motion.div
                  initial={{ opacity: 0, x: 100 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="absolute right-0 z-10"
                >
                  <div className="w-80 h-56 flex items-center justify-center bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/40 dark:border-slate-700/40 transform scale-75 filter blur-sm opacity-70">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`right-${currentLogoIndex}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="flex items-center justify-center"
                      >
                        <img
                          src={companyLogos[currentLogoIndex === companyLogos.length - 1 ? 0 : currentLogoIndex + 1].logo}
                          alt={companyLogos[currentLogoIndex === companyLogos.length - 1 ? 0 : currentLogoIndex + 1].name}
                          className="max-w-[160px] max-h-[60px] object-contain filter contrast-75 dark:brightness-90"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>

              {/* Carousel Indicators */}
              <div className="flex justify-center mt-6 space-x-2">
                {companyLogos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentLogoIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentLogoIndex === index
                        ? 'bg-blue-600 dark:bg-blue-400 scale-125 shadow-lg'
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>

              {/* Floating Success Indicators */}
              <div className="absolute -top-4 -left-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Active Partners</span>
                </div>
              </div>
              
              <div className="absolute -top-4 -right-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Proven Results</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Problem Cards */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "Time Wasted",
                description: "Employers spend 40+ hours per hire screening unqualified candidates manually.",
                color: "red",
                delay: 0.2
              },
              {
                icon: UserMinus,
                title: "Poor Fits",
                description: "68% of new hires don't meet expectations due to inadequate screening processes.",
                color: "yellow",
                delay: 0.4
              },
              {
                icon: Filter,
                title: "Inefficient Filtering",
                description: "Traditional resume screening misses key soft skills and cultural fit indicators.",
                color: "blue",
                delay: 0.6
              }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, delay: item.delay }}
                whileHover={{ 
                  y: -8, 
                  scale: 1.02,
                  rotateX: 5,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
                style={{ transformStyle: "preserve-3d" }}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-16 h-16 bg-${item.color}-100 dark:bg-${item.color}-900/30 rounded-xl flex items-center justify-center mb-6`}>
                  <item.icon className={`w-8 h-8 text-${item.color}-600 dark:text-${item.color}-400`} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-300">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">Our AI-Powered Solution</h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Revolutionary technology that conducts interviews, analyzes candidates, and provides precise job matching.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* AI Interview Feature */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, rotateY: 5 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="w-20 h-20 bg-blue-600 dark:bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">AI Interviews</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Our AI conducts comprehensive interviews, asking relevant questions based on job requirements and analyzing responses in real-time.
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                {[
                  "Natural conversation flow",
                  "Skill-based questioning", 
                  "Behavioral analysis"
                ].map((feature, index) => (
                  <motion.li 
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center"
                  >
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    {feature}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Matching Feature */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, rotateY: -5 }}
              className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="w-20 h-20 bg-purple-600 dark:bg-purple-500 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Smart Matching (1-100)</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Get precise match scores for every candidate based on technical skills, soft skills, experience, and cultural fit.
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                {[
                  "Detailed match reasoning",
                  "Skill gap analysis",
                  "Cultural fit assessment"
                ].map((feature, index) => (
                  <motion.li 
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center"
                  >
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    {feature}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-blue-900/30 dark:to-purple-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">Trusted by Leading Companies</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Building2, stat: "500+", label: "Companies" },
              { icon: Users, stat: "10K+", label: "Candidates" },
              { icon: BarChart3, stat: "95%", label: "Match Accuracy" },
              { icon: Zap, stat: "80%", label: "Time Saved" }
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 border border-slate-200/60 dark:border-slate-700/60 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <item.icon className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <div className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{item.stat}</div>
                <div className="text-slate-600 dark:text-slate-300 font-medium">{item.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Hiring?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join hundreds of companies already using AI-powered hiring to find the perfect candidates faster.
            </p>
            <Button
              onClick={() => setShowSignUp(true)}
              size="lg"
              className="px-8 py-4 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Get Started Today
            </Button>
          </motion.div>
        </div>
      </section>
      
      {/* Authentication Modals */}
      <SignInModal 
        isOpen={showSignIn} 
        onClose={() => setShowSignIn(false)}
        onSwitchToSignUp={() => {
          setShowSignIn(false);
          setShowSignUp(true);
        }}
      />
      <SignUpModal 
        isOpen={showSignUp} 
        onClose={() => setShowSignUp(false)}
        onSwitchToSignIn={() => {
          setShowSignUp(false);
          setShowSignIn(true);
        }}
      />
    </div>
  );
}
