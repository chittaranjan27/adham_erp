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
  ChevronDown,
  FileText,
  ClipboardList,
  Globe,
  PackageCheck,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@assets/Adhams_logo_1774437291858.jpg";
import { useRole, ROLE_CONFIG, AppRole } from "@/context/RoleContext";

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
  const { role, setRole, permissions } = useRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{permissions.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{permissions.email}</p>
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
            <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-2 sm:px-3 py-1.5 border border-border">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {permissions.initials}
              </div>
              <div className="relative flex items-center gap-1">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AppRole)}
                  className="text-xs sm:text-sm font-medium bg-transparent border-none focus:ring-0 cursor-pointer hover:text-primary transition-colors appearance-none pr-4 max-w-[80px] sm:max-w-none"
                >
                  {(Object.keys(ROLE_CONFIG) as AppRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-0" />
              </div>
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
    </div>
  );
}
