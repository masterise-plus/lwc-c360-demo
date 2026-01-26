import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getCustomerEngagement from '@salesforce/apex/Customer360Controller.getCustomerEngagement';

export default class CustomerEngagement extends LightningElement {
    @wire(MessageContext) messageContext;
    subscription;

    currentRecordId;
    targetRecordId = 'cf72c1c1c94bd7c10cf2477cf1c0c70b';

    @track engagements = [];
    @track isLoading = false;
    @track error;
    previewLimit = 3;

    @track isFilterModalOpen = false;
    @track isAllDataModalOpen = false;

    // Filter Default
    @track filters = {
        eventType: 'ALL',
        bu: 'iBox', 
        keyword: ''
    };

    @track draftFilters = {
        eventType: 'ALL',
        bu: 'iBox',
        keyword: ''
    };

    connectedCallback() {
        this.subscription = subscribe(
            this.messageContext,
            RECORD_SELECTED_CHANNEL,
            (message) => this.handleRecordSelection(message)
        );
    }

    handleRecordSelection(message) {
        if (!message || !message.recordId) return;
        this.currentRecordId = message.recordId;
        this.resetFiltersToDefault();
        this.fetchEngagements(message.recordId);
    }

    resetFiltersToDefault() {
        const defaultFilters = {
            eventType: 'ALL',
            bu: 'iBox',
            keyword: ''
        };

        this.filters = { ...defaultFilters };
        this.draftFilters = { ...defaultFilters };
    }

    fetchEngagements(recordId, { isManualRefresh = false } = {}) {
        this.isLoading = true;
        this.error = undefined;

        getCustomerEngagement({ unifiedId: recordId })
            .then((result) => {
                let mappedEngagements = (result || []).map((row, idx) => {
                    return {
                        key: `${row.event_name}-${idx}`,
                        eventName: row.event_name || '',
                        eventDescription: row.event_description || '',
                        timeElapsed: row.time_elapsed || '',
                        businessunits: row.businessunits || '',
                        iconName: this.getIconName(row.event_name),
                        eventType: this.getEventType(row.event_name)
                    };
                });

                if (isManualRefresh && recordId === this.targetRecordId) {
                    mappedEngagements = [{
                        key: `sim-loc-${Date.now()}`,
                        eventName: 'Location Event',
                        eventDescription: 'Visit iBox Mall Kelapa Gading',
                        timeElapsed: this.formatToLocalWIB(new Date()),
                        businessunits: 'iBox',
                        iconName: 'standard:location',
                        eventType: 'LOCATION'
                    }, ...mappedEngagements];
                }

                this.engagements = mappedEngagements;
            })
            .catch((error) => {
                this.error = error?.body?.message || error.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // --- LOGIKA FILTER ---
    get filteredEngagements() {
        const { eventType, bu, keyword } = this.filters;
        const kw = (keyword || '').toLowerCase();

        return this.engagements.filter(e => {
            const matchType = (eventType === 'ALL' || e.eventType === eventType);
            const matchBu = (bu === 'ALL' || e.businessunits === bu);
            const matchKeyword = !kw || 
                e.eventName.toLowerCase().includes(kw) || 
                e.eventDescription.toLowerCase().includes(kw);

            return matchType && matchBu && matchKeyword;
        });
    }

    get visibleEngagements() {
        return this.filteredEngagements.slice(0, this.previewLimit);
    }

    get canShowMore() {
        return this.filteredEngagements.length > this.previewLimit;
    }

    // --- OPTIONS (STATIC) ---
    get buOptions() {
        return [
            { label: 'All Business Units', value: 'ALL' },
            { label: 'Erafone', value: 'Erafone' },
            { label: 'Eraspace', value: 'Eraspace' },
            { label: 'Paris Baguette', value: 'Paris Baguette' },
            { label: 'Grand Lucky', value: 'Grand Lucky' },
            { label: 'JD Sports', value: 'JD Sports' },
            { label: 'iBox', value: 'iBox' }
        ];
    }

    get eventTypeOptions() {
        return [
            { label: 'All', value: 'ALL' },
            { label: 'Visit', value: 'VISIT' },
            { label: 'Cart', value: 'CART' },
            { label: 'Email Open', value: 'OPEN' },
            { label: 'Email Click', value: 'CLICK' },
            { label: 'Email', value: 'EMAIL' },
            { label: 'Chat', value: 'CHAT' },
            { label: 'Purchase', value: 'PURCHASE' },
            { label: 'Location', value: 'LOCATION' },
            { label: 'Other', value: 'OTHER' }
        ];

    }
    // --- MODAL HANDLERS ---
    openFilterModal() {
        this.draftFilters = { ...this.filters };
        this.isFilterModalOpen = true;
    }

    closeFilterModal() { this.isFilterModalOpen = false; }

    handleFilterChange(event) {
        this.draftFilters[event.target.name] = event.target.value;
    }

    applyFilters() {
        this.filters = { ...this.draftFilters };
        this.isFilterModalOpen = false;
    }

    clearFilters() {
        this.filters = { eventType: 'ALL', bu: 'Erafone', keyword: '' };
        this.isFilterModalOpen = false;
    }

    openAllDataModal() { this.isAllDataModalOpen = true; }
    closeAllDataModal() { this.isAllDataModalOpen = false; }

    handleRefresh() {
        if (this.currentRecordId) {
            this.fetchEngagements(this.currentRecordId, { isManualRefresh: true });
        }
    }

    getEventType(name = '') {
        const n = name.toLowerCase();
        if (n.includes('visit')) return 'VISIT';
        if (n.includes('purchase')) return 'PURCHASE';
        if (n.includes('location')) return 'LOCATION';
        if (n.includes('email')) return 'EMAIL';
        return 'OTHER';
    }

    getIconName(name = '') {
        const n = name.toLowerCase();
        if (n.includes('visit')) return 'standard:channel_programs';
        if (n.includes('location')) return 'standard:location';
        if (n.includes('purchase')) return 'standard:orders';
        if (n.includes('email')) return 'standard:email_chatter';
        return 'standard:outcome_activity';
    }

    formatToLocalWIB(date) {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
        }).format(date) + ' WIB';
    }
}