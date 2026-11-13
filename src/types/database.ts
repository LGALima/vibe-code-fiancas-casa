// Gerado por supabase/gerar-tipos.mjs a partir de supabase/migrations/.
// Não edite à mão: rode `npm run db:types`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categorias: {
        Row: {
          id: string;
          espaco_id: string;
          nome: string;
          tipo: string;
          cor: string | null;
          icone: string | null;
          ativa: boolean;
        };
        Insert: {
          id?: string;
          espaco_id: string;
          nome: string;
          tipo: string;
          cor?: string | null;
          icone?: string | null;
          ativa?: boolean;
        };
        Update: {
          id?: string;
          espaco_id?: string;
          nome?: string;
          tipo?: string;
          cor?: string | null;
          icone?: string | null;
          ativa?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "categorias_espaco_id_fkey";
            columns: ["espaco_id"];
            isOneToOne: false;
            referencedRelation: "espacos";
            referencedColumns: ["id"];
          },
        ];
      };
      ciclos: {
        Row: {
          id: string;
          espaco_id: string;
          nome: string;
          data_inicio: string;
          data_fim: string;
          ciclo_origem_id: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          espaco_id: string;
          nome: string;
          data_inicio: string;
          data_fim: string;
          ciclo_origem_id?: string | null;
          criado_em?: string;
        };
        Update: {
          id?: string;
          espaco_id?: string;
          nome?: string;
          data_inicio?: string;
          data_fim?: string;
          ciclo_origem_id?: string | null;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ciclos_espaco_id_ciclo_origem_id_fkey";
            columns: ["espaco_id","ciclo_origem_id"];
            isOneToOne: false;
            referencedRelation: "ciclos";
            referencedColumns: ["espaco_id","id"];
          },
          {
            foreignKeyName: "ciclos_espaco_id_fkey";
            columns: ["espaco_id"];
            isOneToOne: false;
            referencedRelation: "espacos";
            referencedColumns: ["id"];
          },
        ];
      };
      configuracoes: {
        Row: {
          espaco_id: string;
          dia_inicio_ciclo: number;
          moeda: string;
        };
        Insert: {
          espaco_id: string;
          dia_inicio_ciclo?: number;
          moeda?: string;
        };
        Update: {
          espaco_id?: string;
          dia_inicio_ciclo?: number;
          moeda?: string;
        };
        Relationships: [
          {
            foreignKeyName: "configuracoes_espaco_id_fkey";
            columns: ["espaco_id"];
            isOneToOne: true;
            referencedRelation: "espacos";
            referencedColumns: ["id"];
          },
        ];
      };
      espacos: {
        Row: {
          id: string;
          nome: string;
          codigo_convite: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          codigo_convite?: string;
          criado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          codigo_convite?: string;
          criado_em?: string;
        };
        Relationships: [];
      };
      formas_pagamento: {
        Row: {
          id: string;
          espaco_id: string;
          nome: string;
          eh_credito: boolean;
          ativa: boolean;
        };
        Insert: {
          id?: string;
          espaco_id: string;
          nome: string;
          eh_credito?: boolean;
          ativa?: boolean;
        };
        Update: {
          id?: string;
          espaco_id?: string;
          nome?: string;
          eh_credito?: boolean;
          ativa?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_espaco_id_fkey";
            columns: ["espaco_id"];
            isOneToOne: false;
            referencedRelation: "espacos";
            referencedColumns: ["id"];
          },
        ];
      };
      lancamentos: {
        Row: {
          id: string;
          espaco_id: string;
          ciclo_id: string;
          tipo: string;
          descricao: string;
          recorrente: boolean;
          estimativa: number | null;
          valor_real: number | null;
          categoria_id: string;
          forma_pagamento_id: string;
          data: string;
          parcela_atual: number | null;
          total_parcelas: number | null;
          grupo_id: string | null;
          vinculado_id: string | null;
          observacao: string | null;
          criado_por: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          espaco_id: string;
          ciclo_id: string;
          tipo: string;
          descricao: string;
          recorrente?: boolean;
          estimativa?: number | null;
          valor_real?: number | null;
          categoria_id: string;
          forma_pagamento_id: string;
          data: string;
          parcela_atual?: number | null;
          total_parcelas?: number | null;
          grupo_id?: string | null;
          vinculado_id?: string | null;
          observacao?: string | null;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          espaco_id?: string;
          ciclo_id?: string;
          tipo?: string;
          descricao?: string;
          recorrente?: boolean;
          estimativa?: number | null;
          valor_real?: number | null;
          categoria_id?: string;
          forma_pagamento_id?: string;
          data?: string;
          parcela_atual?: number | null;
          total_parcelas?: number | null;
          grupo_id?: string | null;
          vinculado_id?: string | null;
          observacao?: string | null;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lancamentos_espaco_id_categoria_id_fkey";
            columns: ["espaco_id","categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["espaco_id","id"];
          },
          {
            foreignKeyName: "lancamentos_espaco_id_ciclo_id_fkey";
            columns: ["espaco_id","ciclo_id"];
            isOneToOne: false;
            referencedRelation: "ciclos";
            referencedColumns: ["espaco_id","id"];
          },
          {
            foreignKeyName: "lancamentos_espaco_id_fkey";
            columns: ["espaco_id"];
            isOneToOne: false;
            referencedRelation: "espacos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lancamentos_espaco_id_forma_pagamento_id_fkey";
            columns: ["espaco_id","forma_pagamento_id"];
            isOneToOne: false;
            referencedRelation: "formas_pagamento";
            referencedColumns: ["espaco_id","id"];
          },
          {
            foreignKeyName: "lancamentos_espaco_id_vinculado_id_fkey";
            columns: ["espaco_id","vinculado_id"];
            isOneToOne: false;
            referencedRelation: "lancamentos";
            referencedColumns: ["espaco_id","id"];
          },
        ];
      };
      membros: {
        Row: {
          espaco_id: string;
          user_id: string;
          nome_exibicao: string | null;
          criado_em: string;
        };
        Insert: {
          espaco_id: string;
          user_id: string;
          nome_exibicao?: string | null;
          criado_em?: string;
        };
        Update: {
          espaco_id?: string;
          user_id?: string;
          nome_exibicao?: string | null;
          criado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "membros_espaco_id_fkey";
            columns: ["espaco_id"];
            isOneToOne: false;
            referencedRelation: "espacos";
            referencedColumns: ["id"];
          },
        ];
      };
      preferencias_usuario: {
        Row: {
          user_id: string;
          espaco_ativo_id: string | null;
          atualizado_em: string;
        };
        Insert: {
          user_id?: string;
          espaco_ativo_id?: string | null;
          atualizado_em?: string;
        };
        Update: {
          user_id?: string;
          espaco_ativo_id?: string | null;
          atualizado_em?: string;
        };
        Relationships: [
          {
            foreignKeyName: "preferencias_usuario_espaco_ativo_id_fkey";
            columns: ["espaco_ativo_id"];
            isOneToOne: false;
            referencedRelation: "espacos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      criar_espaco: {
        Args: {
          p_nome: string;
          p_nome_exibicao?: string;
        };
        Returns: string;
      };
      eh_membro: {
        Args: {
          p_espaco_id: string;
        };
        Returns: boolean;
      };
      entrar_no_espaco: {
        Args: {
          p_codigo: string;
          p_nome_exibicao?: string;
        };
        Returns: string;
      };
      inserir_cadastros_padrao: {
        Args: {
          p_espaco_id: string;
        };
        Returns: undefined;
      };
      marcar_espaco_ativo: {
        Args: {
          p_espaco_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type Public = Database["public"];

/** Linha de uma tabela. Ex.: Tables<"lancamentos"> */
export type Tables<T extends keyof Public["Tables"]> =
  Public["Tables"][T]["Row"];
/** Dados para inserir. Ex.: TablesInsert<"lancamentos"> */
export type TablesInsert<T extends keyof Public["Tables"]> =
  Public["Tables"][T]["Insert"];
/** Dados para atualizar. Ex.: TablesUpdate<"lancamentos"> */
export type TablesUpdate<T extends keyof Public["Tables"]> =
  Public["Tables"][T]["Update"];
