import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
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

export default function Landing() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

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
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Plato
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleLogin}
                className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
              >
                Login
              </Button>
              <Button
                onClick={handleLogin}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Post a Job Now
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
                onClick={handleLogin}
                size="lg"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                Post a Job Now
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleLogin}
                className="px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Login
              </Button>
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
              onClick={handleLogin}
              size="lg"
              className="px-8 py-4 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Get Started Today
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
