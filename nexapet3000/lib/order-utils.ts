import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { OrderData } from '@/types/order';

export const recordAdvancePaymentHistory = async (order: Partial<OrderData>) => {
  if (order.credito_processado) return;

  try {
    let customerId = order.cliente_id || '';
    
    if (!customerId && order.codigo_cliente) {
      const customersRef = collection(db, 'clientes');
      const q = query(customersRef, where('codigo', '==', order.codigo_cliente));
      const customerSnap = await getDocs(q);
      
      if (!customerSnap.empty) {
        customerId = customerSnap.docs[0].id;
      }
    }
    
    if (customerId) {
      const valorTotal = Number(String(order.valor_total || '0').replace(',', '.'));
      
      // 1. Record in unified history
      await addDoc(collection(db, 'historico_banhos'), {
        clienteId: customerId,
        clienteNome: order.cliente_nome || '',
        clienteCodigoConsulta: order.clienteCodigoConsulta || '',
        pedidoId: order.id || '',
        data: order.pago_em || new Date().toISOString(),
        status: 'Pago',
        tipo_pacote: `pgto antecipado crédito - ${order.descricao_cobranca || ''}`,
        valor: valorTotal,
        pago: true,
        faturado: true,
        createdAt: new Date().toISOString()
      });

      // 2. Create the actual credit record to be used in payments
      await addDoc(collection(db, 'creditos'), {
        clienteId: customerId,
        data_recebimento: order.pago_em || new Date().toISOString(),
        tipo_pagamento: order.tipodepagamentopixcartao || 'Pix',
        valor: valorTotal,
        valor_restante: valorTotal,
        descricao: `Crédito de Pagamento Antecipado - Pedido #${order.id || ''}`,
        createdAt: new Date().toISOString()
      });

      // 3. Mark order as processed to avoid double processing
      if (order.id) {
        const orderRef = doc(db, 'pedidos', order.id);
        await updateDoc(orderRef, {
          credito_processado: true
        });
      }
    }
  } catch (err) {
    console.error('Error recording advance payment history:', err);
  }
};
