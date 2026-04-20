/**
 * Test script for inventory deduction functionality
 * Run with: node test-inventory-deduction.js
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5200/api';

// Test data - replace with actual values from your database
const testData = {
  product_id: 1,        // Replace with actual product ID that has ingredients
  quantity_ordered: 2,  // Number of products to order
  branch_id: 1          // Replace with actual branch ID
};

async function testInventoryDeduction() {
  try {
    console.log('🧪 Testing Inventory Deduction Function');
    console.log('=====================================');
    console.log('Test Data:', testData);
    console.log('');

    // First, let's check current inventory for the product
    console.log('📊 Checking current inventory...');
    const inventoryResponse = await fetch(`${API_BASE_URL}/inventory?branch_id=${testData.branch_id}`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE', // Replace with actual token
        'Content-Type': 'application/json'
      }
    });

    if (inventoryResponse.ok) {
      const inventory = await inventoryResponse.json();
      console.log('Current inventory items:');
      inventory.forEach(item => {
        console.log(`  - ${item.item_name}: ${item.quantity} units (${item.total_servings} servings), Status: ${item.status}`);
      });
    }

    console.log('');
    console.log('🔄 Testing inventory deduction...');

    // Test the inventory deduction
    const response = await fetch(`${API_BASE_URL}/pos/deduct-inventory`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE', // Replace with actual token
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Inventory deduction successful!');
      console.log('📋 Deduction Details:');
      result.data.deductions.forEach(deduction => {
        console.log(`  - ${deduction.itemName}:`);
        console.log(`    Previous: ${deduction.previousQuantity} units`);
        console.log(`    Deducted: ${deduction.unitsDeducted} units`);
        console.log(`    New: ${deduction.newQuantity} units`);
        console.log(`    Servings deducted: ${deduction.servingsDeducted}`);
        console.log(`    New status: ${deduction.newStatus}`);
      });
    } else {
      console.log('❌ Inventory deduction failed:');
      console.log('Error:', result.message);
    }

    console.log('');
    console.log('📊 Checking updated inventory...');

    // Check inventory again to see the changes
    const updatedInventoryResponse = await fetch(`${API_BASE_URL}/inventory?branch_id=${testData.branch_id}`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE', // Replace with actual token
        'Content-Type': 'application/json'
      }
    });

    if (updatedInventoryResponse.ok) {
      const updatedInventory = await updatedInventoryResponse.json();
      console.log('Updated inventory items:');
      updatedInventory.forEach(item => {
        console.log(`  - ${item.item_name}: ${item.quantity} units (${item.total_servings} servings), Status: ${item.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testInventoryDeduction();