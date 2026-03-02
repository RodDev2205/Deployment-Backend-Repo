const { printReceipt } = require('./src/utils/print.cjs'); // replace with actual filename

// Mock request and response objects
const req = {
  body: {
    receiptData: {
      storeName: "My Store",
      contactNumber: "+639123456789",
      location: "Zamboanga City",
      receiptNo: "123456",
      paymentMethod: "CASH",
      time: new Date().toLocaleTimeString(),
      items: [
        { name: "Burger", qty: 2, price: 50 },
        { name: "Fries", qty: 1, price: 25 }
      ],
      subtotal: 125,
      discount: 0,
      total: 125,
      cash: 200,
      change: 75
    }
  }
};

const res = {
  json: console.log,
  status: function(code) {
    this.statusCode = code;
    return this;
  }
};

// Call the function
printReceipt(req, res).then(() => {
  console.log("Print test completed.");
}).catch(err => {
  console.error("Error printing:", err);
});
