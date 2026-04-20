# Inventory Deduction System

This document describes the inventory deduction functionality for POS orders in the restaurant management system.

## Overview

When a product is ordered through the POS system, the system automatically deducts the required ingredients from inventory based on the product's recipe defined in the `menu_inventory` table.

## Database Tables

### menu_inventory
- `menu_inventory_id` (PK)
- `product_id` (FK → products.product_id)
- `ingredient_id` (FK → inventory.inventory_id)
- `servings_required` (decimal) - Number of servings needed per product

### inventory
- `inventory_id` (PK)
- `item_name`
- `quantity` (INT) - Number of units in stock
- `servings_per_unit` (INT) - How many servings per unit
- `total_servings` (INT) - Calculated: quantity × servings_per_unit
- `low_stock_threshold` - Minimum quantity before low stock warning
- `status` (enum) - 'available', 'unavailable', 'low_stock', 'out_of_stock'
- `branch_id` - Branch-specific inventory

## Core Function: `deductInventoryForOrder`

### Parameters
- `productId` (number) - The product being ordered
- `quantityOrdered` (number) - How many of the product
- `branchId` (number) - Which branch's inventory to deduct from
- `connection` (MySQL connection) - For transaction support

### Process Flow

1. **Get Ingredients**: Query `menu_inventory` for all ingredients needed for the product
2. **Validate Stock**: For each ingredient, check if sufficient servings are available
3. **Calculate Deductions**: Compute units to deduct based on servings required
4. **Update Inventory**: Deduct from `inventory.quantity` and update status
5. **Return Results**: Success/failure with detailed deduction information

### Status Logic
- `out_of_stock`: quantity ≤ 0
- `low_stock`: quantity ≤ low_stock_threshold
- `available`: quantity > low_stock_threshold

## API Endpoints

### Test Endpoint: `POST /api/pos/deduct-inventory`

Test the inventory deduction functionality independently.

**Request Body:**
```json
{
  "product_id": 1,
  "quantity_ordered": 2,
  "branch_id": 1
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Inventory deducted successfully",
  "data": {
    "productId": 1,
    "quantityOrdered": 2,
    "branchId": 1,
    "deductions": [
      {
        "inventoryId": 5,
        "itemName": "Chicken Breast",
        "previousQuantity": 10,
        "newQuantity": 8,
        "unitsDeducted": 2,
        "servingsDeducted": 4,
        "newStatus": "available"
      }
    ]
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Insufficient stock for Chicken Breast. Available: 5, Required: 8",
  "data": {
    "productId": 1,
    "quantityOrdered": 2,
    "branchId": 1
  }
}
```

## Integration with POS

The `completeSale` function automatically calls `deductInventoryForOrder` for each product in the cart. The process:

1. Validate all products have sufficient ingredients
2. Deduct inventory for all products
3. Create transaction record
4. Commit transaction (or rollback on error)

## Error Handling

- **No Ingredients**: Product has no linked ingredients in `menu_inventory`
- **Missing Inventory**: Ingredient not found in branch inventory
- **Insufficient Stock**: Available servings < required servings
- **Transaction Rollback**: All changes reverted if any deduction fails

## Testing

Run the test script to verify functionality:

```bash
cd backend
node test-inventory-deduction.js
```

**Note:** Update the test script with:
- Actual JWT token
- Valid product_id that has ingredients
- Valid branch_id
- Sufficient inventory quantities

## Example Calculation

**Product:** Chicken Sandwich
- Requires: 2 servings of Chicken Breast per sandwich
- Order: 3 sandwiches
- Total servings needed: 2 × 3 = 6 servings

**Inventory:** Chicken Breast
- Current quantity: 5 units
- Servings per unit: 4
- Available servings: 5 × 4 = 20
- Low stock threshold: 2

**Deduction:**
- Units to deduct: 6 ÷ 4 = 1.5 → 2 units (rounded up for safety)
- New quantity: 5 - 2 = 3
- New status: 3 > 2 → "available"

## Safety Features

- **Transaction Support**: All inventory changes wrapped in database transactions
- **Validation First**: All stock checks completed before any deductions
- **No Negative Stock**: `Math.max(0, quantity - unitsToDeduct)`
- **Atomic Operations**: Either all deductions succeed or all are rolled back