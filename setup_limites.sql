-- 1. Criar a tabela de limites
CREATE TABLE IF NOT EXISTS public.limites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria text UNIQUE NOT NULL, -- use 'geral' para o limite total do mês
  limite numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.limites ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acesso (Leitura e Inserção para o Backend)
CREATE POLICY "Permitir leitura para o backend" ON public.limites FOR SELECT USING (true);
CREATE POLICY "Permitir inserção/update para o backend" ON public.limites FOR ALL USING (true);

-- 4. Exemplo de inserção de limites (Opcional - você pode fazer via painel do Supabase)
-- INSERT INTO public.limites (categoria, limite) VALUES ('geral', 2000.00);
-- INSERT INTO public.limites (categoria, limite) VALUES ('alimentação', 500.00);
-- INSERT INTO public.limites (categoria, limite) VALUES ('lazer', 300.00);
