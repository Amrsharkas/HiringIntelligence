import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowRight, CreditCard, Package } from "lucide-react";

interface SuperAdminWelcomeProps {
  onNavigate: (page: string) => void;
}

export function SuperAdminWelcome({ onNavigate }: SuperAdminWelcomeProps) {
  const quickActions = [
    {
      id: "companies",
      title: "Manage Companies",
      description: "View all organizations, edit details, and manage credits",
      icon: Building2,
      gradient: "from-blue-500/10 via-blue-400/5 to-transparent",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      id: "subscription-plans",
      title: "Subscription Plans",
      description: "Create and manage subscription tiers with regional pricing",
      icon: CreditCard,
      gradient: "from-purple-500/10 via-purple-400/5 to-transparent",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400"
    },
    {
      id: "credit-packages",
      title: "Credit Packages",
      description: "Manage CV processing and interview credit bundles",
      icon: Package,
      gradient: "from-emerald-500/10 via-emerald-400/5 to-transparent",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-2xl p-8 border border-purple-200/50 dark:border-purple-700/50">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          Welcome to Super Admin Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
          This dashboard provides administrative tools to manage organizations,
          monitor platform usage, and allocate credits. Use the sidebar navigation
          or quick actions below to access different management areas.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 bg-gradient-to-br ${action.gradient} bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm`}
              onClick={() => onNavigate(action.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl ${action.iconBg} flex items-center justify-center`}>
                    <action.icon className={`w-6 h-6 ${action.iconColor}`} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">{action.title}</CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
