import { createTransaction } from './src/controllers/posController.js';

async function testCreateTransaction() {
  try {
    console.log('Testing createTransaction function...');

    const result = await createTransaction(2, [
      { product_id: 2, price: 85.00, quantity: 2 },
      { product_id: 3, price: 50.00, quantity: 1 }
    ], {
      cashierId: 1,
      orderType: 'dine-in'
    });

    console.log('✅ Transaction created successfully:', result);
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testCreateTransaction();