import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getSalesOrderItemByUnifiedId from '@salesforce/apex/Customer360Controller.getSalesOrderItemByUnifiedId';


export default class CustomerProductListOffline extends LightningElement {

    @wire(MessageContext) messageContext;

    @track salesorderitem = [];
    @track error;
    @track isLoading = false;
    @track isAllDataModalOpen = false; // ADDED: Missing modal state

    displayLimit = 3;
    sortDirection = 'desc';
    sortedBy = 'Transaction_Date';

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
        this.loadSalesOrderItem(message.recordId);
    }

    /* =======================
       Data loading
    ======================= */
    loadSalesOrderItem(unifiedId) {
        this.isLoading = true;
        this.salesorderitem = [];
        this.error = undefined;

        getSalesOrderItemByUnifiedId({ unifiedId })
            .then((result) => {
                const rows = Array.isArray(result) ? result : [];

                const mapped = rows
                    .filter((r) => r.Retail_Store === 'Erafone')  // ✅ filter di sini
                    .map((r) => ({
                    ...r,
                    Transaction_Date: r.Transaction_Date ? new Date(r.Transaction_Date) : null
                    }))
                    .sort((a, b) => (b.Transaction_Date || 0) - (a.Transaction_Date || 0));

                this.salesorderitem = mapped; // ✅ assign sekali, hasil sudah terfilter
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
    get visibleSalesOrderItem() {
        return this.salesorderitem.slice(0, this.displayLimit);
    }

    get canShowMore() {
        return this.salesorderitem.length > this.displayLimit;
    }

    get noData() {
        return !this.isLoading && this.salesorderitem.length === 0;
    }

    /* =======================
       Product card formatting (for preview)
    ======================= */
    get visibleProductCards() {
        const list = this.visibleSalesOrderItem || [];
        return list.map((x) => this.formatProductCard(x));
    }

    /* =======================
       Product card formatting (for modal - all data)
    ======================= */
    get modalProductCards() {
        const list = this.salesorderitem || [];
        return list.map((x) => this.formatProductCard(x));
    }

    formatProductCard(x) {
        const name = x.Product_Name || '—';
        const dateStr = x.Transaction_Date ? this.formatToLocalWIB(x.Transaction_Date) : '—';

        const qty = Number(x.ssot__OrderedQuantity__c);
        const qtySafe = Number.isFinite(qty) ? qty : 0;

        const price = Number(x.ssot__TotalLineAmount__c);
        const priceSafe = Number.isFinite(price) ? price : 0;

        const img = x.URL || null;

        return {
            ...x,
            _name: name,
            _date: dateStr,
            _qty: qtySafe,
            _price: this.formatIDR(priceSafe),
            _img: img
        };
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