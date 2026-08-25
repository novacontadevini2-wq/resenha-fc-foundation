import { Filter, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PlayerStatusFilter = "all" | "active" | "inactive" | "suspended";

interface PlayerFiltersProps {
  search: string;
  status: PlayerStatusFilter;
  position: string;
  positions: { id: string; code: string; name: string }[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PlayerStatusFilter) => void;
  onPositionChange: (value: string) => void;
}

export function PlayerFilters({ search, status, position, positions, onSearchChange, onStatusChange, onPositionChange }: PlayerFiltersProps) {
  return (
    <div className="card-surface grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
      <label className="relative block">
        <span className="sr-only">Pesquisar jogador</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar por nome, apelido ou número" className="pl-9" />
      </label>
      <label className="flex items-center gap-2">
        <Filter className="size-4 shrink-0 text-muted-foreground sm:hidden" />
        <span className="sr-only">Filtrar por status</span>
        <Select value={status} onValueChange={(value) => onStatusChange(value as PlayerStatusFilter)}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="suspended">Suspensos</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label>
        <span className="sr-only">Filtrar por posição</span>
        <Select value={position} onValueChange={onPositionChange}>
          <SelectTrigger><SelectValue placeholder="Posição" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as posições</SelectItem>
            {positions.map((item) => <SelectItem key={item.id} value={item.code}>{item.code} · {item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}
