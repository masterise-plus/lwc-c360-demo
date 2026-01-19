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

    // preview show max 3
    previewLimit = 3;

    // --- MODAL STATES ---
    @track isFilterModalOpen = false;
    @track isAllDataModalOpen = false;

    // applied filters (dipakai buat list)
    @track filters = {
        eventType: 'ALL',
        bu: 'ALL',
        keyword: ''
    };

    // draft filters (di modal)
    @track draftFilters = {
        eventType: 'ALL',
        bu: 'ALL',
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
        if (!message || !message.recordId) {
            this.currentRecordId = undefined;
            this.error = 'Invalid recordId received';
            this.engagements = [];
            return;
        }

        this.currentRecordId = message.recordId;
        this.fetchEngagements(message.recordId);
    }

    fetchEngagements(recordId, { isManualRefresh = false } = {}) {
        this.isLoading = true;
        this.error = undefined;

        getCustomerEngagement({ unifiedId: recordId })
            .then((result) => {
                let mappedEngagements = (result || []).map((row, idx) => {
                    const eventName = row.event_name || '';
                    const eventDescription = row.event_description || '';
                    const timeElapsed = row.time_elapsed || '';
                    const businessunits = row.businessunits || '';

                    return {
                        key: `${eventName}-${timeElapsed}-${idx}`,
                        eventName,
                        eventDescription,
                        timeElapsed,
                        businessunits,
                        iconName: this.getIconName(eventName),
                        eventType: this.getEventType(eventName)
                    };
                });

                // demo: add simulated entry only if manual refresh + target record
                if (isManualRefresh && recordId === this.targetRecordId) {
                    const simulatedEntry = {
                        key: `Location Event-${Date.now()}`,
                        eventName: 'Location Event',
                        eventDescription: 'Visit iBox Mall Kelapa Gading',
                        timeElapsed: this.formatToLocalWIB(new Date()),
                        businessunits: 'iBox',
                        iconName: 'standard:location',
                        eventType: 'LOCATION'
                    };
                    mappedEngagements = [simulatedEntry, ...mappedEngagements];
                }

                this.engagements = mappedEngagements;
            })
            .catch((error) => {
                this.error = error?.body?.message || error.message;
                this.engagements = [];
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // -------------------------
    // FILTER + PREVIEW
    // -------------------------
    get filteredEngagements() {
        const { eventType, bu, keyword } = this.filters;
        const kw = (keyword || '').trim().toLowerCase();

        return (this.engagements || []).filter((e) => {
            const matchType = eventType === 'ALL' ? true : e.eventType === eventType;
            const matchBu = bu === 'ALL' ? true : (e.businessunits || '') === bu;

            const hay = `${e.eventName || ''} ${e.eventDescription || ''}`.toLowerCase();
            const matchKeyword = kw ? hay.includes(kw) : true;

            return matchType && matchBu && matchKeyword;
        });
    }

    get visibleEngagements() {
        const list = this.filteredEngagements || [];
        return list.slice(0, this.previewLimit);
    }

    get canShowMore() {
        return (this.filteredEngagements?.length || 0) > this.previewLimit;
    }

    // -------------------------
    // FILTER MODAL HANDLERS
    // -------------------------
    openFilterModal() {
        this.draftFilters = { ...this.filters };
        this.isFilterModalOpen = true;
    }

    closeFilterModal() {
        this.isFilterModalOpen = false;
    }

    handleFilterChange(event) {
        const { name, value } = event.target;
        this.draftFilters = { ...this.draftFilters, [name]: value };
    }

    applyFilters() {
        this.filters = { ...this.draftFilters };
        this.isFilterModalOpen = false;

        // optional: kalau modal all data lagi terbuka, biarkan tetap terbuka dan otomatis update list
    }

    clearFilters() {
        this.draftFilters = { eventType: 'ALL', bu: 'ALL', keyword: '' };
        this.filters = { eventType: 'ALL', bu: 'ALL', keyword: '' };
        this.isFilterModalOpen = false;
    }

    // -------------------------
    // ALL DATA MODAL HANDLERS
    // -------------------------
    openAllDataModal() {
        this.isAllDataModalOpen = true;
    }

    closeAllDataModal() {
        this.isAllDataModalOpen = false;
    }

    // -------------------------
    // OPTIONS
    // -------------------------
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

    get buOptions() {
        const set = new Set(
            (this.engagements || [])
                .map((e) => (e.businessunits || '').trim())
                .filter(Boolean)
        );
        const values = Array.from(set).sort((a, b) => a.localeCompare(b));
        return [{ label: 'All', value: 'ALL' }, ...values.map(v => ({ label: v, value: v }))];
    }

    // -------------------------
    // REFRESH
    // -------------------------
    handleRefresh() {
        if (!this.currentRecordId) {
            this.error = 'Select a customer to refresh engagement.';
            return;
        }
        if (this.currentRecordId !== this.targetRecordId) {
            // keep silent (demo-only)
            return;
        }
        this.fetchEngagements(this.currentRecordId, { isManualRefresh: true });
    }

    // -------------------------
    // EVENT TYPE & ICON
    // -------------------------
    getEventType(eventName) {
        if (!eventName) return 'OTHER';
        const name = eventName.toLowerCase();

        if (name.includes('visit')) return 'VISIT';
        if (name.includes('cart')) return 'CART';
        if (name.includes('open')) return 'OPEN';
        if (name.includes('click')) return 'CLICK';
        if (name.includes('location')) return 'LOCATION';
        if (name.includes('email')) return 'EMAIL';
        if (name.includes('chat')) return 'CHAT';
        if (name.includes('purchase')) return 'PURCHASE';
        return 'OTHER';
    }

    getIconName(eventName) {
        if (!eventName) return 'standard:outcome_activity';
        const name = eventName.toLowerCase();

        if (name.includes('visit')) return 'standard:channel_programs';
        if (name.includes('cart')) return 'standard:webcart';
        if (name.includes('open')) return 'standard:email_chatter';
        if (name.includes('click')) return 'standard:email_chatter';
        if (name.includes('location')) return 'standard:location';
        if (name.includes('email')) return 'standard:email_chatter';
        if (name.includes('chat')) return 'standard:chat';
        if (name.includes('purchase')) return 'standard:orders';
        return 'standard:outcome_activity';
    }

    // -------------------------
    // DATE FORMATTER
    // -------------------------
    formatToLocalWIB(dateValue) {
        if (!dateValue) return '';

        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (Number.isNaN(date.getTime())) return '';

        const formatter = new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jakarta'
        });

        const parts = formatter.formatToParts(date).reduce((acc, part) => {
            acc[part.type] = part.value;
            return acc;
        }, {});

        const hour = parts.hour ? parts.hour.padStart(2, '0') : '00';
        const minute = parts.minute ? parts.minute.padStart(2, '0') : '00';

        return `${parts.day} ${parts.month} ${parts.year} ${hour}:${minute} WIB`;
    }
}