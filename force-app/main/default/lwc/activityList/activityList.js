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

    @track isFieldModalOpen = false;
    @track isAllDataModalOpen = false;

    // === Field selection state ===
    @track selectedFields = [
        'Transaction_Date',
        'Store_Name',
        'ssot__GrandTotalAmount__c'
    ];
    @track tempSelectedFields = [];

    /* =======================
        Preview table
    ======================= */
    displayLimit = 5;
    sortDirection = 'desc';
    sortedBy = 'Transaction_Date';

    /* =======================
        Modal pagination
    ======================= */
    modalPageSize = 15;
    @track modalCurrentPage = 1;

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

                // Default sort descending
                mapped.sort((a, b) => {
                    return (b.Transaction_Date || 0) - (a.Transaction_Date || 0);
                });

                this.salesorder = mapped;
                this.modalCurrentPage = 1; // reset modal page
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
    get visibleSalesOrder() {
        return this.salesorder.slice(0, this.displayLimit);
    }

    get canShowMore() {
        return this.salesorder.length > this.displayLimit;
    }

    /* =======================
        Sorting (shared)
    ======================= */
    onHandleSort(event) {
        const { fieldName, sortDirection } = event.detail;
        this.sortedBy = fieldName;
        this.sortDirection = sortDirection;

        const cloneData = [...this.salesorder];
        cloneData.sort((a, b) => {
            const v1 = a[fieldName];
            const v2 = b[fieldName];
            return sortDirection === 'asc'
                ? (v1 > v2 ? 1 : -1)
                : (v1 < v2 ? 1 : -1);
        });
        this.salesorder = cloneData;
        this.modalCurrentPage = 1; // reset page after sort
    }

    /* =======================
        Field selector
    ======================= */
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

    get displayColumns() {
        return this.selectedFields.map((field) => {
            const meta = this.availableFields.find((f) => f.value === field);
            return {
                label: meta?.label || field,
                fieldName: field,
                type: meta?.type || 'text',
                typeAttributes: meta?.typeAttributes,
                sortable: true
            };
        });
    }

    /* =======================
        Modal pagination logic
    ======================= */
    get modalTotalPages() {
        return Math.ceil(this.salesorder.length / this.modalPageSize);
    }

    get modalPagedData() {
        const start = (this.modalCurrentPage - 1) * this.modalPageSize;
        const end = start + this.modalPageSize;
        return this.salesorder.slice(start, end);
    }

    handleModalPrev() {
        if (this.modalCurrentPage > 1) {
            this.modalCurrentPage--;
        }
    }

    handleModalNext() {
        if (this.modalCurrentPage < this.modalTotalPages) {
            this.modalCurrentPage++;
        }
    }

    get canModalPrev() {
        return this.modalCurrentPage === 1;
    }

    get canModalNext() {
        return this.modalCurrentPage === this.modalTotalPages || this.modalTotalPages === 0;
    }

    /* =======================
        Modal open / close
    ======================= */
    openAllDataModal() {
        this.modalCurrentPage = 1;
        this.isAllDataModalOpen = true;
    }

    closeAllDataModal() {
        this.isAllDataModalOpen = false;
    }

    get noData() {
        return !this.isLoading && this.salesorder.length === 0;
    }
}