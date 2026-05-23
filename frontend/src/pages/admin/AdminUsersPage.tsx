import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Wheat, Microscope } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get<any>('/analytics/users');
        setUsers(res.data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                       u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleBlock = async (id: string) => {
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u));
    // In a real app, I'd call api.post(`/users/${id}/toggle-status`)
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          User <span className="gradient-text">Management</span>
        </h1>
        <p className="text-muted-foreground mt-1">View, search, and manage platform users.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { icon: Users, label: 'Total Users', value: users.length, color: 'text-primary bg-primary/10' },
          { icon: Wheat, label: 'Farmers Registered', value: users.filter(u => u.role === 'farmer').length, color: 'text-emerald-400 bg-emerald-400/10' },
          { icon: Microscope, label: 'Scientists Registered', value: users.filter(u => u.role === 'scientist').length, color: 'text-blue-400 bg-blue-400/10' },
        ].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 text-center hover-lift border border-border/30">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
          />
        </div>
        <select 
          value={roleFilter} 
          onChange={(e) => setRoleFilter(e.target.value)} 
          className="px-4 py-2.5 rounded-xl glass text-sm bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all" className="bg-[#0c120c] text-foreground">All Roles</option>
          <option value="farmer" className="bg-[#0c120c] text-foreground">Farmer</option>
          <option value="scientist" className="bg-[#0c120c] text-foreground">Scientist</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden border border-border/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-accent/20">
                <th className="text-left p-4 font-bold text-muted-foreground">User</th>
                <th className="text-left p-4 font-bold text-muted-foreground">Role</th>
                <th className="text-left p-4 font-bold text-muted-foreground text-center">Scans</th>
                <th className="text-left p-4 font-bold text-muted-foreground">Status</th>
                <th className="text-left p-4 font-bold text-muted-foreground">Joined</th>
                <th className="text-right p-4 font-bold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border/20 hover:bg-accent/25 transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="font-semibold text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded-lg ${
                      u.role === 'farmer' 
                        ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/10' 
                        : 'bg-blue-400/10 text-blue-400 border border-blue-400/10'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-center">{u.scans}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                      u.status === 'active' 
                        ? 'bg-emerald-400/10 text-emerald-400' 
                        : 'bg-red-400/10 text-red-400'
                    }`}>
                      {u.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">{new Date(u.joined).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => toggleBlock(u.id)} 
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-transparent ${
                        u.status === 'active' 
                          ? 'text-red-400 hover:bg-red-400/10 hover:border-red-400/10' 
                          : 'text-emerald-400 hover:bg-emerald-400/10 hover:border-emerald-400/10'
                      }`}
                    >
                      {u.status === 'active' ? 'Block' : 'Unblock'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground font-semibold">
                    No users found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
