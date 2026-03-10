import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getAbandonedCart from '@salesforce/apex/Customer360Controller.getAbandonedCart';

export default class AbandonedCart extends LightningElement {

    @wire(MessageContext) messageContext;

    @track cartItems = [];
    @track error;
    @track isLoading = false;
    @track isAllDataModalOpen = false;

    displayLimit = 3;

    /* =======================
       LMS subscription
    ======================= */
    connectedCallback() {
        subscribe(
            this.messageContext,
            RECORD_SELECTED_CHANNEL,
            (message) => this.handleRecordSelection(message)
        );
    }

    handleRecordSelection(message) {
        if (!message?.recordId) return;
        this.loadAbandonedCart(message.recordId);
    }

    /* =======================
       Data loading
    ======================= */
    loadAbandonedCart(unifiedId) {
        this.isLoading = true;
        this.cartItems = [];
        this.error = undefined;

        getAbandonedCart({ unifiedId })
            .then((result) => {
                const rows = Array.isArray(result) ? result : [];

                const mapped = rows
                    .map((r) => ({
                        ...r,
                        _abandonedDate: r.abandoned_at__c ? new Date(r.abandoned_at__c) : null
                    }))
                    .sort((a, b) => (b._abandonedDate || 0) - (a._abandonedDate || 0));

                this.cartItems = mapped;
            })
            .catch((err) => {
                this.error = err?.body?.message || err.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /* =======================
       Preview helpers
    ======================= */
    get visibleItems() {
        return this.cartItems.slice(0, this.displayLimit);
    }

    get canShowMore() {
        return this.cartItems.length > this.displayLimit;
    }

    get noData() {
        return !this.isLoading && this.cartItems.length === 0;
    }

    /* =======================
       Card formatting (preview)
    ======================= */
    get visibleProductCards() {
        return (this.visibleItems || []).map((x) => this.formatCard(x));
    }

    /* =======================
       Card formatting (modal - all data)
    ======================= */
    get modalProductCards() {
        return (this.cartItems || []).map((x) => this.formatCard(x));
    }

    formatCard(x) {
        const name = x.ssot__Name__c || '—';
        const dateStr = x._abandonedDate ? this.formatToLocalWIB(x._abandonedDate) : '—';
        const daysAgo = x._abandonedDate ? this.getDaysAgo(x._abandonedDate) : '';

        const qty = Number(x.quantity__c);
        const qtySafe = Number.isFinite(qty) ? qty : 0;

        const price = Number(x.ssot__MSRPAmount__c);
        const priceSafe = Number.isFinite(price) ? price : 0;

        const img = x.URL__c || null;

        return {
            ...x,
            _id: x.cart_id__c || x.product_id__c || name,
            _name: name,
            _date: dateStr,
            _daysAgo: daysAgo,
            _qty: qtySafe,
            _price: this.formatIDR(priceSafe),
            _img: img
        };
    }

    getDaysAgo(dateValue) {
        if (!dateValue) return '';
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (Number.isNaN(date.getTime())) return '';

        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${diffDays} days ago`;
    }

    /* =======================
       Formatting utilities
    ======================= */
    formatIDR(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 'Rp 0';
        return n.toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

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

    /* =======================
       Modal controls
    ======================= */
    openAllDataModal() {
        this.isAllDataModalOpen = true;
    }

    closeAllDataModal() {
        this.isAllDataModalOpen = false;
    }
}