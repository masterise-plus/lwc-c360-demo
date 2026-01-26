import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';

export default class VoucherCard extends LightningElement {
    @wire(MessageContext) messageContext;
    subscription;

    currentRecordId;
    @track isModalOpen = false;
    @track displayLimit = 3;

    // Allowed customer IDs that can view voucher data
    allowedCustomerIds = [
        'd66c88cebc91c48f0f164341265e3579',
        'cf72c1c1c94bd7c10cf2477cf1c0c70b'
    ];

    // Sample voucher data - replace with actual data source
    @track voucherData = [
        {
            id: '1',
            brand: 'KLIK N CLEAN',
            serviceType: 'WET VACUUM',
            discountLabel: 'Diskon Rp 100.000',
            title: 'Klik N Clean Wet Vacuum',
            expirationDate: '31 Aug 2026',
            subtitle: null,
            bannerImage: null,
            hasImage: false
        },
        {
            id: '2',
            brand: 'KLIK N CLEAN',
            serviceType: 'HYDRO CLEANING',
            discountLabel: 'Diskon Rp 100.000',
            title: 'Klik N Clean Hydro Clean',
            expirationDate: '31 Aug 2026',
            subtitle: null,
            bannerImage: null,
            hasImage: false
        },
        {
            id: '3',
            brand: 'KLIK N CLEAN',
            serviceType: null,
            discountLabel: 'Diskon Rp 50.000',
            title: 'Klik N Clean 50K',
            expirationDate: '31 Aug 2026',
            subtitle: 'Untuk Pengguna Baru',
            bannerImage: null,
            hasImage: false
        },
        {
            id: '4',
            brand: 'KLIK N CLEAN',
            serviceType: 'DEEP CLEANING',
            discountLabel: 'Diskon Rp 150.000',
            title: 'Klik N Clean Deep Clean',
            expirationDate: '31 Dec 2026',
            subtitle: null,
            bannerImage: null,
            hasImage: false
        },
        {
            id: '5',
            brand: 'KLIK N CLEAN',
            serviceType: 'AC SERVICE',
            discountLabel: 'Diskon Rp 75.000',
            title: 'Klik N Clean AC Service',
            expirationDate: '30 Sep 2026',
            subtitle: 'Limited Time Offer',
            bannerImage: null,
            hasImage: false
        }
    ];

    // Check if customer ID is in the allowed list
    get isCustomerIdAllowed() {
        return this.currentRecordId && this.allowedCustomerIds.includes(this.currentRecordId);
    }

    // Get vouchers - returns empty array if customer is not allowed
    get allVouchers() {
        return this.isCustomerIdAllowed ? this.voucherData : [];
    }

    get displayedVouchers() {
        return this.allVouchers.slice(0, this.displayLimit);
    }

    get hasVouchers() {
        return this.allVouchers.length > 0;
    }

    get hasMoreVouchers() {
        return this.allVouchers.length > this.displayLimit;
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

    handleShowMore() {
        this.isModalOpen = true;
    }

    handleCloseModal() {
        this.isModalOpen = false;
    }

    handleApply(event) {
        const voucherId = event.target.dataset.id;
        const voucher = this.allVouchers.find(v => v.id === voucherId);
        
        // Dispatch custom event for parent components to handle
        this.dispatchEvent(new CustomEvent('voucherapply', {
            detail: { voucher },
            bubbles: true,
            composed: true
        }));

        // Show toast or confirmation - can be customized
        console.log('Applied voucher:', voucher);
    }

    handleModalApply(event) {
        const voucher = event.detail.voucher;
        
        this.dispatchEvent(new CustomEvent('voucherapply', {
            detail: { voucher },
            bubbles: true,
            composed: true
        }));

        console.log('Applied voucher from modal:', voucher);
    }
}