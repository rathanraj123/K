import { motion } from 'framer-motion';
import { User, Moon, Sun, Key, LogOut, Globe, Bell, ArrowLeftRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import ModeSwitcher from '@/components/ModeSwitcher';

const LANGUAGES = ['English', 'हिन्दी', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ', 'বাংলা', 'मराठी'];

export default function SettingsPage() {
  const { isDark, toggleTheme, userName, setUserName, scanHistory, userRole, language, setLanguage } = useAppStore();

  const isFarmer = userRole === 'farmer';

  return (
    <div className="min-h-screen pt-8 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span className="gradient-text">Settings</span>
          </h1>
          <p className="text-muted-foreground mt-2">Manage your profile and preferences.</p>
        </motion.div>

        <div className="space-y-6">
          {/* Role Switch */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Mode</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Switch between Farmer and Scientist mode</p>
                <p className="text-xs text-muted-foreground">UI adapts to your selected role</p>
              </div>
              <ModeSwitcher />
            </div>
          </motion.div>

          {/* Profile */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Display Name</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
                <input type="email" value="researcher@agricosmo.ai" disabled className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm text-muted-foreground cursor-not-allowed" />
              </div>
            </div>
          </motion.div>

          {/* Language (Farmer) */}
          {isFarmer && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Language</h2>
              </div>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-4 py-2.5 rounded-xl glass text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/30">
                {LANGUAGES.map(l => <option key={l} value={l} className="bg-background text-foreground">{l}</option>)}
              </select>
            </motion.div>
          )}

          {/* Notifications */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">Notifications</h2>
            </div>
            <div className="space-y-3">
              {['Crop alerts', 'Scan results', 'Weekly report'].map((n) => (
                <div key={n} className="flex items-center justify-between py-2">
                  <span className="text-sm">{n}</span>
                  <div className="w-10 h-5 rounded-full bg-primary relative cursor-pointer">
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-card shadow-sm" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Appearance */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              {isDark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              <h2 className="font-bold text-lg">Appearance</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
              </div>
              <button onClick={toggleTheme} className={`relative w-14 h-7 rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow-md transition-transform ${isDark ? 'translate-x-7' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </motion.div>

          {/* API (Scientists) */}
          {!isFarmer && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Key className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">API Access</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">Coming Soon</span>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground">API key access will be available soon. Integrate AgriCosmo AI into your research workflows.</p>
                </div>
                <div className="flex justify-between text-sm p-3 rounded-xl bg-accent/30">
                  <span className="text-muted-foreground">Total API Calls</span>
                  <span className="font-semibold">{scanHistory.length}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Danger zone */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass rounded-2xl p-6 border-destructive/20">
            <div className="flex items-center gap-3 mb-4">
              <LogOut className="w-5 h-5 text-destructive" />
              <h2 className="font-bold text-lg">Account</h2>
            </div>
            <button className="px-5 py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors">Sign Out</button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
