import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getCampaignEngagement from '@salesforce/apex/Customer360Controller.getCampaignEngagement';

export default class CampaignEngagement extends LightningElement {
    @wire(MessageContext) messageContext;

    @track campaignengagementevent = [];
    @track error;
    @track isLoading = false;
    @track currentRecordId;

    @track isFieldModalOpen = false;
    @track isAllDataModalOpen = false;

    // Kolom yang aktif ditampilkan
    @track selectedFields = ['campaign_name__c', 'source_channel__c', 'result__c'];
    
    // Penampung sementara saat memilih di modal
    @track tempSelectedFields = [];

    displayLimit = 5;
    @track sortDirection = 'desc';
    @track sortedBy = 'event_at__c';

    modalPageSize = 15;
    @track modalCurrentPage = 1;

    // Definisi field yang tersedia
    availableFields = [
        { label: 'Campaign Name', value: 'campaign_name__c' },
        { label: 'Event Date', value: 'event_at__c' },
        { label: 'Source Channel', value: 'source_channel__c' },
        { label: 'Result', value: 'result__c' },
        { label: 'Engagement ID', value: 'id__c' }
    ];

    connectedCallback() {
        this.subscription = subscribe(
            this.messageContext,
            RECORD_SELECTED_CHANNEL,
            (message) => this.handleRecordSelection(message)
        );
    }

    handleRecordSelection(message) {
        if (!message?.recordId) return;
        this.currentRecordId = message.recordId;
        this.loadCampaignEngagementEvent(message.recordId);
    }

    loadCampaignEngagementEvent(unifiedId) {
        this.isLoading = true;
        this.campaignengagementevent = [];
        this.error = undefined;

        getCampaignEngagement({ unifiedId })
            .then((result) => {
                const mapped = (result || []).map((r) => ({
                    ...r,
                    event_at__c: r.event_at__c ? new Date(r.event_at__c) : null
                }));
                mapped.sort((a, b) => (b.event_at__c || 0) - (a.event_at__c || 0));
                this.campaignengagementevent = mapped;
                this.modalCurrentPage = 1;
            })
            .catch((err) => {
                this.error = err?.body?.message || err.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // --- GETTERS ---
    get hasData() { return this.campaignengagementevent.length > 0; }
    get visibleSalesOrderItem() { return this.campaignengagementevent.slice(0, this.displayLimit); }
    get canShowMore() { return this.campaignengagementevent.length > this.displayLimit; }
    get noData() { return this.currentRecordId && !this.isLoading && this.campaignengagementevent.length === 0; }

    get displayColumns() {
        return this.selectedFields.map((field) => {
            const meta = this.availableFields.find((f) => f.value === field);
            return {
                label: meta?.label || field,
                fieldName: field,
                type: field === 'event_at__c' ? 'date' : 'text',
                sortable: true
            };
        });
    }

    // --- FIELD SELECTOR LOGIC ---
    openFieldSelector() {
        // Salin field yang sedang aktif ke penampung sementara
        this.tempSelectedFields = [...this.selectedFields];
        this.isFieldModalOpen = true;
    }

    closeFieldModal() {
        this.isFieldModalOpen = false;
    }

    handleFieldChange(event) {
        // Update penampung sementara saat user menggeser field di dual-listbox
        this.tempSelectedFields = event.detail.value;
    }

    applyFieldSelection() {
        // Simpan perubahan secara permanen ke table
        this.selectedFields = [...this.tempSelectedFields];
        this.isFieldModalOpen = false;
    }

    // --- SORTING & PAGINATION ---
    onHandleSort(event) {
        const { fieldName, sortDirection } = event.detail;
        this.sortedBy = fieldName;
        this.sortDirection = sortDirection;
        const cloneData = [...this.campaignengagementevent];
        cloneData.sort((a, b) => {
            let v1 = a[fieldName];
            let v2 = b[fieldName];
            if (v1 instanceof Date) v1 = v1.getTime();
            if (v2 instanceof Date) v2 = v2.getTime();
            return sortDirection === 'asc' ? (v1 > v2 ? 1 : -1) : (v1 < v2 ? 1 : -1);
        });
        this.campaignengagementevent = cloneData;
    }

    get modalTotalPages() { return Math.ceil(this.campaignengagementevent.length / this.modalPageSize) || 1; }
    get modalPagedData() {
        const start = (this.modalCurrentPage - 1) * this.modalPageSize;
        return this.campaignengagementevent.slice(start, start + this.modalPageSize);
    }
    handleModalPrev() { if (this.modalCurrentPage > 1) this.modalCurrentPage--; }
    handleModalNext() { if (this.modalCurrentPage < this.modalTotalPages) this.modalCurrentPage++; }
    get canModalPrev() { return this.modalCurrentPage <= 1; }
    get canModalNext() { return this.modalCurrentPage >= this.modalTotalPages; }

    openAllDataModal() {
        this.modalCurrentPage = 1;
        this.isAllDataModalOpen = true;
    }
    closeAllDataModal() { this.isAllDataModalOpen = false; }
}