import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  PackageSearch,
  Boxes,
  ShoppingCart,
  Warehouse,
  UsersRound,
  Truck,
  BadgeIndianRupee,
  ShieldCheck,
  Bell,
  Search,
  FileText,
  ClipboardList,
  Globe,
  PackageCheck,
  Menu,
  X,
  LogOut,
  KeyRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@assets/Adhams_logo_1774437291858.jpg";
import { useRole, ROLE_CONFIG } from "@/context/RoleContext";
import { useAuth } from "@/context/AuthContext";

const ALL_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, group: "core" },
  { href: "/inventory", label: "Inventory", icon: Boxes, group: "core" },
  { href: "/products", label: "Products", icon: PackageSearch, group: "core" },
  { href: "/orders", label: "Orders", icon: ShoppingCart, group: "core" },
  { href: "/warehouses", label: "Warehouses", icon: Warehouse, group: "core" },
  { href: "/dealers", label: "Dealers & CRM", icon: UsersRound, group: "core" },
  { href: "/logistics", label: "Logistics", icon: Truck, group: "core" },
  { href: "/finance", label: "Finance", icon: BadgeIndianRupee, group: "core" },
  { href: "/users", label: "Users & Access", icon: ShieldCheck, group: "core" },
  // Sales-specific
  { href: "/inventory/saleable", label: "Saleable Stock", icon: PackageCheck, group: "core" },
  // Phase 2 procurement
  { href: "/purchase-orders", label: "Purchase Orders", icon: FileText, group: "procurement" },
  { href: "/grn", label: "GRN", icon: ClipboardList, group: "procurement" },
  { href: "/import-workflow", label: "Import Workflow", icon: Globe, group: "procurement" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { role, permissions } = useRole();
  const { logout, changePassword, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = () => setShowUserMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showUserMenu]);

  // Filter nav items by role permissions
  const coreNav = ALL_NAV.filter(
    (item) => item.group === "core" && permissions.modules.includes(item.href)
  );
  const procurementNav = ALL_NAV.filter(
    (item) => item.group === "procurement" && permissions.modules.includes(item.href)
  );

  const renderNavItem = (item: (typeof ALL_NAV)[0]) => {
    const isActive = location === item.href || location.startsWith(item.href + "/");
    return (
      <Link key={item.href} href={item.href} className="block">
        <div className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden
          ${isActive ? 'bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}
        `}>
          {isActive && (
            <motion.div
              layoutId="activeNav"
              className="absolute inset-0 bg-primary opacity-10"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-primary'}`} />
          <span className="relative z-10 text-sm truncate">{item.label}</span>
        </div>
      </Link>
    );
  };

  const roleLabel = ROLE_CONFIG[role]?.label || role;

  const sidebarContent = (
    <>
      <div className="h-16 lg:h-20 flex items-center px-4 lg:px-6 border-b border-sidebar-border/50 bg-sidebar/50 backdrop-blur-sm shrink-0">
        <img src={logo} alt="Adhams Logo" className="h-8 lg:h-10 w-auto rounded-md" />
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden ml-auto p-1.5 text-sidebar-foreground/70 hover:text-sidebar-foreground rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 lg:p-4 flex-1 overflow-y-auto space-y-4">
        {/* Core modules */}
        <div>
          <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2">
            Platform Modules
          </div>
          <nav className="space-y-1">
            {coreNav.map(renderNavItem)}
          </nav>
        </div>

        {/* Procurement modules */}
        {procurementNav.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2">
              Procurement
            </div>
            <nav className="space-y-1">
              {procurementNav.map(renderNavItem)}
            </nav>
          </div>
        )}
      </div>

      <div className="p-3 lg:p-4 border-t border-sidebar-border/50 bg-sidebar-accent/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white font-bold shadow-inner shrink-0 text-sm lg:text-base">
            {permissions.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{permissions.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{roleLabel}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar text-sidebar-foreground flex-col border-r border-sidebar-border shadow-2xl z-20 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-72 bg-sidebar text-sidebar-foreground flex flex-col shadow-2xl z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 sm:h-16 lg:h-20 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-8 shrink-0 z-10 shadow-sm gap-2 sm:gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile logo */}
          <img src={logo} alt="Adhams Logo" className="h-7 w-auto rounded-md lg:hidden shrink-0" />

          <div className="hidden sm:flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-xs lg:max-w-sm xl:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search orders, inventory..."
                className="w-full pl-10 pr-4 py-2 lg:py-2.5 bg-muted/50 border border-transparent rounded-xl text-sm focus:outline-none focus:bg-background focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all duration-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 ml-auto">
            {/* Mobile search pill */}
            <button className="sm:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
              <Search className="w-5 h-5" />
            </button>

            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted rounded-full">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-card animate-pulse"></span>
            </button>
            <div className="hidden sm:block h-8 w-px bg-border"></div>

            {/* User menu with logout */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                className="flex items-center gap-2 bg-muted/60 rounded-xl px-2 sm:px-3 py-1.5 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {permissions.initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs sm:text-sm font-medium leading-tight truncate max-w-[100px] lg:max-w-[140px]">
                    {permissions.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">
                    {roleLabel}
                  </p>
                </div>
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl shadow-black/10 overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-border/50">
                      <p className="text-sm font-medium">{permissions.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {roleLabel}
                      </span>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => { setShowUserMenu(false); setShowPasswordModal(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                        Change Password
                      </button>
                      <button
                        onClick={() => { setShowUserMenu(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-8 relative">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const err = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      setSuccess(true);
      setTimeout(handleClose, 1500);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
      >
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>

        {success ? (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
            ✅ Password changed successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? "Saving..." : "Change Password"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
