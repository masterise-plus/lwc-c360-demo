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
            { label: 'iBox', value: 'iBox' },
            { label: 'OCBC', value: 'OCBC' }
        ];
    }

    get eventTypeOptions() {
        return [
            { label: 'All', value: 'ALL' },
            { label: 'Add to Cart', value: 'Add to Cart' },
            { label: 'Add to Wishlish', value: 'Add to Wishlish' },
            { label: 'Click Email', value: 'Click Email' },
            { label: 'Click Whatsapp Event', value: 'Click Whatsapp Event' },
            { label: 'Home Page', value: 'Home Page' },
            { label: 'Location Event', value: 'Location Event' },
            { label: 'Login Page', value: 'Login Page' },
            { label: 'Purchase', value: 'Purchase' },
            { label: 'Read Whatsapp Event', value: 'Read Whatsapp Event' },
            { label: 'Search', value: 'Search' },
            { label: 'View Page', value: 'View Page' },
            { label: 'Website Event', value: 'Website Event' },
            { label: 'Website Visit', value: 'Website Visit' },
            { label: 'Wishlist Page', value: 'Wishlist Page' },
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
        const defaultFilters = { eventType: 'ALL', bu: 'iBox', keyword: '' };
        this.filters = { ...defaultFilters };
        this.draftFilters = { ...defaultFilters };
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
        if (n.includes('add to cart')) return 'Add to Cart';
        if (n.includes('add to wish')) return 'Add to Wishlish';
        if (n.includes('click email')) return 'Click Email';
        if (n.includes('click whatsapp')) return 'Click Whatsapp Event';
        if (n.includes('home page')) return 'Home Page';
        if (n.includes('location')) return 'Location Event';
        if (n.includes('login')) return 'Login Page';
        if (n.includes('purchase')) return 'Purchase';
        if (n.includes('read whatsapp')) return 'Read Whatsapp Event';
        if (n.includes('search')) return 'Search';
        if (n.includes('view page')) return 'View Page';
        if (n.includes('website event')) return 'Website Event';
        if (n.includes('website visit')) return 'Website Visit';
        if (n.includes('wishlist page')) return 'Wishlist Page';
        return 'OTHER';
    }

    getIconName(name = '') {
        const n = name.toLowerCase();
        if (n.includes('add to cart')) return 'standard:webcart';
        if (n.includes('add to wish')) return 'standard:favorite';
        if (n.includes('click email')) return 'standard:email_chatter';
        if (n.includes('click whatsapp')) return 'standard:whatsapp';
        if (n.includes('home page')) return 'standard:home';
        if (n.includes('location')) return 'standard:address';
        if (n.includes('login')) return 'standard:portal';
        if (n.includes('purchase')) return 'standard:checkout';
        if (n.includes('read whatsapp')) return 'standard:whatsapp';
        if (n.includes('search')) return 'standard:search';
        if (n.includes('view page')) return 'standard:channel_programs';
        if (n.includes('website event')) return 'standard:channel_programs';
        if (n.includes('website visit')) return 'standard:channel_programs';
        if (n.includes('wishlist page')) return 'standard:favorite';
        return 'standard:outcome_activity';
    }

    formatToLocalWIB(date) {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
        }).format(date) + ' WIB';
    }
}