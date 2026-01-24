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
            statusClass: this.getStatusClass(warranty.status),
            isExpiringSoon: this.isWarrantyExpiringSoon(warranty.expirationDate)
        }));
    }

    // Check if warranty is expiring within 90 days
    isWarrantyExpiringSoon(expirationDateStr) {
        if (!expirationDateStr) return false;
        
        // Parse date from format "03 April 2026 14:23 WIB"
        const dateMatch = expirationDateStr.match(/(\d{2})\s+(\w+)\s+(\d{4})/);
        if (!dateMatch) return false;
        
        const monthNames = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3,
            'May': 4, 'June': 5, 'July': 6, 'August': 7,
            'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        
        const day = parseInt(dateMatch[1], 10);
        const month = monthNames[dateMatch[2]];
        const year = parseInt(dateMatch[3], 10);
        
        if (month === undefined) return false;
        
        const expirationDate = new Date(year, month, day);
        const today = new Date();
        const diffTime = expirationDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Return true if expiring within 90 days and not already expired
        return diffDays > 0 && diffDays <= 90;
    }

    get hasWarranties() {
        return this.allWarranties.length > 0;
    }

    get hasMoreWarranties() {
        return this.allWarranties.length > this.displayLimit;
    }

    // Check if any warranty is expiring soon
    get hasExpiringWarranties() {
        return this.allWarranties.some(warranty => this.isWarrantyExpiringSoon(warranty.expirationDate));
    }

    // Get the soonest expiring warranty days count
    get expirationAlertTitle() {
        let minDays = Infinity;
        
        for (const warranty of this.allWarranties) {
            const days = this.getDaysUntilExpiration(warranty.expirationDate);
            if (days > 0 && days <= 90 && days < minDays) {
                minDays = days;
            }
        }
        
        return minDays !== Infinity ? `This subscription will expire in ${minDays} days.` : '';
    }

    // Get days until expiration for a warranty
    getDaysUntilExpiration(expirationDateStr) {
        if (!expirationDateStr) return -1;
        
        const dateMatch = expirationDateStr.match(/(\d{2})\s+(\w+)\s+(\d{4})/);
        if (!dateMatch) return -1;
        
        const monthNames = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3,
            'May': 4, 'June': 5, 'July': 6, 'August': 7,
            'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        
        const day = parseInt(dateMatch[1], 10);
        const month = monthNames[dateMatch[2]];
        const year = parseInt(dateMatch[3], 10);
        
        if (month === undefined) return -1;
        
        const expirationDate = new Date(year, month, day);
        const today = new Date();
        const diffTime = expirationDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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