-- El consentimiento empieza desactivado: no se envía nada a socios existentes
-- hasta que KAHA documente su autorización en la ficha.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS recibos_whatsapp_consentimiento boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.recibos_whatsapp (
  pago_id uuid PRIMARY KEY REFERENCES public.pagos(id) ON DELETE CASCADE,
  estado text NOT NULL CHECK (estado IN ('ENVIANDO', 'ACEPTADO', 'FALLIDO', 'INCIERTO')),
  meta_message_id text,
  error_codigo text,
  creado_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recibos_whatsapp ENABLE ROW LEVEL SECURITY;
-- La app actual consulta Supabase con anon; sólo expone estado, sin número ni texto.
GRANT SELECT ON public.recibos_whatsapp TO anon, authenticated;
GRANT ALL ON public.recibos_whatsapp TO service_role;
CREATE POLICY "Leer estado de recibos" ON public.recibos_whatsapp
  FOR SELECT TO anon, authenticated USING (true);
-- INSERT/UPDATE quedan reservados a service_role, que ignora RLS.
