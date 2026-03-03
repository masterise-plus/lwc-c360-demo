import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getCustomerEngagement from '@salesforce/apex/Customer360Controller.getCustomerEngagement';

export default class CustomerEngagementTable extends LightningElement {
    @wire(MessageContext) messageContext;
    subscription;

    currentRecordId;
    targetRecordId = 'cf72c1c1c94bd7c10cf2477cf1c0c70b';

    @track engagements = [];
    @track isLoading = false;
    @track error;

    // --- Display Limits ---
    displayLimit = 5;

    // --- Modal Flags ---
    @track isFilterModalOpen = false;
    @track isFieldModalOpen = false;
    @track isAllDataModalOpen = false;

    // --- Filter State ---
    @track filters = {
        eventType: 'ALL',
        bu: 'OCBC',
        keyword: ''
    };

    @track draftFilters = {
        eventType: 'ALL',
        bu: 'OCBC',
        keyword: ''
    };

    // --- Field Selector State ---
    @track selectedFields = ['eventName', 'eventDescription', 'timeElapsed'];
    @track tempSelectedFields = [];

    // --- Sorting ---
    @track sortDirection = 'desc';
    @track sortedBy = 'timeElapsed';

    // --- Modal Pagination ---
    @track modalPageSize = 15;
    @track modalCurrentPage = 1;

    // --- Available Fields for Datatable ---
    availableFields = [
        { label: 'Event Name', value: 'eventName' },
        { label: 'Event Description', value: 'eventDescription' },
        { label: 'Business Unit', value: 'businessunits' },
        { label: 'Time', value: 'timeElapsed' },
        { label: 'Event Type', value: 'eventType' }
    ];

    // ─── LIFECYCLE ────────────────────────────────────────────────
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
            bu: 'OCBC',
            keyword: ''
        };
        this.filters = { ...defaultFilters };
        this.draftFilters = { ...defaultFilters };
    }

    // ─── DATA FETCHING ────────────────────────────────────────────
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
                        eventType: 'Location Event'
                    }, ...mappedEngagements];
                }

                this.engagements = mappedEngagements;
                this.modalCurrentPage = 1;
            })
            .catch((error) => {
                this.error = error?.body?.message || error.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // ─── FILTER LOGIC ─────────────────────────────────────────────
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
        return this.filteredEngagements.slice(0, this.displayLimit);
    }

    get canShowMore() {
        return this.filteredEngagements.length > this.displayLimit;
    }

    get hasData() {
        return this.filteredEngagements.length > 0;
    }

    get noData() {
        return this.currentRecordId && !this.isLoading && this.filteredEngagements.length === 0;
    }

    // ─── DATATABLE COLUMNS ────────────────────────────────────────
    get displayColumns() {
        return this.selectedFields.map((field) => {
            const meta = this.availableFields.find((f) => f.value === field);
            return {
                label: meta?.label || field,
                fieldName: field,
                type: 'text',
                sortable: true
            };
        });
    }

    // ─── FILTER OPTIONS ───────────────────────────────────────────
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

    // ─── FILTER MODAL HANDLERS ────────────────────────────────────
    openFilterModal() {
        this.draftFilters = { ...this.filters };
        this.isFilterModalOpen = true;
    }

    closeFilterModal() {
        this.isFilterModalOpen = false;
    }

    handleFilterChange(event) {
        this.draftFilters[event.target.name] = event.target.value;
    }

    applyFilters() {
        this.filters = { ...this.draftFilters };
        this.isFilterModalOpen = false;
    }

    clearFilters() {
        this.filters = { eventType: 'ALL', bu: 'OCBC', keyword: '' };
        this.isFilterModalOpen = false;
    }

    // ─── FIELD SELECTOR HANDLERS ──────────────────────────────────
    openFieldSelector() {
        this.tempSelectedFields = [...this.selectedFields];
        this.isFieldModalOpen = true;
    }

    closeFieldModal() {
        this.isFieldModalOpen = false;
    }

    handleFieldChange(event) {
        this.tempSelectedFields = event.detail.value;
    }

    applyFieldSelection() {
        this.selectedFields = [...this.tempSelectedFields];
        this.isFieldModalOpen = false;
    }

    // ─── SORTING ──────────────────────────────────────────────────
    onHandleSort(event) {
        const { fieldName, sortDirection } = event.detail;
        this.sortedBy = fieldName;
        this.sortDirection = sortDirection;
        // Sorting is applied to the raw engagements array;
        // filteredEngagements (getter) will reflect the new order.
        const cloneData = [...this.engagements];
        cloneData.sort((a, b) => {
            let v1 = a[fieldName] || '';
            let v2 = b[fieldName] || '';
            if (typeof v1 === 'string') v1 = v1.toLowerCase();
            if (typeof v2 === 'string') v2 = v2.toLowerCase();
            return sortDirection === 'asc' ? (v1 > v2 ? 1 : -1) : (v1 < v2 ? 1 : -1);
        });
        this.engagements = cloneData;
    }

    // ─── ALL DATA MODAL + PAGINATION ──────────────────────────────
    openAllDataModal() {
        this.modalCurrentPage = 1;
        this.isAllDataModalOpen = true;
    }

    closeAllDataModal() {
        this.isAllDataModalOpen = false;
    }

    get modalTotalPages() {
        return Math.ceil(this.filteredEngagements.length / this.modalPageSize) || 1;
    }

    get modalPagedData() {
        const start = (this.modalCurrentPage - 1) * this.modalPageSize;
        return this.filteredEngagements.slice(start, start + this.modalPageSize);
    }

    handleModalPrev() {
        if (this.modalCurrentPage > 1) this.modalCurrentPage--;
    }

    handleModalNext() {
        if (this.modalCurrentPage < this.modalTotalPages) this.modalCurrentPage++;
    }

    get canModalPrev() {
        return this.modalCurrentPage <= 1;
    }

    get canModalNext() {
        return this.modalCurrentPage >= this.modalTotalPages;
    }

    get pageSizeOptions() {
        return [
            { label: '10', value: '10' },
            { label: '15', value: '15' },
            { label: '25', value: '25' },
            { label: '50', value: '50' }
        ];
    }

    get currentPageSizeStr() {
        return String(this.modalPageSize);
    }

    handlePageSizeChange(event) {
        this.modalPageSize = parseInt(event.detail.value, 10);
        this.modalCurrentPage = 1;
    }

    get modalRowNumberOffset() {
        return (this.modalCurrentPage - 1) * this.modalPageSize;
    }

    // ─── REFRESH ──────────────────────────────────────────────────
    handleRefresh() {
        if (this.currentRecordId) {
            this.fetchEngagements(this.currentRecordId, { isManualRefresh: true });
        }
    }

    // ─── EVENT TYPE / ICON MAPPING ────────────────────────────────
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