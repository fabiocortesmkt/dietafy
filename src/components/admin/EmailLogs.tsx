import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RefreshCw, Search, Filter, Mail, X, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EmailLog {
  id: string;
  created_at: string;
  user_id: string | null;
  email_to: string;
  email_type: string;
  function_name: string;
  subject: string | null;
  status: string;
  provider_response: unknown;
  error_message: string | null;
}

const emailTypeLabels: Record<string, { label: string; color: string }> = {
  welcome: { label: "Boas-vindas", color: "bg-blue-500/20 text-blue-600 border-blue-500/30" },
  admin_new_signup: { label: "Notificação Admin", color: "bg-purple-500/20 text-purple-600 border-purple-500/30" },
  trial_started: { label: "Início Trial", color: "bg-amber-500/20 text-amber-600 border-amber-500/30" },
  trial_activated: { label: "Trial Ativado", color: "bg-green-500/20 text-green-600 border-green-500/30" },
  follow_up_day_3: { label: "Follow-up 3 dias", color: "bg-cyan-500/20 text-cyan-600 border-cyan-500/30" },
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  sent: { label: "Enviado", icon: <CheckCircle className="h-3 w-3" />, color: "bg-green-500/20 text-green-600 border-green-500/30" },
  failed: { label: "Falhou", icon: <AlertCircle className="h-3 w-3" />, color: "bg-destructive/20 text-destructive border-destructive/30" },
  pending: { label: "Pendente", icon: <Clock className="h-3 w-3" />, color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" },
};

export function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Erro ao carregar logs de email:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = searchTerm === "" || 
      log.email_to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.subject && log.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    const matchesType = filterType === "all" || log.email_type === filterType;
    
    let matchesDateFrom = true;
    let matchesDateTo = true;
    
    if (filterDateFrom) {
      matchesDateFrom = new Date(log.created_at) >= new Date(filterDateFrom);
    }
    if (filterDateTo) {
      const endDate = new Date(filterDateTo);
      endDate.setHours(23, 59, 59, 999);
      matchesDateTo = new Date(log.created_at) <= endDate;
    }

    return matchesSearch && matchesStatus && matchesType && matchesDateFrom && matchesDateTo;
  });

  const activeFiltersCount = [
    filterStatus !== "all",
    filterType !== "all",
    filterDateFrom !== "",
    filterDateTo !== "",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterType("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const getStatusInfo = (status: string) => {
    return statusConfig[status] || { 
      label: status, 
      icon: <Clock className="h-3 w-3" />, 
      color: "bg-muted text-muted-foreground border-border" 
    };
  };

  const getTypeInfo = (type: string) => {
    return emailTypeLabels[type] || { 
      label: type, 
      color: "bg-muted text-muted-foreground border-border" 
    };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Logs de Email</CardTitle>
          </div>
          <CardDescription className="mt-1">
            Histórico de todos os emails enviados pela plataforma
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadLogs}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou assunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
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
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        <Collapsible open={showFilters}>
          <CollapsibleContent>
            <div className="p-4 rounded-lg border border-border/50 bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filtros</span>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                    <X className="h-3 w-3" />
                    Limpar filtros
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sent">Enviado</SelectItem>
                      <SelectItem value="failed">Falhou</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tipo</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="welcome">Boas-vindas</SelectItem>
                      <SelectItem value="admin_new_signup">Notificação Admin</SelectItem>
                      <SelectItem value="trial_started">Início Trial</SelectItem>
                      <SelectItem value="trial_activated">Trial Ativado</SelectItem>
                      <SelectItem value="follow_up_day_3">Follow-up 3 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Data de</label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Data até</label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Logs List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum log de email encontrado</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const statusInfo = getStatusInfo(log.status);
                const typeInfo = getTypeInfo(log.email_type);

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`gap-1 ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline" className={typeInfo.color}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Para:</span>{" "}
                        <span className="font-medium">{log.email_to}</span>
                      </p>
                      {log.subject && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Assunto:</span>{" "}
                          {log.subject}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Função: {log.function_name}
                      </p>
                    </div>

                    {log.status === "failed" && log.error_message && (
                      <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                        <p className="text-xs text-destructive flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {log.error_message}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
          Mostrando {filteredLogs.length} de {logs.length} registros
        </div>
      </CardContent>
    </Card>
  );
}
