-- Copie e cole este código no SQL Editor do seu Supabase para criar a tabela de gastos

CREATE TABLE IF NOT EXISTS public.gastos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  valor numeric NOT NULL,
  categoria text NOT NULL,
  descricao text NOT NULL,
  data date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) - opcional para desenvolvimento inicial, mas boa prática
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer pessoa (anon) insira dados via API (o Backend vai usar a chave de serviço ou anon)
CREATE POLICY "Permitir inserção anônima" ON public.gastos
  FOR INSERT WITH CHECK (true);

-- Política para permitir que qualquer pessoa (anon) leia os dados (para o dashboard)
CREATE POLICY "Permitir leitura anônima" ON public.gastos
  FOR SELECT USING (true);
