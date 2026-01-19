import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getSalesOrderItemByUnifiedId from '@salesforce/apex/Customer360Controller.getSalesOrderItemByUnifiedId';

export default class ActivityListItem extends LightningElement {

    @wire(MessageContext) messageContext;

    @track salesorderitem = [];
    @track error;
    @track isLoading = false;

    @track isFieldModalOpen = false;
    @track isAllDataModalOpen = false;

    @track selectedFields = [
        'Transaction_Date',
        'Sales_Order_Id',
        'Product_Name',
        'ssot__OrderedQuantity__c',
        'ssot__TotalLineAmount__c'
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

    availableFields = [
        { label: 'Transaction ID', value: 'Sales_Order_Id', type: 'text' },
        { label: 'Transaction Date', value: 'Transaction_Date', type: 'date' },
        { label: 'Product Name', value: 'Product_Name', type: 'text' },
        { label: 'Quantity', value: 'ssot__OrderedQuantity__c', type: 'number' },
        { label: 'Total Line', value: 'ssot__TotalLineAmount__c', type: 'number' }
    ];

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
                const mapped = result.map((r) => ({
                    ...r,
                    Transaction_Date: r.Transaction_Date
                        ? new Date(r.Transaction_Date)
                        : null
                }));

                mapped.sort((a, b) => {
                    return (b.Transaction_Date || 0) - (a.Transaction_Date || 0);
                });

                this.salesorderitem = mapped;
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
    get visibleSalesOrderItem() {
        return this.salesorderitem.slice(0, this.displayLimit);
    }

    get canShowMore() {
        return this.salesorderitem.length > this.displayLimit;
    }

    /* =======================
       Sorting (shared)
    ======================= */
    onHandleSort(event) {
        const { fieldName, sortDirection } = event.detail;
        this.sortedBy = fieldName;
        this.sortDirection = sortDirection;

        const cloneData = [...this.salesorderitem];
        cloneData.sort((a, b) => {
            const v1 = a[fieldName];
            const v2 = b[fieldName];
            return sortDirection === 'asc'
                ? (v1 > v2 ? 1 : -1)
                : (v1 < v2 ? 1 : -1);
        });
        this.salesorderitem = cloneData;
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
                sortable: true
            };
        });
    }

    /* =======================
       Modal pagination logic
    ======================= */
  
    modalCurrentPage = 1

    get modalTotalPages() {
        return Math.ceil(this.salesorderitem.length / this.modalPageSize);
    }

    get modalPagedData() {
        const start = (this.modalCurrentPage - 1) * this.modalPageSize;
        const end = start + this.modalPageSize;
        return this.salesorderitem.slice(start, end);
    }

    handleModalPrev() {
        if (this.modalCurrentPage > 1) {
            this.modalCurrentPage--;
            this.modalPagedData();
        }
    }

    handleModalNext() {
        if (this.modalCurrentPage < this.modalTotalPages) {
            this.modalCurrentPage++;
            this.modalPagedData();
        }
    }

    get canModalPrev() {
        return this.modalCurrentPage === 1;
    }

    get canModalNext() {
        return this.modalCurrentPage === this.modalTotalPages;
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
        return !this.isLoading && this.salesorderitem.length === 0;
    }
}