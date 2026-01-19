import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';

export default class SupportWarrantyCard extends LightningElement {
    @wire(MessageContext) messageContext;
    subscription;

    currentRecordId;
    @track isModalOpen = false;
    @track displayLimit = 2;

    // Allowed customer IDs that can view warranty data
    allowedCustomerIds = [
        'd66c88cebc91c48f0f164341265e3579',
        'cf72c1c1c94bd7c10cf2477cf1c0c70b'
    ];

    // Sample warranty data - replace with actual data source
    @track warrantyData = [
        {
            id: '1',
            deviceName: 'iPhone 16 Pro',
            appleCareId: 'WiP016pr227',
            status: 'Active',
            buyDate: '03 April 2024 14:23 WIB',
            expirationDate: '03 April 2026 14:23 WIB'
        },
        {
            id: '2',
            deviceName: 'iPhone 17 Pro',
            appleCareId: 'WiP017pr005',
            status: 'Active',
            buyDate: '21 October 2025 10:23 WIB',
            expirationDate: '21 October 2026 10:23 WIB'
        },
        {
            id: '3',
            deviceName: 'MacBook Pro 14"',
            appleCareId: 'WMB014pr112',
            status: 'Active',
            buyDate: '15 January 2025 09:00 WIB',
            expirationDate: '15 January 2028 09:00 WIB'
        },
        {
            id: '4',
            deviceName: 'iPad Pro 12.9"',
            appleCareId: 'WiPD012pr089',
            status: 'Expired',
            buyDate: '10 March 2022 11:30 WIB',
            expirationDate: '10 March 2024 11:30 WIB'
        }
    ];

    // Check if customer ID is in the allowed list
    get isCustomerIdAllowed() {
        return this.currentRecordId && this.allowedCustomerIds.includes(this.currentRecordId);
    }

    // Get warranties - returns empty array if customer is not allowed
    get allWarranties() {
        return this.isCustomerIdAllowed ? this.warrantyData : [];
    }

    get displayedWarranties() {
        return this.allWarranties.slice(0, this.displayLimit).map((warranty, index) => ({
            ...warranty,
            cardClass: index === 0 ? 'warranty-card-highlighted' : 'warranty-card',
            statusClass: this.getStatusClass(warranty.status)
        }));
    }

    get hasWarranties() {
        return this.allWarranties.length > 0;
    }

    get hasMoreWarranties() {
        return this.allWarranties.length > this.displayLimit;
    }

    connectedCallback() {
        this.subscription = subscribe(
            this.messageContext,
            RECORD_SELECTED_CHANNEL,
            (message) => this.handleRecordSelection(message)
        );
    }

    handleRecordSelection(message) {
        if (message && message.recordId) {
            this.currentRecordId = message.recordId;
        }
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

    handleShowMore() {
        this.isModalOpen = true;
    }

    handleCloseModal() {
        this.isModalOpen = false;
    }
}