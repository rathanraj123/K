import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Moon, Sun, Menu, X, Shield, LogOut, User as UserIcon } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";



export default function Navbar() {
  const { isDark, toggleTheme, userRole, token, logout, userName } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = userRole === 'admin';
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAuthenticated = !!token;

  const navLinks = isAuthenticated ? [
    { to: '/', label: 'Home' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/upload', label: 'Upload' },
    { to: '/history', label: 'History' },
    { to: '/chat', label: 'Expert Chat' },
  ] : [
    { to: '/', label: 'Home' },
  ];

  const adminLinks = [
    { to: '/', label: 'Home' },
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/scans', label: 'Scans' },
    { to: '/admin/analytics', label: 'Analytics' },
  ];

  const currentLinks = isAdminRoute ? adminLinks : navLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={isAdmin ? '/admin' : '/'} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all hover:scale-105">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Agri<span className="gradient-text">Cosmo</span>
            </span>
            {isAdmin && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold border border-destructive/20 animate-pulse">Admin</span>
            )}
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {currentLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === link.to
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
                {location.pathname === link.to && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg bg-accent"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors hidden sm:block"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link
              to="/admin"
              className="hidden md:inline-flex p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Admin Panel"
            >
              <Shield className="w-5 h-5" />
            </Link>

            {!isAdminRoute && (
              <div className="flex items-center gap-3 ml-2 border-l border-border/50 pl-4">
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-3 p-1 rounded-full hover:bg-accent transition-colors">
                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs ring-2 ring-background ring-offset-2 ring-offset-primary/20">
                          {userName ? userName[0].toUpperCase() : 'U'}
                        </div>
                        <div className="hidden xl:block text-left mr-2">
                          <p className="text-xs font-bold leading-none">{userName}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{userRole}</p>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl border-border/50">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-bold leading-none">{userName}</p>
                          <p className="text-xs leading-none text-muted-foreground italic">AgriCosmo Pro Member</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem className="rounded-lg cursor-pointer gap-2" onClick={() => navigate('/dashboard')}>
                        <UserIcon className="w-4 h-4" /> Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10" onClick={handleLogout}>
                        <LogOut className="w-4 h-4" /> Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="hidden md:inline-flex px-4 py-2 text-sm font-semibold rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-all active:scale-95"
                    >
                      Login
                    </Link>
                    <Link
                      to="/upload"
                      className="hidden md:inline-flex px-4 py-2 text-sm font-semibold rounded-xl gradient-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            )}
            
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="lg:hidden border-t border-border/50 bg-card/95 backdrop-blur-xl"
        >
          <div className="px-4 py-4 space-y-2">
            {currentLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            <div className="pt-4 mt-4 border-t border-border/50 space-y-2">
              {isAuthenticated ? (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" /> Logout
                </Button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-bold text-center border border-primary/30 text-primary"
                  >
                    Login
                  </Link>
                  <Link
                    to="/upload"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-bold text-center gradient-primary text-primary-foreground shadow-lg shadow-primary/20"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
