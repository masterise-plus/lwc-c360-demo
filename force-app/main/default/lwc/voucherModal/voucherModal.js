import { LightningElement, api } from 'lwc';

export default class VoucherModal extends LightningElement {
    @api vouchers = [];

    get hasVouchers() {
        return this.vouchers && this.vouchers.length > 0;
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleBackdropClick() {
        this.handleClose();
    }

    handleApply(event) {
        const voucherId = event.target.dataset.id;
        const voucher = this.vouchers.find(v => v.id === voucherId);
        
        this.dispatchEvent(new CustomEvent('apply', {
            detail: { voucher }
        }));
    }

    // Trap focus within modal for accessibility
    connectedCallback() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleKeyDown(event) {
        if (event.key === 'Escape') {
            this.handleClose();
        }
    }
}