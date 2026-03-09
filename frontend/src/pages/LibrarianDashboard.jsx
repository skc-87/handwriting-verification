import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  BookMarked,
  Clock,
  ArrowLeftRight,
} from "lucide-react";
import ManageBooks from "../components/ManageBooks";
import IssueReturnBooks from "../components/IssueReturnBooks";
import ViewBooks from "../components/ViewBooks";
import BookTransactions from "../components/BookTransactions";
import DashboardLayout from "../components/DashboardLayout";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";
import { CountUp, SpotlightCard } from "../components/reactbits";

const StatCard = ({ title, value, icon: Icon, color, subtitle, loading }) => {
  const colors = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100", spotlight: "rgba(79, 70, 229, 0.12)" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-100", spotlight: "rgba(139, 92, 246, 0.12)" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", ring: "ring-rose-100", spotlight: "rgba(244, 63, 94, 0.12)" },
    cyan: { bg: "bg-cyan-50", text: "text-cyan-600", ring: "ring-cyan-100", spotlight: "rgba(6, 182, 212, 0.12)" },
  };
  const c = colors[color] || colors.indigo;

  return (
    <SpotlightCard spotlightColor={c.spotlight} className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-extrabold text-slate-900 leading-none">
            {loading ? (
              <span className="inline-block w-12 h-8 rounded-lg shimmer" />
            ) : (
              <CountUp
                to={typeof value === 'number' ? value : parseInt(value) || 0}
                from={0}
                duration={1.5}
                className="text-3xl font-extrabold text-slate-900"
                separator=","
              />
            )}
          </p>
          {subtitle && <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl ${c.bg} ring-1 ${c.ring} flex items-center justify-center`}>
          <Icon size={22} className={c.text} />
        </div>
      </div>
    </SpotlightCard>
  );
};

const LibrarianDashboard = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    totalBooks: 0,
    issuedBooks: 0,
    overdueBooks: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("authToken");
      if (!token) {
        setError("Please login again");
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/library/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      setStats(response.data);
    } catch (err) {
      console.error("Error fetching stats:", err.message);
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else {
        setError("Failed to load library statistics");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const tabTitles = [
    "Browse Books",
    "Manage Books",
    "Issue & Return",
    "Transactions",
  ];

  const tabSubtitles = [
    "Search and explore the library catalog",
    "Add, edit, and organize your book collection",
    "Issue and process book returns",
    "View all borrowing history and records",
  ];

  return (
    <DashboardLayout
      role="librarian"
      activeTab={tabValue}
      onTabChange={setTabValue}
      title={tabTitles[tabValue]}
      subtitle={tabSubtitles[tabValue]}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Books" value={stats.totalBooks} icon={BookOpen} color="indigo" subtitle="In collection" loading={loading} />
        <StatCard title="Books Issued" value={stats.issuedBooks} icon={BookMarked} color="violet" subtitle="Currently borrowed" loading={loading} />
        <StatCard title="Overdue" value={stats.overdueBooks} icon={Clock} color="rose" subtitle="Need attention" loading={loading} />
        <StatCard title="Transactions" value={stats.totalTransactions} icon={ArrowLeftRight} color="cyan" subtitle="All time records" loading={loading} />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-4 text-sm text-slate-500">Loading library data...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tabValue}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="card p-4 sm:p-6"
          >
            {tabValue === 0 && <ViewBooks onStatsUpdate={fetchStats} />}
            {tabValue === 1 && <ManageBooks onStatsUpdate={fetchStats} />}
            {tabValue === 2 && <IssueReturnBooks onStatsUpdate={fetchStats} />}
            {tabValue === 3 && <BookTransactions onStatsUpdate={fetchStats} />}
          </motion.div>
        </AnimatePresence>
      )}
    </DashboardLayout>
  );
};

export default LibrarianDashboard;