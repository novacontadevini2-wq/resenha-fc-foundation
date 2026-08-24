/**
 * Configuração institucional do Resenha FC.
 *
 * Estes valores são placeholders da Fase 1 e devem migrar para o banco
 * (tabela de configurações) nas próximas fases. Nunca espalhe estes textos
 * pelo código — importe sempre daqui.
 */
export const CLUB = {
  shortName: "Resenha FC",
  fullName: "Resenha FC Futebol Clube",
  tagline: "Gestão oficial da pelada",
  venue: {
    name: "Arena Portal do Gol",
    address: "Endereço a configurar — Rua Exemplo, 000, Bairro",
    mapUrl: null as string | null,
  },
  schedule: {
    dayLabel: "Toda segunda-feira",
    timeLabel: "20h às 22h",
  },
  social: {
    instagram: null as string | null,
    instagramHandle: "@resenhafc",
    videos: null as string | null,
  },
} as const;
