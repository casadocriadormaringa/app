export interface OrderData {
  id?: string;
  cliente_id?: string;
  codigo_cliente: string;
  cliente_nome: string;
  data_cobranca: string;
  descricao_cobranca: string;
  status_pagamento: string;
  telefone_cliente: string;
  endereco_cliente?: string;
  valor_total: string | number;
  link_de_pagamento: string;
  pago_em: string;
  pgtoenviado_dia: string;
  pgtogerado_dia: string;
  tipodepagamentopixcartao: string;
  tipo_cobranca?: 'cobranca' | 'pgto_antecipado';
  credito_processado?: boolean;
  clienteCodigoConsulta?: string;
  createdAt?: string;
}
