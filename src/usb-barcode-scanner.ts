import { HID, Device } from 'node-hid';
import { EventEmitter } from 'events';

import { UsbScannerOptions, HidMap, onDataScanned } from './usb-barcode-scanner-types';
import { getDevice, defaultHidMap, getDeviceByPath } from './usb-barcode-scanner-utils';

export class UsbScanner extends EventEmitter implements onDataScanned {
    hid?: HID;
    hidMap: any;

    constructor(options: UsbScannerOptions, hidMap?: any) {
        super();

        let device: Device|undefined;

        if (options.path) {
            device = this.retreiveDeviceByPath(options.path);
        } else if (options.vendorId && options.productId) {
            device = getDevice(options.vendorId, options.productId);
        }

        if (device === undefined) {
            console.warn(`Device not found, please provide a valid path or vendor/product combination.`);
        } else {
            this.hid = new HID(device.vendorId, device.productId);

            if (hidMap) {
                this.hidMap = hidMap;
            } else {
                this.hidMap = defaultHidMap();
            }
        }
    }

    private retreiveDevice(vendorId: number, productId: number): Device|undefined {
        return getDevice(vendorId, productId);
    }

    private retreiveDeviceByPath(path: string): Device|undefined {
        return getDeviceByPath(path);
    }

    readonly HID_REPORT_BYTE_SIGNIFICANCE = {
        MODIFIER: 0,
        RESERVED: 1,
        KEY_CODE_1: 2,
        KEY_CODE_2: 3,
        KEY_CODE_3: 4,
        KEY_CODE_4: 5,
        KEY_CODE_5: 6,
        KEY_CODE_6: 7
    };

    readonly MODIFIER_BITS = {
        LEFT_CTRL: 0x1,
        LEFT_SHIFT: 0x2,
        LEFT_ALT: 0x4,
        LEFT_GUI: 0x8,
        RIGHT_CTRL: 0x10,
        RIGHT_SHIFT: 0x20,
        RIGHT_ALT: 0x40,
        RIGHT_GUI: 0x80,
    };

    readonly REPORT_ENDING_KEY_CODE = 40;

    startScanning(): void {
        let bcodeBuffer: string[] = [];
        let barcode: string = '';

        if (this.hid) {
            this.hid.on('data', (chunk) => {
                let keyCode1 = chunk[this.HID_REPORT_BYTE_SIGNIFICANCE.KEY_CODE_1];
                let modifierByte = chunk[this.HID_REPORT_BYTE_SIGNIFICANCE.MODIFIER];
                let isShiftModified = modifierByte & this.MODIFIER_BITS.LEFT_SHIFT || modifierByte & this.MODIFIER_BITS.RIGHT_SHIFT;
                if (keyCode1) {
                    if (keyCode1 !== this.REPORT_ENDING_KEY_CODE) {
                        let hidMapEntry = this.hidMap[keyCode1];
                        if (hidMapEntry) {
                            if (typeof hidMapEntry === 'object') {
                                if (isShiftModified && hidMapEntry.shift) {
                                    bcodeBuffer.push(hidMapEntry.shift);
                                } else {
                                    bcodeBuffer.push(hidMapEntry.unmodified);
                                }
                            } else {
                                bcodeBuffer.push(hidMapEntry);
                            }
                        }
                    } else {
                        barcode = bcodeBuffer.join("");
                        bcodeBuffer = [];
                        this.emitDataScanned(barcode);
                    }
                }
            });
        }
    }

    stopScanning(): void {
        if (this.hid) {
            this.hid.close();
        }
    }

    private emitDataScanned(data: string): void {
        this.emit('data', data)
    }
}