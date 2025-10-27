import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getSalesOrderByUnifiedId from '@salesforce/apex/Customer360Controller.getSalesOrderByUnifiedId';

export default class ActivityList extends LightningElement {
    @wire(MessageContext) messageContext;
    subscription;

    @track salesorder = [];
    @track error;
    @track isLoading = false;

    // === Pagination state ===
    @track displayLimit = 5;
    @track showAll = false;

    // === Field selection state ===
    @track selectedFields = [
        'Transaction_Date',
        'Sales_Order_Id',
        'Store_Name',
        'ssot__GrandTotalAmount__c'
    ];
    @track tempSelectedFields = [];
    @track isFieldModalOpen = false;

    // === Sorting state ===
    defaultSortDirection = 'desc';
    sortDirection = 'desc';
    sortedBy = 'Transaction_Date';

    // === Available fields ===
    availableFields = [
        { label: 'Transaction ID', value: 'Sales_Order_Id', type: 'text' },
        { label: 'Transaction Date', value: 'Transaction_Date', type: 'date' },
        { label: 'Store ID', value: 'Store_Id', type: 'text' },
        { label: 'Store Name', value: 'Store_Name', type: 'text' },
        {
            label: 'Total Amount',
            value: 'ssot__TotalAmount__c',
            type: 'number',
            typeAttributes: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        {
            label: 'Total Discount Amount',
            value: 'Total_Discount_Amount__c',
            type: 'number',
            typeAttributes: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        {
            label: 'Total Tax Amount',
            value: 'ssot__TotalTaxAmount__c',
            type: 'number',
            typeAttributes: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        {
            label: 'Grand Total Amount',
            value: 'ssot__GrandTotalAmount__c',
            type: 'number',
            typeAttributes: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        }
    ];

    // === Lifecycle ===
    connectedCallback() {
        this.subscription = subscribe(
            this.messageContext,
            RECORD_SELECTED_CHANNEL,
            (message) => this.handleRecordSelection(message)
        );
    }

    handleRecordSelection(message) {
        if (!message?.recordId) return;
        this.loadSalesOrder(message.recordId);
    }

    // === Load data ===
    loadSalesOrder(unifiedId) {
        this.isLoading = true;
        this.salesorder = [];
        this.error = undefined;

        getSalesOrderByUnifiedId({ unifiedId })
            .then((result) => {
                const mapped = result.map((r) => ({
                    ...r,
                    Transaction_Date: r.Transaction_Date ? new Date(r.Transaction_Date) : null
                }));

                // Sort descending by Transaction_Date
                mapped.sort((a, b) => {
                    const dateA = a.Transaction_Date ? new Date(a.Transaction_Date) : 0;
                    const dateB = b.Transaction_Date ? new Date(b.Transaction_Date) : 0;
                    return dateB - dateA;
                });

                this.salesorder = mapped;
                this.sortedBy = 'Transaction_Date';
                this.sortDirection = 'desc';
                this.showAll = false;
                this.displayLimit = 5;
            })
            .catch((err) => {
                this.error = err?.body?.message || err.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // === Pagination ===
    get visibleSalesOrder() {
        return this.showAll
            ? this.salesorder
            : this.salesorder.slice(0, this.displayLimit);
    }

    get canShowMore() {
        return this.salesorder.length > this.displayLimit && !this.showAll;
    }

    get canShowLess() {
        return this.showAll;
    }

    handleShowMore() {
        this.showAll = true;
    }

    handleShowLess() {
        this.showAll = false;
    }

    // === Sorting ===
    sortBy(field, reverse, primer) {
        const key = primer ? (x) => primer(x[field]) : (x) => x[field];
        return function (a, b) {
            a = key(a);
            b = key(b);
            return reverse * ((a > b) - (b > a));
        };
    }

    onHandleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        const cloneData = [...this.salesorder];
        cloneData.sort(this.sortBy(sortedBy, sortDirection === 'asc' ? 1 : -1));
        this.salesorder = cloneData;
        this.sortDirection = sortDirection;
        this.sortedBy = sortedBy;
    }

    // === Field Modal ===
    openFieldSelector() {
        this.tempSelectedFields = [...this.selectedFields];
        this.isFieldModalOpen = true;
    }

    closeFieldModal() {
        this.isFieldModalOpen = false;
    }

    handleTempFieldSelection(event) {
        this.tempSelectedFields = event.detail.value;
    }

    applyFieldSelection() {
        this.selectedFields = [...this.tempSelectedFields];
        this.closeFieldModal();
    }

    // === Columns ===
    get displayColumns() {
        return this.selectedFields.map((field) => {
            const fieldMeta = this.availableFields.find((f) => f.value === field);
            return {
                label: fieldMeta?.label || field,
                fieldName: field,
                type: fieldMeta?.type || 'text',
                typeAttributes: fieldMeta?.typeAttributes,
                sortable: true
            };
        });
    }

    // === Helpers ===
    get noData() {
        return !this.isLoading && Array.isArray(this.salesorder) && this.salesorder.length === 0;
    }
}
