import {
  Baby,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Cat,
  Dog,
  Droplets,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  Handshake,
  HeartPulse,
  House,
  PartyPopper,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  Tv,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** As 10 cores que uma categoria pode ter (as mesmas em todos os gráficos). */
export const PALETA = [
  { valor: "#2563EB", nome: "Azul" },
  { valor: "#0891B2", nome: "Ciano" },
  { valor: "#0D9488", nome: "Verde-água" },
  { valor: "#16A34A", nome: "Verde" },
  { valor: "#65A30D", nome: "Verde-limão" },
  { valor: "#D97706", nome: "Laranja" },
  { valor: "#DC2626", nome: "Vermelho" },
  { valor: "#DB2777", nome: "Rosa" },
  { valor: "#7C3AED", nome: "Roxo" },
  { valor: "#475569", nome: "Cinza" },
] as const;

export const CORES = PALETA.map((c) => c.valor) as [string, ...string[]];

/** Ícones disponíveis para categorias. A chave é o que fica salvo no banco. */
export const ICONES = {
  house: { Icone: House, nome: "Casa" },
  "shopping-cart": { Icone: ShoppingCart, nome: "Mercado" },
  utensils: { Icone: Utensils, nome: "Comida" },
  car: { Icone: Car, nome: "Carro" },
  fuel: { Icone: Fuel, nome: "Combustível" },
  bus: { Icone: Bus, nome: "Transporte" },
  "heart-pulse": { Icone: HeartPulse, nome: "Saúde" },
  pill: { Icone: Pill, nome: "Farmácia" },
  dog: { Icone: Dog, nome: "Cachorro" },
  cat: { Icone: Cat, nome: "Gato" },
  baby: { Icone: Baby, nome: "Criança" },
  "graduation-cap": { Icone: GraduationCap, nome: "Educação" },
  "book-open": { Icone: BookOpen, nome: "Livros" },
  tv: { Icone: Tv, nome: "Streaming" },
  "gamepad-2": { Icone: Gamepad2, nome: "Jogos" },
  "party-popper": { Icone: PartyPopper, nome: "Lazer" },
  plane: { Icone: Plane, nome: "Viagem" },
  shirt: { Icone: Shirt, nome: "Roupas" },
  gift: { Icone: Gift, nome: "Presentes" },
  dumbbell: { Icone: Dumbbell, nome: "Academia" },
  smartphone: { Icone: Smartphone, nome: "Celular" },
  wifi: { Icone: Wifi, nome: "Internet" },
  zap: { Icone: Zap, nome: "Luz" },
  droplets: { Icone: Droplets, nome: "Água" },
  wrench: { Icone: Wrench, nome: "Manutenção" },
  receipt: { Icone: Receipt, nome: "Contas" },
  "hand-coins": { Icone: HandCoins, nome: "Empréstimo" },
  handshake: { Icone: Handshake, nome: "Acerto" },
  briefcase: { Icone: Briefcase, nome: "Trabalho" },
  sparkles: { Icone: Sparkles, nome: "Extra" },
  "piggy-bank": { Icone: PiggyBank, nome: "Poupança" },
  wallet: { Icone: Wallet, nome: "Carteira" },
  tag: { Icone: Tag, nome: "Outros" },
} as const satisfies Record<string, { Icone: LucideIcon; nome: string }>;

export type NomeIcone = keyof typeof ICONES;
export const NOMES_ICONES = Object.keys(ICONES) as [NomeIcone, ...NomeIcone[]];

export function iconeDaCategoria(nome: string | null | undefined): LucideIcon {
  return nome && nome in ICONES ? ICONES[nome as NomeIcone].Icone : Tag;
}

export const TIPOS_CATEGORIA = [
  { valor: "gasto", rotulo: "Gasto" },
  { valor: "ganho", rotulo: "Ganho" },
  { valor: "ambos", rotulo: "Ambos" },
] as const;
