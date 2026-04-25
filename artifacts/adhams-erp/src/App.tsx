import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RoleProvider, useRole } from "@/context/RoleContext";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Products from "@/pages/Products";
import Orders from "@/pages/Orders";
import OrderDetails from "@/pages/OrderDetails";
import Warehouses from "@/pages/Warehouses";
import Dealers from "@/pages/Dealers";
import Logistics from "@/pages/Logistics";
import Finance from "@/pages/Finance";
import Users from "@/pages/Users";
import PurchaseOrders from "@/pages/PurchaseOrders";
import CreatePurchaseOrder from "@/pages/CreatePurchaseOrder";
import GRN from "@/pages/GRN";
import PartialGRN from "@/pages/PartialGRN";
import ImportWorkflow from "@/pages/ImportWorkflow";
import SaleableInventory from "@/pages/SaleableInventory";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 30_000, // 30 seconds — data refreshes quickly after changes
      retry: 1,
    },
    mutations: {
      onSuccess: () => {
        // Global cache invalidation: after ANY mutation succeeds,
        // invalidate all queries so every page shows fresh data.
        queryClient.invalidateQueries();
      },
    },
  },
});

// Immediately redirects to the dashboard when rendered.
// Used as the fallback when a role lacks access to a route.
function AccessDenied() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/");
  }, [navigate]);
  return null;
}

// Wraps a <Route> with a role-module guard.
// If the current role's `modules` list does not include `modulePath`
// (defaults to `path`), it renders <AccessDenied> instead of the component.
function ProtectedRoute({
  path,
  component: Component,
  modulePath,
}: {
  path: string;
  component: React.ComponentType;
  modulePath?: string;
}) {
  const { hasModule } = useRole();
  const allowed = hasModule(modulePath ?? path);

  return (
    <Route path={path}>
      {allowed ? <Component /> : <AccessDenied />}
    </Route>
  );
}

function AppRoutes() {
  return (
    <AppLayout>
      <Switch>
        {/* Dashboard — accessible to all authenticated roles */}
        <Route path="/" component={Dashboard} />

        {/* All module routes — protected by role-based module access */}
        <ProtectedRoute path="/products" component={Products} modulePath="/products" />
        <ProtectedRoute path="/orders/:id" component={OrderDetails} modulePath="/orders" />
        <ProtectedRoute path="/orders" component={Orders} modulePath="/orders" />
        <ProtectedRoute path="/warehouses" component={Warehouses} modulePath="/warehouses" />
        <ProtectedRoute path="/dealers" component={Dealers} modulePath="/dealers" />
        <ProtectedRoute path="/finance" component={Finance} modulePath="/finance" />
        <ProtectedRoute path="/users" component={Users} modulePath="/users" />
        <ProtectedRoute path="/inventory/saleable" component={SaleableInventory} modulePath="/inventory/saleable" />
        <ProtectedRoute path="/inventory" component={Inventory} modulePath="/inventory" />
        <ProtectedRoute path="/grn/partial" component={PartialGRN} modulePath="/grn" />
        <ProtectedRoute path="/grn" component={GRN} modulePath="/grn" />
        <ProtectedRoute path="/logistics" component={Logistics} modulePath="/logistics" />
        <ProtectedRoute path="/purchase-orders/new" component={CreatePurchaseOrder} modulePath="/purchase-orders" />
        <ProtectedRoute path="/purchase-orders" component={PurchaseOrders} modulePath="/purchase-orders" />
        <ProtectedRoute path="/import-workflow/:id" component={ImportWorkflow} modulePath="/import-workflow" />
        <ProtectedRoute path="/import-workflow" component={PurchaseOrders} modulePath="/import-workflow" />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

/**
 * Auth gate — shows the login page if not authenticated,
 * or the loading spinner while checking the token.
 */
function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <RoleProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppRoutes />
      </WouterRouter>
    </RoleProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}

// ─── Wire the auth token into the API client ─────────────────────────────────
// This runs once at module load time. The getter reads the token from
// localStorage on every API call, so it always picks up the latest value.
setAuthTokenGetter(() => localStorage.getItem("adhams_token"));

export default App;
