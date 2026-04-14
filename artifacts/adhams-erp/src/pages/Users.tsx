import { useListUsers, useCreateUser, customFetch } from "@workspace/api-client-react";
import { Shield, Mail, Calendar, KeyRound, Plus, X, CheckCircle2, AlertCircle, Eye, EyeOff, Edit, Trash2, Power } from "lucide-react";
import usersImg from "@assets/multi-user_access_&_license_1774437524993.png";
import { useState } from "react";
import { useRole, ROLE_CONFIG, AppRole } from "@/context/RoleContext";
import { useQueryClient } from "@tanstack/react-query";

interface UserForm {
  name: string;
  email: string;
  role: string;
  password: string;
}

const defaultForm: UserForm = { name: "", email: "", role: "inventory_manager", password: "" };

const getRoleBadge = (role: string) => {
  if (role.includes("admin")) return "bg-purple-100 text-purple-700 border-purple-200";
  if (role.includes("manager")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (role.includes("head")) return "bg-orange-100 text-orange-700 border-orange-200";
  if (role.includes("finance") || role.includes("accounts")) return "bg-green-100 text-green-700 border-green-200";
  if (role.includes("logistics") || role.includes("transport") || role.includes("coordinator")) return "bg-indigo-100 text-indigo-700 border-indigo-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

export default function Users() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, refetch } = useListUsers();
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState<UserForm>(defaultForm);
  const [showPw, setShowPw] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { can } = useRole();

  const createUser = useCreateUser({
    mutation: {
      onSuccess: () => {
        setToast({ type: "success", msg: "User invited successfully!" });
        setIsOpen(false);
        setForm(defaultForm);
        refetch();
        setTimeout(() => setToast(null), 4000);
      },
      onError: (e: any) => {
        setToast({ type: "error", msg: e?.message || "Failed to invite user." });
        setTimeout(() => setToast(null), 4000);
      },
    },
  });

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, password: "" });
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (editingUser) {
      if (!form.name.trim() || !form.email.trim()) {
        setToast({ type: "error", msg: "Name and email are required." });
        setTimeout(() => setToast(null), 3000);
        return;
      }
      setSaving(true);
      try {
        await customFetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.trim(), email: form.email.trim().toLowerCase(), role: form.role }),
        });
        setToast({ type: "success", msg: "User updated!" });
        setIsOpen(false); setEditingUser(null); setForm(defaultForm);
        queryClient.invalidateQueries();
        setTimeout(() => setToast(null), 4000);
      } catch (e: any) {
        setToast({ type: "error", msg: e?.message || "Failed to update user." });
        setTimeout(() => setToast(null), 4000);
      } finally { setSaving(false); }
    } else {
      if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
        setToast({ type: "error", msg: "Name, email and password are required." });
        setTimeout(() => setToast(null), 3000);
        return;
      }
      if (form.password.length < 6) {
        setToast({ type: "error", msg: "Password must be at least 6 characters." });
        setTimeout(() => setToast(null), 3000);
        return;
      }
      createUser.mutate({ data: { name: form.name.trim(), email: form.email.trim().toLowerCase(), role: form.role, password: form.password } });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove user "${name}"? This cannot be undone.`)) return;
    try {
      await customFetch(`/api/users/${id}`, { method: "DELETE" });
      setToast({ type: "success", msg: `"${name}" removed.` });
      queryClient.invalidateQueries();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Failed to delete user." });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await customFetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      setToast({ type: "success", msg: `${user.name} ${!user.isActive ? "activated" : "suspended"}.` });
      queryClient.invalidateQueries();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Failed to update user." });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const allRoles = Object.keys(ROLE_CONFIG) as AppRole[];
  const isPending = createUser.isPending || saving;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-medium text-sm animate-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-sidebar text-white shadow-lg h-32 sm:h-48 flex items-center">
        <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity" style={{ backgroundImage: `url(${usersImg})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/80 to-transparent"></div>
        <div className="relative z-10 px-4 sm:px-8 flex flex-col sm:flex-row justify-between w-full sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold font-display mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /> Role-Based Access Control
            </h1>
            <p className="text-slate-300 max-w-xl text-xs sm:text-sm leading-relaxed">Manage internal staff accounts, assign granular permissions, and monitor platform access.</p>
          </div>
          {can("users") && (
            <button onClick={() => { setEditingUser(null); setForm(defaultForm); setIsOpen(true); }}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 shrink-0">
              <Plus className="w-5 h-5" /> Invite User
            </button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[700px]">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 font-semibold border-b border-border">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role & Access Level</th>
              <th className="px-6 py-4">Accessible Modules</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Login</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-muted rounded-full"></div><div className="h-4 bg-muted rounded w-32"></div></div></td>
                  <td className="px-6 py-4"><div className="h-6 bg-muted rounded-full w-32"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-40"></div></td>
                  <td className="px-6 py-4"><div className="h-6 bg-muted rounded-full w-16"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24"></div></td>
                  <td className="px-6 py-4"><div className="h-8 w-8 bg-muted rounded ml-auto"></div></td>
                </tr>
              ))
            ) : (
              users?.map((user: any) => {
                const roleKey = user.role as AppRole;
                const roleConf = ROLE_CONFIG[roleKey];
                const moduleCount = roleConf?.modules?.length || 0;
                return (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 border border-border flex items-center justify-center font-bold text-slate-600 shadow-sm">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md border ${getRoleBadge(user.role)}`}>
                        {user.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground">
                        {moduleCount} module{moduleCount !== 1 ? "s" : ""}
                        {roleConf ? ` (${roleConf.canCreate.length > 0 ? "R/W" : "Read-only"})` : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => can("users") && handleToggleActive(user)}
                        className={`flex items-center gap-1.5 text-xs font-medium ${can("users") ? "cursor-pointer hover:opacity-80" : "pointer-events-none"} transition-opacity`}
                        title={can("users") ? "Click to toggle" : ""}
                      >
                        {user.isActive ? (
                          <><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-emerald-600">Active</span></>
                        ) : (
                          <><span className="w-2 h-2 rounded-full bg-slate-400"></span><span className="text-slate-500">Suspended</span></>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {can("users") && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(user)} className="p-2 text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 rounded-lg" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(user.id, user.name)} className="p-2 text-red-600 hover:text-red-700 transition-colors bg-red-50 hover:bg-red-100 rounded-lg" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-display">{editingUser ? "Edit User" : "Invite New User"}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{editingUser ? "Update user details and role" : "Add a staff member to the platform"}</p>
              </div>
              <button onClick={() => { setIsOpen(false); setEditingUser(null); setForm(defaultForm); }} className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. Anand Kumar" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="anand@adhams.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Role <span className="text-red-500">*</span></label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary">
                  {allRoles.filter((r) => r !== "super_admin").map((r) => (
                    <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                  ))}
                </select>
                {form.role && ROLE_CONFIG[form.role as AppRole] && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Access: {ROLE_CONFIG[form.role as AppRole].modules.length} modules • {ROLE_CONFIG[form.role as AppRole].canCreate.length > 0 ? "Read + Write" : "Read-only"}
                  </p>
                )}
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Temporary Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Min. 6 characters" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-border bg-muted/20 flex justify-between items-center gap-3">
              <p className="text-xs text-muted-foreground"><span className="text-red-500">*</span> Required fields</p>
              <div className="flex gap-3">
                <button onClick={() => { setIsOpen(false); setEditingUser(null); setForm(defaultForm); }} className="px-5 py-2.5 font-medium rounded-xl hover:bg-muted text-foreground transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={isPending}
                  className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-60">
                  {isPending ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><CheckCircle2 className="w-5 h-5" /> {editingUser ? "Update User" : "Invite User"}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
