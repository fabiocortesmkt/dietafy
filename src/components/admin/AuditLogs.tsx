import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Search, Filter, X, Calendar, User, Shield, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: string;
  admin_user_id: string;
  admin_email: string;
  action: string;
  target_user_id: string | null;
  target_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  create: { label: "Criou usuário", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  delete: { label: "Deletou usuário", color: "bg-red-500/10 text-red-600 border-red-500/30" },
  update_email: { label: "Alterou email", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  update_password: { label: "Alterou senha", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  reset_password: { label: "Resetou senha", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  update_plan: { label: "Alterou plano", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  update_role: { label: "Alterou role", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" },
  list: { label: "Listou usuários", color: "bg-gray-500/10 text-gray-600 border-gray-500/30" },
};

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    // Text search
    const matchesSearch =
      log.admin_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.target_email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    // Action filter
    const matchesAction = filterAction === "all" || log.action === filterAction;

    // Date filter
    const logDate = new Date(log.created_at);
    const matchesDateFrom = !filterDateFrom || logDate >= new Date(filterDateFrom);
    const matchesDateTo = !filterDateTo || logDate <= new Date(filterDateTo + "T23:59:59");

    return matchesSearch && matchesAction && matchesDateFrom && matchesDateTo;
  });

  const activeFiltersCount = [
    filterAction !== "all",
    filterDateFrom,
    filterDateTo,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterAction("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const getActionInfo = (action: string) => {
    return actionLabels[action] || { label: action, color: "bg-gray-500/10 text-gray-600 border-gray-500/30" };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Log de Auditoria
            </CardTitle>
            <CardDescription>Histórico de todas as ações administrativas realizadas</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email do admin ou alvo..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 rounded-lg border border-border/50 bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Action filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium">Ação</label>
                  <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas as ações" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as ações</SelectItem>
                      <SelectItem value="create">Criou usuário</SelectItem>
                      <SelectItem value="delete">Deletou usuário</SelectItem>
                      <SelectItem value="update_email">Alterou email</SelectItem>
                      <SelectItem value="update_password">Alterou senha</SelectItem>
                      <SelectItem value="reset_password">Resetou senha</SelectItem>
                      <SelectItem value="update_plan">Alterou plano</SelectItem>
                      <SelectItem value="update_role">Alterou role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date from */}
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data de
                  </label>
                  <Input
                    type="date"
                    className="h-9"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>

                {/* Date to */}
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data até
                  </label>
                  <Input
                    type="date"
                    className="h-9"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum log de auditoria encontrado</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const actionInfo = getActionInfo(log.action);
                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      {/* Action badge */}
                      <Badge variant="outline" className={actionInfo.color}>
                        {actionInfo.label}
                      </Badge>

                      {/* Details */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{log.admin_email}</span>
                          {log.target_email && (
                            <>
                              <span className="text-muted-foreground">→</span>
                              <span>{log.target_email}</span>
                            </>
                          )}
                        </div>
                        
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {log.action === "update_plan" && log.details.new_plan && (
                              <span>Novo plano: <strong>{String(log.details.new_plan)}</strong></span>
                            )}
                            {log.action === "update_role" && (
                              <span>
                                {log.details.remove ? "Removeu" : "Adicionou"} role: <strong>{String(log.details.role)}</strong>
                              </span>
                            )}
                            {log.action === "update_email" && log.details.new_email && (
                              <span>Novo email: <strong>{String(log.details.new_email)}</strong></span>
                            )}
                            {log.action === "create" && log.details.plan_type && (
                              <span>Plano: <strong>{String(log.details.plan_type)}</strong>, Role: <strong>{String(log.details.role || "user")}</strong></span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
          Mostrando {filteredLogs.length} de {logs.length} registros
        </div>
      </CardContent>
    </Card>
  );
}
