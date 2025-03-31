import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  Package2, 
  LineChart, 
  FileBarChart,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
  user: any | null;
  onLogout: () => void;
}

export default function Sidebar({ isMobile, onClose, user, onLogout }: SidebarProps) {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard className="mr-3 h-5 w-5" /> },
    { path: "/orders", label: "Orders", icon: <FileText className="mr-3 h-5 w-5" /> },
    { path: "/inventory", label: "Inventory", icon: <Package2 className="mr-3 h-5 w-5" /> },
    { path: "/sales", label: "Sales", icon: <LineChart className="mr-3 h-5 w-5" /> },
    { path: "/reports", label: "Reports", icon: <FileBarChart className="mr-3 h-5 w-5" /> },
  ];
  
  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };
  
  const getUserInitials = () => {
    if (!user || !user.name) return "U";
    return user.name.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    if (isMobile && onClose) {
      onClose();
    }
  };
  
  return (
    <div className={`bg-white shadow-md w-64 flex-shrink-0 flex flex-col h-full ${isMobile ? 'z-50' : ''}`}>
      <div className="p-4 border-b border-neutral-200">
        <h1 className="text-xl font-semibold text-primary">WaterTrack</h1>
        <p className="text-sm text-muted-foreground">Distribution Management</p>
      </div>
      
      <nav className="p-2 flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <a
                  className={`flex items-center p-3 rounded-md ${
                    location === item.path
                      ? 'text-primary bg-blue-50'
                      : 'text-neutral-500 hover:bg-neutral-100'
                  }`}
                  onClick={handleNavClick}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
            <span>{getUserInitials()}</span>
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role || "User"}</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          className="w-full mt-3 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
