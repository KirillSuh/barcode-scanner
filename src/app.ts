import {getDevices} from "./usb-barcode-scanner-utils";
import {UsbScanner} from "./usb-barcode-scanner";

let allDevices = getDevices();
let barcodeScanners = allDevices.filter(x => x.product && x.product.toLowerCase().indexOf('barcode') >= 0);
let barcodeScanner = barcodeScanners[0];
console.log(barcodeScanner);
if (barcodeScanner) {
    let scanner = new UsbScanner({
        vendorId: barcodeScanner.vendorId,
        productId: barcodeScanner.productId
    });

    scanner.on('data', (data) => {
        console.log(data);
    });

    scanner.startScanning();
}