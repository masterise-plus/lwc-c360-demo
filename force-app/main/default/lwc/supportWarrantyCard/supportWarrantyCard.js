import { LightningElement, track } from 'lwc';

export default class SupportWarrantyCard extends LightningElement {
    @track isModalOpen = false;
    @track displayLimit = 2;

    // Sample warranty data - replace with actual data source
    @track allWarranties = [
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

    get displayedWarranties() {
        return this.allWarranties.slice(0, this.displayLimit).map((warranty, index) => ({
            ...warranty,
            cardClass: index === 0 ? 'warranty-card-highlighted' : 'warranty-card',
            statusClass: this.getStatusClass(warranty.status)
        }));
    }

    get hasMoreWarranties() {
        return this.allWarranties.length > this.displayLimit;
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