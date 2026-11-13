// Gera src/types/database.ts a partir das migrações, no mesmo formato do
// `supabase gen types typescript`, sem precisar de Docker nem login.
// Rode com: npm run db:types

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { criarBanco } from "./tests/banco.mjs";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const destino = path.join(raiz, "src", "types", "database.ts");

const TIPOS_TS = {
  uuid: "string",
  text: "string",
  varchar: "string",
  bpchar: "string",
  date: "string",
  timestamp: "string",
  timestamptz: "string",
  time: "string",
  int2: "number",
  int4: "number",
  int8: "number",
  float4: "number",
  float8: "number",
  numeric: "number",
  bool: "boolean",
  json: "Json",
  jsonb: "Json",
  void: "undefined",
};

function tipoTs(pgTipo) {
  const ts = TIPOS_TS[pgTipo];
  if (!ts) throw new Error(`Tipo do Postgres sem mapeamento: ${pgTipo}`);
  return ts;
}

const { db } = await criarBanco();

const { rows: colunas } = await db.query(`
  select c.relname as tabela, c.relkind = 'v' as eh_view, a.attname as coluna, t.typname as tipo,
         not a.attnotnull as nulo,
         (a.atthasdef or a.attidentity <> '') as tem_default
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  where n.nspname = 'public' and c.relkind in ('r', 'v')
    and a.attnum > 0 and not a.attisdropped
  order by c.relname, a.attnum`);

const { rows: fks } = await db.query(`
  select con.conname as nome, src.relname as tabela, ref.relname as referencia,
         (select array_agg(a.attname order by k.ord) from unnest(con.conkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as colunas,
         (select array_agg(a.attname order by k.ord) from unnest(con.confkey) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum) as colunas_ref,
         exists (
           select 1 from pg_constraint u
           where u.conrelid = con.conrelid and u.contype in ('p', 'u')
             and (select array_agg(x order by x) from unnest(u.conkey) x)
               = (select array_agg(x order by x) from unnest(con.conkey) x)
         ) as um_para_um
  from pg_constraint con
  join pg_class src on src.oid = con.conrelid
  join pg_class ref on ref.oid = con.confrelid
  join pg_namespace ns on ns.oid = src.relnamespace
  join pg_namespace nr on nr.oid = ref.relnamespace
  where con.contype = 'f' and ns.nspname = 'public' and nr.nspname = 'public'
  order by src.relname, con.conname`);

const { rows: funcoes } = await db.query(`
  select p.proname as nome, p.proargnames as args, p.pronargdefaults as n_defaults,
         (select array_agg(t.typname order by i.ord) from unnest(p.proargtypes) with ordinality i(oid, ord)
            join pg_type t on t.oid = i.oid) as tipos_args,
         rt.typname as retorno
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_type rt on rt.oid = p.prorettype
  where n.nspname = 'public' and rt.typname <> 'trigger'
  order by p.proname`);

await db.close();

const tabelas = new Map();
const views = new Map();
for (const c of colunas) {
  const destinoMapa = c.eh_view ? views : tabelas;
  if (!destinoMapa.has(c.tabela)) destinoMapa.set(c.tabela, []);
  destinoMapa.get(c.tabela).push(c);
}

const ind = (n) => "  ".repeat(n);
const linhas = [];
const out = (n, texto) => linhas.push(ind(n) + texto);

out(0, "// Gerado por supabase/gerar-tipos.mjs a partir de supabase/migrations/.");
out(0, "// Não edite à mão: rode `npm run db:types`.");
out(0, "");
out(0, "export type Json =");
out(1, "| string");
out(1, "| number");
out(1, "| boolean");
out(1, "| null");
out(1, "| { [key: string]: Json | undefined }");
out(1, "| Json[];");
out(0, "");
out(0, "export type Database = {");
out(1, "public: {");
out(2, "Tables: {");

for (const [tabela, cols] of tabelas) {
  out(3, `${tabela}: {`);
  out(4, "Row: {");
  for (const c of cols) {
    out(5, `${c.coluna}: ${tipoTs(c.tipo)}${c.nulo ? " | null" : ""};`);
  }
  out(4, "};");
  out(4, "Insert: {");
  for (const c of cols) {
    const opcional = c.nulo || c.tem_default ? "?" : "";
    out(5, `${c.coluna}${opcional}: ${tipoTs(c.tipo)}${c.nulo ? " | null" : ""};`);
  }
  out(4, "};");
  out(4, "Update: {");
  for (const c of cols) {
    out(5, `${c.coluna}?: ${tipoTs(c.tipo)}${c.nulo ? " | null" : ""};`);
  }
  out(4, "};");
  const rels = fks.filter((f) => f.tabela === tabela);
  if (rels.length === 0) {
    out(4, "Relationships: [];");
  } else {
    out(4, "Relationships: [");
    for (const f of rels) {
      out(5, "{");
      out(6, `foreignKeyName: ${JSON.stringify(f.nome)};`);
      out(6, `columns: ${JSON.stringify(f.colunas)};`);
      out(6, `isOneToOne: ${f.um_para_um};`);
      out(6, `referencedRelation: ${JSON.stringify(f.referencia)};`);
      out(6, `referencedColumns: ${JSON.stringify(f.colunas_ref)};`);
      out(5, "},");
    }
    out(4, "];");
  }
  out(3, "};");
}

out(2, "};");
out(2, "Views: {");
if (views.size === 0) out(3, "[_ in never]: never;");
for (const [view, cols] of views) {
  // Como o `supabase gen types`: colunas de view são sempre anuláveis.
  out(3, `${view}: {`);
  out(4, "Row: {");
  for (const c of cols) out(5, `${c.coluna}: ${tipoTs(c.tipo)} | null;`);
  out(4, "};");
  out(4, "Relationships: [];");
  out(3, "};");
}
out(2, "};");
out(2, "Functions: {");
for (const f of funcoes) {
  const nomes = f.args ?? [];
  const tipos = f.tipos_args ?? [];
  const primeiroOpcional = tipos.length - f.n_defaults;
  out(3, `${f.nome}: {`);
  if (tipos.length === 0) {
    out(4, "Args: never;");
  } else {
    out(4, "Args: {");
    tipos.forEach((tipo, i) => {
      out(5, `${nomes[i]}${i >= primeiroOpcional ? "?" : ""}: ${tipoTs(tipo)};`);
    });
    out(4, "};");
  }
  out(4, `Returns: ${tipoTs(f.retorno)};`);
  out(3, "};");
}
out(2, "};");
out(2, "Enums: {");
out(3, "[_ in never]: never;");
out(2, "};");
out(2, "CompositeTypes: {");
out(3, "[_ in never]: never;");
out(2, "};");
out(1, "};");
out(0, "};");
out(0, "");
out(0, 'type Public = Database["public"];');
out(0, "");
out(0, "/** Linha de uma tabela. Ex.: Tables<\"lancamentos\"> */");
out(0, 'export type Tables<T extends keyof Public["Tables"]> =');
out(1, 'Public["Tables"][T]["Row"];');
out(0, "/** Dados para inserir. Ex.: TablesInsert<\"lancamentos\"> */");
out(0, 'export type TablesInsert<T extends keyof Public["Tables"]> =');
out(1, 'Public["Tables"][T]["Insert"];');
out(0, "/** Dados para atualizar. Ex.: TablesUpdate<\"lancamentos\"> */");
out(0, 'export type TablesUpdate<T extends keyof Public["Tables"]> =');
out(1, 'Public["Tables"][T]["Update"];');

await writeFile(destino, linhas.join("\n") + "\n", "utf8");
console.log(
  `Tipos gerados em ${path.relative(raiz, destino)}: ${tabelas.size} tabelas, ${views.size} views, ${funcoes.length} funções.`,
);
