import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { price, description, nsu, nomedocliente, telefone } = body;

    // Converte valor para número, lidando com vírgula se necessário
    const cleanPrice = typeof price === 'string' ? price.replace(',', '.') : price;
    const numericPrice = parseFloat(cleanPrice);

    if (isNaN(numericPrice)) {
      return NextResponse.json({ error: 'Valor total inválido' }, { status: 400 });
    }

    const payload = {
      handle: "recblima",
      items: [
        {
          description: description || "Cobrança PetControl",
          quantity: 1,
          price: Math.round(numericPrice * 100)
        }
      ],
      order_nsu: nsu,
      webhook_url: "https://infinitepaywebhook-j7xu3kuvza-uc.a.run.app",
      customer: {
        name: nomedocliente,
        email: "casadocriadormaringa@gmail.com",
        phone_number: telefone
      }
    };

    const response = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
