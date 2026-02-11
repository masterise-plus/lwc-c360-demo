import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getUnifiedIndividualById from '@salesforce/apex/Customer360Controller.getUnifiedIndividualById';
import getPreferredPaymentPerBU from '@salesforce/apex/Customer360Controller.getPreferredPaymentPerBU';
import getSalesOrderItemByUnifiedId from '@salesforce/apex/Customer360Controller.getSalesOrderItemByUnifiedId';

export default class CustomerProfile extends LightningElement {
    @wire(MessageContext) messageContext;

    subscription;
    @track record;
    @track preferredPayments = [];
    @track isLoading = false;
    @track error;

    connectedCallback() {
        this.subscription = subscribe(
            this.messageContext,
            RECORD_SELECTED_CHANNEL,
            (message) => this.handleRecordSelection(message)
        );
    }

    handleRecordSelection(message) {
        if (!message || !message.recordId) {
            this.error = 'Invalid recordId received';
            this.record = undefined;
            this.preferredPayments = [];
            this.buLTV = 0;
            return;
        }

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

                    let point_balance = result.ssot__PointsBalanceNumber__c || 0;
                    point_balance = parseFloat(point_balance);
                    point_balance = isNaN(point_balance) ? 0 : parseFloat(point_balance.toFixed(2));

                    let formatedAge = ageRaw.toLocaleString('id-ID', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    });

                    let formattedLTV = ltv.toLocaleString('id-ID', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });

                    let formattedPointBalance = point_balance.toLocaleString('id-ID', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
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
                        ssot__PointsBalanceNumber__c: formattedPointBalance,
                        formatAge: formatedAge,
                        ssot__CreatedDate__c: formattedCreatedDate,
                        engagement_score: engagement,
                        engagement_label: engagementLabel
                    };

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
                    const filteredData = paymentData.filter(item => item.bu__c === 'Ibox');
                    
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

    // --- GAUGE CONFIGURATIONS ---
    // get gaugeColor() {
    //     const score = this.record?.engagement_score || 0;
    //     if (score >= 75) return '#3EB489'; // hijau
    //     if (score >= 40) return '#F7B500'; // kuning
    //     return '#D94F4F'; // merah
    // }

    // get gaugeStyle() {
    //     const score = this.record?.engagement_score || 0;
    //     const radius = 40;
    //     const circumference = Math.PI * radius;
    //     const filled = (score / 100) * circumference;
    //     const empty = circumference - filled;
    //     return `stroke-dasharray: ${circumference}; stroke-dashoffset: ${empty}; transform-origin: 50% 50%;`;
    // }

    calculateBuLTV(unifiedId) {
            getSalesOrderItemByUnifiedId({ unifiedId })
                .then((result) => {
                    const rows = Array.isArray(result) ? result : [];
    
                    // Filter dan jumlahkan nilai (tetap angka)
                    const total = rows
                        .filter(item => item.Retail_Store === 'Ibox')
                        .reduce((acc, current) => {
                            const amount = parseFloat(current.ssot__TotalLineAmount__c) || 0;
                            return acc + amount;
                        }, 0);
    
                    // Simpan sebagai Number
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
        // Check if the current record ID matches the specific ID provided
        return this.record?.ssot__Id__c === 'cf72c1c1c94bd7c10cf2477cf1c0c70b';
    }

    get showHardcodedBadgesBudi() {
        // Check if the current record ID matches the specific ID provided
        return this.record?.ssot__Id__c === '39eaa5575b9af05b47c5e7865c466298';
    }


    // Segment Tab
    @track activeTab = 'Er'; // Default first tab

    get tabOrder() {
        return ['Er', 'Ef', 'JD', 'iB', 'PB', 'UA', 'AS', 'Others'];
    }

    

    handleTabActive(event) {
        // event.target.value berisi value tab yang aktif
        this.activeTab = event.target.value;
    }

    get filteredSegmentNames() {
        const list = this.record?.Segment_Display_Names || [];
        const tag = this.activeTab; // "Er", "Ef", "JD", ...

        // Tab Others: yang tidak punya tag [Er]/[Ef]/... (opsional)
        if (tag === 'Others') {
            const knownTags = ['Er', 'Ef', 'JD', 'iB', 'PB', 'UA', 'AS'];
            return list.filter((name) => !knownTags.some(t => name?.includes(`[${t}]`)));
        }

        // Tab normal: hanya yang mengandung pattern `[Er]` dll
        return list.filter((name) => name?.includes(`[${tag}]`));
    }

    get hasFilteredSegments() {
        return (this.filteredSegmentNames?.length || 0) > 0;
    }

    get maskEmail() {
        const email = this.record?.ssot__EmailAddress__c;

        // 2. Cek apakah email ada dan mengandung karakter '@'
        if (email && email.includes('@')) {
            const [user, domain] = email.split("@");
            
            // 3. Logika masking: jika user id hanya 1-2 karakter, sesuaikan tampilannya
            const visiblePart = user.length > 2 ? user.substring(0, 2) : user.substring(0, 1);
            return `${visiblePart}******@${domain}`;
        }

        // 4. Kembalikan string kosong atau placeholder jika tidak ada data
        return '';
    }

    get maskPhone() {
        const phone = this.record?.phone_number; // Pastikan nama field sesuai mapping Anda

        if (phone) {
            // Menghapus spasi atau karakter non-angka agar konsisten
            const cleaned = phone.toString().replace(/\D/g, ''); 
            
            // Ambil 4 digit terakhir
            const lastFour = cleaned.slice(-4);
            
            // Tampilkan format: ********5678
            return `********${lastFour}`;
        }
        return '';
    }

}