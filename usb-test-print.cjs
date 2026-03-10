const { SerialPort } = require("serialport");

/* ======================================
   PRINTER AUTO-RECONNECT SYSTEM
====================================== */

let port = null;
let isOpen = false;
let reconnecting = false;
let printing = false;

const queue = [];

// Attempt to open the port
function connectPrinter() {
  if (reconnecting || isOpen) return;

  console.log("🔍 Checking printer (COM5)...");

  port = new SerialPort({
    path: "COM5",
    baudRate: 9600,
    autoOpen: false,
  });

  port.open(err => {
    if (err) {
      console.log("❌ Printer not found. Retrying in 3s...");
      return retryReconnect();
    }

    isOpen = true;
    console.log("✅ Printer connected on COM3");

    setupEventHandlers();
    processQueue();
  });
}

function retryReconnect() {
  if (reconnecting) return;

  reconnecting = true;

  setTimeout(() => {
    reconnecting = false;
    connectPrinter();
  }, 3000);
}

function setupEventHandlers() {
  // printer unplugged
  port.on("close", () => {
    console.log("⚠️ Printer disconnected.");
    isOpen = false;
    retryReconnect();
  });

  port.on("error", err => {
    console.log("❌ Printer error:", err);
    isOpen = false;
    retryReconnect();
  });
}

/* =======================
   HELPER FUNCTIONS
======================= */
function pad(text, length, align = "left") {
  text = String(text);
  if (text.length > length) return text.substring(0, length);
  const spaces = " ".repeat(length - text.length);
  return align === "right" ? spaces + text : text + spaces;
}

function escposText(text = "") {
  return Buffer.from(text + "\n", "ascii");
}

/* =======================
   PROCESS QUEUE
======================= */
async function processQueue() {
  if (!isOpen || printing) return;

  printing = true;

  while (queue.length > 0) {
    const cmds = queue.shift();

    if (!isOpen) break;

    try {
      await new Promise((resolve, reject) => {
        port.write(Buffer.concat(cmds), err => {
          if (err) reject(err);
          else resolve();
        });
      });

      await new Promise(res => setTimeout(res, 300));

    } catch (err) {
      console.log("❌ Failed to send data:", err);
      break;
    }
  }

  printing = false;
}

/* =======================
   MAIN PRINT FUNCTION
======================= */
function printReceipt(data) {
  const cmds = [];

  cmds.push(Buffer.from([0x1B, 0x40])); // reset

  // Header
  cmds.push(Buffer.from([0x1B, 0x61, 0x01]));
  cmds.push(escposText("Food Paradise"));
  cmds.push(escposText("Pasonanca, Zamboanga City"));
  cmds.push(escposText("Contact: +63 111 222 4444"));
  cmds.push(escposText("SALES INVOICE"));
  cmds.push(escposText("--------------------------------"));

  // Info
  cmds.push(Buffer.from([0x1B, 0x61, 0x00]));
  cmds.push(escposText(`Time: ${data.date}`));
  cmds.push(escposText(`Receipt No: #${data.orderId || "0001"}`));
  cmds.push(escposText(`Order Type: ${data.orderType}`));
  cmds.push(escposText(`Payment: ${data.paymentMethod}`));
  cmds.push(escposText("--------------------------------"));

  // Items
  cmds.push(escposText("Qty  Item              Price"));
  cmds.push(escposText("--------------------------------"));

  data.cart.forEach(item => {
    const total = item.qty * item.price;

    cmds.push(
      escposText(
        pad(item.qty, 3, "right") + "  " +
        pad(item.item, 18) +
        pad(`Php ${total.toFixed(2)}`, 9, "right")
      )
    );
    cmds.push(escposText("      @ Php " + item.price.toFixed(2)));
  });

  cmds.push(escposText("--------------------------------"));

  // Totals
  const line = (label, value) =>
    escposText(pad(label, 22) + pad(`Php ${value.toFixed(2)}`, 10, "right"));

  cmds.push(line("Subtotal:", data.total));

  if (data.paymentMethod === "Cash") {
    cmds.push(line("Given:", parseFloat(data.given)));
    cmds.push(line("Change:", parseFloat(data.change)));
  }

  cmds.push(line("TOTAL:", data.total));
  cmds.push(escposText("--------------------------------"));

  // Footer
  cmds.push(Buffer.from([0x1B, 0x61, 0x01]));
  cmds.push(escposText("Thank you for dining!"));
  cmds.push(escposText("This is not an official receipt"));

  // Cut
  cmds.push(Buffer.from([0x1B, 0x64, 0x03]));
  cmds.push(Buffer.from([0x1D, 0x56, 0x00]));

  queue.push(cmds);

  processQueue();
}

/* =======================
   EXPORT + INITIAL CONNECT
======================= */
connectPrinter();

module.exports = { printReceipt };
