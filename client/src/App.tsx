import { Switch, Route, useLocation } from "wouter";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import Inventory from "@/pages/Inventory";
import Sales from "@/pages/Sales";
import Reports from "@/pages/Reports";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layouts/Sidebar";
import Header from "@/components/layouts/Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth, RequireAuth } from "@/contexts/AuthContext";

// Layout component for authenticated pages
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col md:flex-row">
      {!isMobile && <Sidebar user={user} onLogout={logout} />}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          isMobile={isMobile} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          user={user}
          onLogout={logout}
        />
        
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}>
            <div className="w-64 h-full" onClick={e => e.stopPropagation()}>
              <Sidebar isMobile={true} onClose={() => setSidebarOpen(false)} user={user} onLogout={logout} />
            </div>
          </div>
        )}
        
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Redirect from login to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && location === "/login") {
      window.location.href = "/";
    }
  }, [isAuthenticated, location]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        <RequireAuth>
          <AuthenticatedLayout>
            <Dashboard />
          </AuthenticatedLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/orders">
        <RequireAuth>
          <AuthenticatedLayout>
            <Orders />
          </AuthenticatedLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/inventory">
        <RequireAuth>
          <AuthenticatedLayout>
            <Inventory />
          </AuthenticatedLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/sales">
        <RequireAuth>
          <AuthenticatedLayout>
            <Sales />
          </AuthenticatedLayout>
        </RequireAuth>
      </Route>
      
      <Route path="/reports">
        <RequireAuth>
          <AuthenticatedLayout>
            <Reports />
          </AuthenticatedLayout>
        </RequireAuth>
      </Route>
      
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
