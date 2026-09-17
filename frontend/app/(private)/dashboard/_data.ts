export type SparkPoint = { value: number }

export type Kpi = {
  label: string
  value: string
  delta: number
  data: SparkPoint[]
}

export const topKpis: Kpi[] = [
  {
    label: "Visualizações",
    value: "12.450",
    delta: 14.2,
    data: [40, 52, 45, 63, 58, 71, 80].map((value) => ({ value })),
  },
  {
    label: "Cliques em Produtos",
    value: "1.840",
    delta: 4.2,
    data: [30, 34, 31, 42, 39, 48, 55].map((value) => ({ value })),
  },
  {
    label: "Produtos Acessados",
    value: "340",
    delta: 94.2,
    data: [22, 26, 31, 44, 52, 61, 70].map((value) => ({ value })),
  },
  {
    label: "Avaliações Recentes",
    value: "48",
    delta: -0.5,
    data: [60, 58, 62, 55, 53, 50, 48].map((value) => ({ value })),
  },
]

export const secondaryKpis: Kpi[] = [
  {
    label: "Alcance Local",
    value: "45.120",
    delta: 4.2,
    data: [35, 42, 38, 51, 49, 57, 64].map((value) => ({ value })),
  },
  {
    label: "Público Único",
    value: "8.430",
    delta: 4.2,
    data: [28, 31, 34, 30, 41, 45, 52].map((value) => ({ value })),
  },
  {
    label: "Conversão Contatos",
    value: "3.120",
    delta: -4.2,
    data: [62, 59, 63, 55, 52, 49, 46].map((value) => ({ value })),
  },
]

export type EngagementPoint = {
  date: string
  visualizacoes: number
  cliques: number
}

export const engagementData: EngagementPoint[] = [
  { date: "01 Jan", visualizacoes: 4200, cliques: 600 },
  { date: "04 Jan", visualizacoes: 5200, cliques: 720 },
  { date: "08 Jan", visualizacoes: 3900, cliques: 540 },
  { date: "12 Jan", visualizacoes: 6100, cliques: 820 },
  { date: "16 Jan", visualizacoes: 7200, cliques: 960 },
  { date: "20 Jan", visualizacoes: 8400, cliques: 1080 },
  { date: "24 Jan", visualizacoes: 9200, cliques: 1180 },
  { date: "28 Jan", visualizacoes: 10400, cliques: 1320 },
]

export type ReachPoint = { date: string; alcance: number }

export const reachData: ReachPoint[] = [
  { date: "01 Jan", alcance: 22000 },
  { date: "04 Jan", alcance: 26000 },
  { date: "08 Jan", alcance: 20500 },
  { date: "12 Jan", alcance: 30000 },
  { date: "16 Jan", alcance: 34000 },
  { date: "20 Jan", alcance: 38000 },
  { date: "24 Jan", alcance: 42000 },
  { date: "28 Jan", alcance: 46000 },
]

export type TopProduct = { name: string; views: number }

export const topProducts: TopProduct[] = [
  { name: "Vaso de Cerâmica Minimalista", views: 1240 },
  { name: "Conjunto de Pratos Provençal", views: 980 },
  { name: "Quadro Decorativo Abstrato", views: 850 },
  { name: "Luminária de Mesa Industrial", views: 620 },
]

export type Region = { name: string; reach: number; share: number }

export const regions: Region[] = [
  { name: "Zona Sul - SP", reach: 12400, share: 100 },
  { name: "Zona Oeste - SP", reach: 9100, share: 73 },
  { name: "Centro - SP", reach: 6200, share: 50 },
]

export type TrafficSource = {
  name: string
  visits: number
  conversion: number
}

export const trafficSources: TrafficSource[] = [
  { name: "Instagram Orgânico", visits: 12450, conversion: 4.8 },
  { name: "Google Search (SEO)", visits: 9180, conversion: 3.2 },
  { name: "WhatsApp Direto", visits: 5200, conversion: 8.5 },
  { name: "Anúncios Meta Ads", visits: 3400, conversion: 5.1 },
]

export type Review = {
  name: string
  date: string
  rating: number
  comment: string
}

export const recentReviews: Review[] = [
  {
    name: "Mariana Souza",
    date: "Hoje",
    rating: 5,
    comment:
      "Excelente qualidade de entrega. O vaso minimalista é maravilhoso!",
  },
  {
    name: "Roberto Alves",
    date: "Ontem",
    rating: 4,
    comment:
      "O produto veio bem embalado. Muito bonito o conjunto de pratos.",
  },
  {
    name: "Luciana Lima",
    date: "Há 3 dias",
    rating: 5,
    comment:
      "Adorei a luminária, combinou perfeitamente com meu escritório.",
  },
]
