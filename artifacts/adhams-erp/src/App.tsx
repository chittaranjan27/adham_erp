import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/Layout";
import { RoleProvider, useRole } from "@/context/RoleContext";
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

function Router() {
  return (
    <AppLayout>
      <Switch>
        {/* Unguarded routes — accessible to all roles */}
        <Route path="/" component={Dashboard} />
        <Route path="/products" component={Products} />
        <Route path="/orders" component={Orders} />
        <ProtectedRoute path="/orders/:id" component={OrderDetails} modulePath="/orders" />
        <Route path="/warehouses" component={Warehouses} />
        <Route path="/dealers" component={Dealers} />
        <Route path="/finance" component={Finance} />
        <Route path="/users" component={Users} />

        {/* Protected routes — direct URL access blocked for unauthorised roles */}
        <ProtectedRoute path="/inventory" component={Inventory} />
        <ProtectedRoute path="/grn/partial" component={PartialGRN} modulePath="/grn" />
        <ProtectedRoute path="/grn" component={GRN} />
        <ProtectedRoute path="/logistics" component={Logistics} />
        <ProtectedRoute path="/purchase-orders/new" component={CreatePurchaseOrder} modulePath="/purchase-orders" />
        <ProtectedRoute path="/purchase-orders" component={PurchaseOrders} />
        <ProtectedRoute path="/import-workflow" component={PurchaseOrders} modulePath="/import-workflow" />
        <ProtectedRoute path="/import-workflow/:id" component={ImportWorkflow} modulePath="/import-workflow" />

        {/* Sales-only view — has its own in-component guard as a second layer */}
        <Route path="/inventory/saleable" component={SaleableInventory} />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </RoleProvider>
    </QueryClientProvider>
  );
}

export default App;
