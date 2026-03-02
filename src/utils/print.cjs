const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const escpos = require('escpos');

let windowsPrinterDriver;
try { windowsPrinterDriver = require('printer'); } catch (err) {}

let UsbAdapter;
try {
  UsbAdapter = require('escpos-usb');
  escpos.USB = UsbAdapter;
} catch (err) {
  console.error('escpos-usb not installed or failed to load:', err);
}

const RECEIPT_CHAR_WIDTH = parseInt(process.env.RECEIPT_CHAR_WIDTH || '32', 10);
const CURRENCY_SYMBOL = process.env.PRINTER_CURRENCY_SYMBOL || '₱';

const lineBreak = (char = '-') => char.repeat(RECEIPT_CHAR_WIDTH);

const padLine = (left = '', right = '') => {
  const lhs = String(left);
  const rhs = String(right);
  const spacing = Math.max(RECEIPT_CHAR_WIDTH - lhs.length - rhs.length, 0);
  return `${lhs}${' '.repeat(spacing)}${rhs}`.slice(0, RECEIPT_CHAR_WIDTH);
};

const parseUsbId = (value) => {
  if (!value || typeof value === 'number') return value;
  const trimmed = value.trim();
  const radix = trimmed.toLowerCase().startsWith('0x') ? 16 : 10;
  const parsed = parseInt(trimmed, radix);
  return Number.isNaN(parsed) ? null : parsed;
};

// --- ESC/POS USB Printing ---
const printViaEscposUsb = (receiptData = {}) => new Promise((resolve, reject) => {
  const vendorId = parseUsbId(process.env.PRINTER_VENDOR_ID);
  const productId = parseUsbId(process.env.PRINTER_PRODUCT_ID);
  const device = vendorId && productId ? new escpos.USB(vendorId, productId) : new escpos.USB();

  device.open((error) => {
    if (error) return reject(error);

    const printer = new escpos.Printer(device, { encoding: process.env.PRINTER_ENCODING || 'GB18030' });
    const storeName = receiptData.storeName || 'CreateYourStyle';
    const contactNumber = receiptData.contactNumber || '+631112224444';
    const location = receiptData.location || 'Pasonanca, Zamboanga City';
    const receiptNo = receiptData.receiptNo || '000000';
    const paymentMethod = receiptData.paymentMethod || 'CASH';
    const issueTime = receiptData.time || new Date().toLocaleTimeString();

    printer.align('ct').size(1, 0).text(storeName).size(0, 0).feed(1);
    printer.align('lt').text(padLine(issueTime, contactNumber));
    printer.align('ct').text(location).feed(1).text(lineBreak());
    printer.text(`Receipt No: #${receiptNo}`).feed(1);
    
    printer.align('lt');
    printer.text(`${'Item'.padEnd(14)}${'Qty'.padStart(5)}${'Price'.padStart(13)}`);
    printer.text(lineBreak());

    (receiptData.items || []).forEach((item) => {
      const itemName = (item.name || 'Item').substring(0, 14).padEnd(14);
      const qty = (item.qty || 1).toString().padStart(5);
      const price = `${CURRENCY_SYMBOL} ${(item.price || 0).toFixed(2)}`.padStart(13);
      printer.text(`${itemName}${qty}${price}`);
    });

    printer.text(lineBreak());
    printer.text(padLine('Payment Method', paymentMethod));
    printer.text(padLine('Subtotal', `${CURRENCY_SYMBOL} ${(receiptData.subtotal || 0).toFixed(2)}`));
    printer.text(lineBreak());
    printer.text(padLine('Discount', `${CURRENCY_SYMBOL} ${(receiptData.discount || 0).toFixed(2)}`));
    printer.text(lineBreak());
    printer.style('B').text(padLine('Total', `${CURRENCY_SYMBOL} ${(receiptData.total || 0).toFixed(2)}`)).style('NORMAL');
    
    if (receiptData.cash) printer.text(padLine('Cash', `${CURRENCY_SYMBOL} ${receiptData.cash.toFixed(2)}`));
    if (receiptData.change) printer.text(padLine('Change', `${CURRENCY_SYMBOL} ${receiptData.change.toFixed(2)}`));
    
    printer.text(lineBreak()).align('ct').style('B').text('This is not an official receipt').style('NORMAL');
    printer.feed(2).cut('full');
    printer.close();
    resolve();
  });
});

// --- Main Print Function ---
const printReceipt = async (req, res) => {
  const { receiptData } = req.body;
  if (!receiptData) return res.status(400).json({ success: false, message: 'Receipt data is required' });

  const printerTransport = (process.env.PRINTER_TRANSPORT || '').toLowerCase();

  if (printerTransport === 'escpos-usb') {
    try {
      await printViaEscposUsb(receiptData);
      return res.json({ success: true, message: 'Receipt sent to USB thermal printer successfully' });
    } catch (usbError) {
      console.error('ESC/POS USB Error:', usbError);
      return res.status(500).json({ success: false, message: 'USB printer error', error: usbError.message });
    }
  }

  // --- node-thermal-printer fallback ---
  const printerType = process.env.PRINTER_TYPE || 'EPSON';
  const printerInterface = process.env.PRINTER_INTERFACE || (windowsPrinterDriver ? 'printer' : 'file');
  const printerName = process.env.PRINTER_NAME || './receipt.txt';
  const printerIP = process.env.PRINTER_IP || '192.168.1.100';
  const printerPort = process.env.PRINTER_PORT || '9100';

  let printerTypeEnum = PrinterTypes.EPSON;
  if (printerType === 'STAR') printerTypeEnum = PrinterTypes.STAR;
  else if (printerType === 'BEPOST') printerTypeEnum = PrinterTypes.BEPOST;

  let interfaceString;
  if (printerInterface === 'tcp' || printerInterface === 'network') interfaceString = `tcp://${printerIP}:${printerPort}`;
  else if (printerInterface === 'usb') interfaceString = 'usb';
  else if (printerInterface === 'file') interfaceString = `file:${printerName}`;
  else interfaceString = printerName ? `printer:${printerName}` : 'printer';

  if ((interfaceString.startsWith('printer:') || interfaceString === 'printer') && !windowsPrinterDriver) {
    interfaceString = `file:${printerName}`;
  }

  const printerConfig = {
    type: printerTypeEnum,
    interface: interfaceString,
    characterSet: CharacterSet.PC852_LATIN2,
    removeSpecialCharacters: false,
    lineCharacter: '-',
    breakLine: BreakLine.WORD,
    options: { timeout: 30000 }
  };

  if ((interfaceString.startsWith('printer:') || interfaceString === 'printer') && windowsPrinterDriver) {
    printerConfig.driver = windowsPrinterDriver;
  }

  const printer = new ThermalPrinter(printerConfig);
  const storeName = receiptData.storeName || 'CreateYourStyle';
  const contactNumber = receiptData.contactNumber || '+631112224444';
  const location = receiptData.location || 'Pasonanca, Zamboanga City';
  const issueTime = receiptData.time || new Date().toLocaleTimeString();

  printer.alignCenter();
  printer.setTextSize(1, 0);
  printer.bold(true);
  printer.println(storeName);
  printer.bold(false);
  printer.setTextSize(0, 0);

  printer.alignLeft();
  printer.println(padLine(issueTime, contactNumber));

  printer.alignCenter();
  printer.println(location);
  printer.drawLine();
  printer.println(`Receipt No: #${receiptData.receiptNo || '000000'}`);
  printer.drawLine();

  printer.alignLeft();
  if (receiptData.items && receiptData.items.length > 0) {
    receiptData.items.forEach(item => {
      printer.tableCustom([
        { text: (item.name || 'Item').substring(0, 20), align: 'LEFT', width: 0.55 },
        { text: (item.qty || 1).toString(), align: 'CENTER', width: 0.15 },
        { text: `${CURRENCY_SYMBOL}${(item.price || 0).toFixed(2)}`, align: 'RIGHT', width: 0.3 }
      ]);
    });
  }

  printer.drawLine();
  printer.println(`Payment Method: ${receiptData.paymentMethod || 'CASH'}`);
  printer.println(`Subtotal: ${CURRENCY_SYMBOL}${(receiptData.subtotal || 0).toFixed(2)}`);
  printer.drawLine();
  printer.println(`Discount: ${CURRENCY_SYMBOL}${(receiptData.discount || 0).toFixed(2)}`);
  printer.drawLine();
  printer.bold(true);
  printer.println(`Total: ${CURRENCY_SYMBOL}${(receiptData.total || 0).toFixed(2)}`);
  printer.bold(false);

  if (receiptData.cash) {
    printer.println(`Cash: ${CURRENCY_SYMBOL}${receiptData.cash.toFixed(2)}`);
    printer.println(`Change: ${CURRENCY_SYMBOL}${(receiptData.change || 0).toFixed(2)}`);
  }

  printer.drawLine();
  printer.alignCenter();
  printer.bold(true);
  printer.println('This is not an official receipt');
  printer.bold(false);
  printer.newLine();
  printer.cut();

  try {
    await printer.execute();
    const isFilePrinting = interfaceString.startsWith('file:');
    if (isFilePrinting) {
      return res.json({
        success: false,
        message: `Receipt saved to file (${printerName})`,
        fileSaved: true,
        filePath: printerName
      });
    }
    res.json({ success: true, message: 'Receipt printed successfully' });
  } catch (err) {
    console.error('Thermal Printer Error:', err);
    res.status(500).json({ success: false, message: 'Printer error', error: err.message });
  }
};

module.exports = { printReceipt };
