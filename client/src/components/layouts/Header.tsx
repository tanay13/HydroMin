import { useLocation } from "wouter";
import { Search, Bell, Settings, Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  user: any | null;
  onLogout: () => void;
}

export default function Header({ isMobile, sidebarOpen, setSidebarOpen, user, onLogout }: HeaderProps) {
  const [location] = useLocation();
  
  // Get page title based on current route
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/orders":
        return "Orders";
      case "/inventory":
        return "Inventory";
      case "/sales":
        return "Sales";
      case "/reports":
        return "Reports";
      default:
        return "Not Found";
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
  
  return (
    <header className="bg-white shadow-sm p-4 flex items-center justify-between">
      {isMobile ? (
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5 text-neutral-500" />
          </Button>
          <h1 className="text-lg font-semibold text-primary ml-2">WaterTrack</h1>
        </div>
      ) : (
        <h2 className="text-lg font-semibold text-neutral-500">{getPageTitle()}</h2>
      )}
      
      <div className="flex items-center space-x-4">
        <div className="relative hidden md:block">
          <Search className="h-4 w-4 absolute left-3 top-3 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 rounded-md border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-5 w-5 text-neutral-500" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="rounded-full p-0 h-10 w-10 overflow-hidden">
              <div className="w-full h-full bg-primary flex items-center justify-center text-white text-sm font-medium rounded-full">
                {getUserInitials()}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-normal">
                <p className="font-medium">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-500 hover:text-red-500 hover:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
