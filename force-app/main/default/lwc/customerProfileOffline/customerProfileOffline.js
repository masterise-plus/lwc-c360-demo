import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getUnifiedIndividualById from '@salesforce/apex/Customer360Controller.getUnifiedIndividualById';
import getPreferredPaymentPerBU from '@salesforce/apex/Customer360Controller.getPreferredPaymentPerBU';
import getSalesOrderItemByUnifiedId from '@salesforce/apex/Customer360Controller.getSalesOrderItemByUnifiedId';

// --- PENGATURAN WAKTU BADGE (Dalam Milidetik) ---
const DELAY_MUNCUL = 60000;    // Waktu tunggu sebelum badge muncul (1 menit)
const DURASI_TAMPIL = 300000;  // Lama badge tampil sebelum memudar (5 menit)
// ------------------------------------------------

export default class customerProfileOffline extends LightningElement {
    @wire(MessageContext) messageContext; 

    subscription;
    @track record;
    @track preferredPayments = [];
    @track isLoading = false;
    @track error;
    @track showInStoreBadge = false; 
    @track isFadingOut = false; // Kontrol class animasi

    badgeTimer;
    hideBadgeTimer;

    connectedCallback() {
        this.subscription = subscribe(
            this.messageContext,
            RECORD_SELECTED_CHANNEL,
            (message) => this.handleRecordSelection(message)
        );
    }

    disconnectedCallback() {
        this.clearAllTimers();
    }

    // Helper untuk membersihkan timer agar kode lebih rapi
    clearAllTimers() {
        if (this.badgeTimer) clearTimeout(this.badgeTimer);
        if (this.hideBadgeTimer) clearTimeout(this.hideBadgeTimer);
    }

    handleRecordSelection(message) {
        if (!message || !message.recordId) {
            this.error = 'Invalid recordId received';
            this.record = undefined;
            this.preferredPayments = [];
            this.buLTV = 0;
            return;
        }

        // Reset semua state terkait badge
        this.clearAllTimers();
        this.showInStoreBadge = false;
        this.isFadingOut = false;

        this.isLoading = true;
        this.error = undefined;
        this.record = undefined;
        this.preferredPayments = [];
        this.buLTV = 0;

        // --- Step 1: Get UnifiedIndividual details ---
        getUnifiedIndividualById({ ssotId: message.recordId })
            .then(result => {
                if (result && Object.keys(result).length > 0) {
                    let ltv = result.LTV || 0;
                    ltv = parseFloat(ltv);
                    ltv = isNaN(ltv) ? 0 : parseFloat(ltv.toFixed(2));

                    let ageRaw = result.ssot__Age__c || 0
                    ageRaw = parseFloat(ageRaw);
                    ageRaw = isNaN(ageRaw) ? 0 : parseFloat(ageRaw.toFixed(0));

                    let format_point_balance = result.point_balance || 0
                    format_point_balance = parseFloat(format_point_balance);
                    format_point_balance = isNaN(format_point_balance) ? 0 : parseFloat(format_point_balance.toFixed(0));

                    let formatedAge = ageRaw.toLocaleString('id-ID', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    });

                    let formattedLTV = ltv.toLocaleString('id-ID', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });

                    let formattedPointBalance = format_point_balance.toLocaleString('id-ID', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    });

                    let engagement = parseFloat(result.engagement_score || 0);
                    if (isNaN(engagement)) engagement = 0;
                    engagement = Math.max(0, Math.min(engagement, 100));

                    let engagementLabel = '';
                    if (engagement >= 75) engagementLabel = 'Highly Engaged';
                    else if (engagement >= 40) engagementLabel = 'Moderately Engaged';
                    else engagementLabel = 'Low Engagement';

                    let createdDateRaw = result.ssot__CreatedDate__c;
                    let formattedCreatedDate = '—';
                    if (createdDateRaw) {
                        const d = new Date(createdDateRaw);
                        if (!isNaN(d.getTime())) {
                            formattedCreatedDate = d.toLocaleDateString('id-ID');
                        }
                    }

                    this.record = {
                        ...result,
                        LTV: formattedLTV,
                        point_balance: formattedPointBalance,
                        formatAge: formatedAge,
                        ssot__CreatedDate__c: formattedCreatedDate,
                        engagement_score: engagement,
                        engagement_label: engagementLabel
                    };

                    // --- LOGIKA TIMER UNTUK BADGE ---
                    // 1. Munculkan badge setelah DELAY_MUNCUL
                    this.badgeTimer = setTimeout(() => {
                        this.showInStoreBadge = true;
                    }, DELAY_MUNCUL);

                    // 2. Mulai proses Fade Out setelah (DELAY_MUNCUL + DURASI_TAMPIL)
                    this.hideBadgeTimer = setTimeout(() => {
                        // Tambahkan class .fade-out untuk memulai animasi
                        this.isFadingOut = true;

                        // Beri waktu 500ms agar animasi CSS selesai, baru hilangkan div-nya
                        setTimeout(() => {
                            this.showInStoreBadge = false;
                            this.isFadingOut = false; // Reset state
                        }, 500);
                        
                    }, DELAY_MUNCUL + DURASI_TAMPIL);
                    // --------------------------------

                    // LTV BU calcualtion
                    this.calculateBuLTV(message.recordId);

                    // --- Step 2: Get Preferred Payment per BU ---
                    return getPreferredPaymentPerBU({ unifiedId: message.recordId });
                } else {
                    throw new Error('No record found for this ID.');
                }
            })
            .then(paymentData => {
                if (paymentData && paymentData.length > 0) {
                    const filteredData = paymentData.filter(item => item.bu__c === 'Erafone');
                    
                    this.preferredPayments = filteredData.map(item => ({
                        bu: item.bu__c,
                        paymentBank: item.payment_bank__c || '-',
                        paymentMethod: item.payment_method__c || 'Cash',
                        paymentScheme: item.payment_scheme__c 
                    }));
                } else {
                    this.preferredPayments = [];
                }
            })
            .catch(error => {
                console.error('Error in handleRecordSelection:', error);
                this.error = error?.body?.message || error.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    get badgeContainerClass() {
        // Jika isFadingOut true, CSS 'fade-out' akan ditambahkan
        return this.isFadingOut 
            ? 'in-store-container slds-col_bump-left fade-out' 
            : 'in-store-container slds-col_bump-left';
    }

    calculateBuLTV(unifiedId) {
        getSalesOrderItemByUnifiedId({ unifiedId })
            .then((result) => {
                const rows = Array.isArray(result) ? result : [];

                const total = rows
                    .filter(item => item.Retail_Store === 'Erafone')
                    .reduce((acc, current) => {
                        const amount = parseFloat(current.ssot__TotalLineAmount__c) || 0;
                        return acc + amount;
                    }, 0);

                this.buLTV = parseFloat(total.toFixed(2));
            })
            .catch((err) => {
                console.error('Error calculating Erafone LTV:', err);
                this.buLTV = 0;
            });
    }

    get formattedBuLTV() {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(this.buLTV);
    }

    get showHardcodedBadges() {
        return this.record?.ssot__Id__c === 'cf72c1c1c94bd7c10cf2477cf1c0c70b';
    }

    get showHardcodedBadgesBudi() {
        return this.record?.ssot__Id__c === '39eaa5575b9af05b47c5e7865c466298';
    }

    get maskEmail() {
        const email = this.record?.ssot__EmailAddress__c;

        if (email && email.includes('@')) {
            const [user, domain] = email.split("@");
            const visiblePart = user.length > 2 ? user.substring(0, 2) : user.substring(0, 1);
            return `${visiblePart}******@${domain}`;
        }
        return '';
    }

    get maskPhone() {
        const phone = this.record?.phone_number;

        if (phone) {
            const cleaned = phone.toString().replace(/\D/g, ''); 
            const lastFour = cleaned.slice(-4);
            return `********${lastFour}`;
        }
        return '';
    }
}