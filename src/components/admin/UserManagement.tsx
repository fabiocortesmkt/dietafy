import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Key, Mail, Crown, Shield, RefreshCw, Search, Eye, EyeOff } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
  plan_type: string;
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
  onboarding_completed: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newPlan, setNewPlan] = useState<"free" | "premium">("free");
  const [newRole, setNewRole] = useState<"user" | "admin" | "moderator">("user");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit password dialog
  const [passwordDialogUser, setPasswordDialogUser] = useState<User | null>(null);
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Edit email dialog
  const [emailDialogUser, setEmailDialogUser] = useState<User | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");

  // Delete confirmation dialog
  const [deleteDialogUser, setDeleteDialogUser] = useState<User | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list" },
      });

      if (error) throw error;
      setUsers(data.users || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      toast.error("Email e senha são obrigatórios");
      return;
    }

    setActionLoading("create");
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create",
          email: newEmail,
          password: newPassword,
          full_name: newName || newEmail,
          plan_type: newPlan,
          role: newRole,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Usuário criado com sucesso!");
      setCreateOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewPlan("free");
      setNewRole("user");
      loadUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao criar usuário";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Usuário deletado com sucesso!");
      setDeleteDialogUser(null);
      loadUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao deletar usuário";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateEmail = async (userId: string, email: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_email", userId, newEmail: email },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Email atualizado com sucesso!");
      setEmailDialogUser(null);
      setNewUserEmail("");
      loadUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar email";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePassword = async (userId: string, password: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_password", userId, newPassword: password },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Senha atualizada com sucesso!");
      setPasswordDialogUser(null);
      setNewUserPassword("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar senha";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "reset_password", userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Senha resetada! Nova senha temporária: ${data.tempPassword}`, {
        duration: 10000,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao resetar senha";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePlan = async (userId: string, planType: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_plan", userId, planType },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Plano atualizado para ${planType}!`);
      loadUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar plano";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (userId: string, role: string, remove: boolean = false) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_role", userId, role, remove },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(remove ? `Role ${role} removido!` : `Role ${role} adicionado!`);
      loadUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar role";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Gestão de Usuários</CardTitle>
            <CardDescription>Cadastrar, editar e remover usuários da plataforma</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Usuário</DialogTitle>
                  <DialogDescription>
                    Preencha os dados para criar um novo usuário na plataforma.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="usuario@exemplo.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha *</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Senha inicial"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input
                      placeholder="Nome do usuário"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plano</Label>
                      <Select value={newPlan} onValueChange={(v) => setNewPlan(v as "free" | "premium")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newRole} onValueChange={(v) => setNewRole(v as "user" | "admin" | "moderator")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="moderator">Moderador</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateUser} disabled={actionLoading === "create"}>
                    {actionLoading === "create" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Usuário
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{user.full_name}</p>
                      {user.roles.includes("admin") && (
                        <Badge variant="destructive" className="text-[10px]">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {user.roles.includes("moderator") && (
                        <Badge variant="secondary" className="text-[10px]">Mod</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Criado: {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      {user.last_sign_in_at && (
                        <> • Último login: {new Date(user.last_sign_in_at).toLocaleDateString("pt-BR")}</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Plan selector */}
                    <Select
                      value={user.plan_type}
                      onValueChange={(v) => handleUpdatePlan(user.id, v)}
                      disabled={actionLoading === user.id}
                    >
                      <SelectTrigger className="w-[110px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="premium">
                          <span className="flex items-center gap-1">
                            <Crown className="h-3 w-3" /> Premium
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Actions */}
                    <div className="flex gap-1">
                      {/* Email dialog */}
                      <Dialog
                        open={emailDialogUser?.id === user.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setEmailDialogUser(null);
                            setNewUserEmail("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEmailDialogUser(user);
                              setNewUserEmail(user.email);
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Alterar Email</DialogTitle>
                            <DialogDescription>
                              Alterar email de {user.full_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <Label>Novo Email</Label>
                            <Input
                              type="email"
                              value={newUserEmail}
                              onChange={(e) => setNewUserEmail(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEmailDialogUser(null)}>
                              Cancelar
                            </Button>
                            <Button
                              onClick={() => handleUpdateEmail(user.id, newUserEmail)}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Salvar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Password dialog */}
                      <Dialog
                        open={passwordDialogUser?.id === user.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setPasswordDialogUser(null);
                            setNewUserPassword("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPasswordDialogUser(user)}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Alterar Senha</DialogTitle>
                            <DialogDescription>
                              Definir nova senha para {user.full_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
                            <div>
                              <Label>Nova Senha</Label>
                              <div className="relative mt-2">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  value={newUserPassword}
                                  onChange={(e) => setNewUserPassword(e.target.value)}
                                  placeholder="Digite a nova senha"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <div className="flex justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResetPassword(user.id)}
                                disabled={actionLoading === user.id}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Gerar senha temporária
                              </Button>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setPasswordDialogUser(null)}>
                              Cancelar
                            </Button>
                            <Button
                              onClick={() => handleUpdatePassword(user.id, newUserPassword)}
                              disabled={actionLoading === user.id || !newUserPassword}
                            >
                              {actionLoading === user.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Salvar Senha
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Toggle admin role */}
                      <Button
                        variant={user.roles.includes("admin") ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          handleUpdateRole(user.id, "admin", user.roles.includes("admin"))
                        }
                        disabled={actionLoading === user.id}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>

                      {/* Delete dialog */}
                      <Dialog
                        open={deleteDialogUser?.id === user.id}
                        onOpenChange={(open) => {
                          if (!open) setDeleteDialogUser(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setDeleteDialogUser(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirmar Exclusão</DialogTitle>
                            <DialogDescription>
                              Tem certeza que deseja excluir o usuário <strong>{user.full_name}</strong> ({user.email})?
                              Esta ação não pode ser desfeita.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogUser(null)}>
                              Cancelar
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Excluir Usuário
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
