import { LightningElement, api } from 'lwc';

export default class SupportWarrantyModal extends LightningElement {
    @api warranties = [];

    get hasWarranties() {
        return this.warranties && this.warranties.length > 0;
    }

    get formattedWarranties() {
        return this.warranties.map((warranty, index) => ({
            ...warranty,
            cardClass: index === 0 ? 'warranty-card-highlighted' : 'warranty-card',
            statusClass: this.getStatusClass(warranty.status)
        }));
    }

    getStatusClass(status) {
        switch (status.toLowerCase()) {
            case 'active':
                return 'status-badge-active';
            case 'expired':
                return 'status-badge-expired';
            case 'pending':
                return 'status-badge-pending';
            default:
                return 'status-badge-active';
        }
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleBackdropClick() {
        this.handleClose();
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
