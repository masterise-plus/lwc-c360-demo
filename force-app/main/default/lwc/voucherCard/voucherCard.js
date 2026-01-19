import { LightningElement, track } from 'lwc';

export default class VoucherCard extends LightningElement {
    @track isModalOpen = false;
    @track displayLimit = 3;

    // Sample voucher data - replace with actual data source
    @track allVouchers = [
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

    get displayedVouchers() {
        return this.allVouchers.slice(0, this.displayLimit);
    }

    get hasMoreVouchers() {
        return this.allVouchers.length > this.displayLimit;
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