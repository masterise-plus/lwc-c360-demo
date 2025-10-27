import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getSalesOrderItemByUnifiedId from '@salesforce/apex/Customer360Controller.getSalesOrderItemByUnifiedId';

export default class ActivityListItem extends LightningElement {
    @wire(MessageContext) messageContext;
    subscription;

    @track salesorderitem = [];
    @track error;
    @track isLoading = false;

    @track selectedFields = [
        'Transaction_Date',
        'Sales_Order_Id',
        'Product_Name',
        'ssot__OrderedQuantity__c',
        'ssot__TotalLineAmount__c'
    ];
    @track tempSelectedFields = [];
    @track isFieldModalOpen = false;

    defaultSortDirection = 'desc';
    sortDirection = 'desc';
    sortedBy = 'Transaction_Date';

    @track displayLimit = 5;
    @track showAll = false;

    availableFields = [
        { label: 'Transaction ID', value: 'Sales_Order_Id', type: 'text' },
        { label: 'Transaction Date', value: 'Transaction_Date', type: 'date' },
        { label: 'Store ID', value: 'Store_Id', type: 'text' },
        { label: 'Store Name', value: 'Store_Name', type: 'text' },
        { label: 'Product ID', value: 'Product_Id', type: 'text' },
        { label: 'Product Name', value: 'Product_Name', type: 'text' },
        { label: 'Brand', value: 'Brand', type: 'text' },
        { label: 'Category Level 1', value: 'Category', type: 'text' },
        { label: 'Category Level 2', value: 'Category_Lv2', type: 'text' },
        {
            label: 'Quantity',
            value: 'ssot__OrderedQuantity__c',
            type: 'number',
            typeAttributes: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        {
            label: 'Unit Price',
            value: 'ssot__UnitPriceAmount__c',
            type: 'number',
            typeAttributes: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        },
        {
            label: 'Total Line',
            value: 'ssot__TotalLineAmount__c',
            type: 'number',
            typeAttributes: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        }
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
        this.loadSalesOrderItem(message.recordId);
    }

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
                    const dateA = a.Transaction_Date ? new Date(a.Transaction_Date) : 0;
                    const dateB = b.Transaction_Date ? new Date(b.Transaction_Date) : 0;
                    return dateB - dateA;
                });

                this.salesorderitem = [...mapped];
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

    get visibleSalesOrderItem() {
        return this.showAll
            ? this.salesorderitem
            : this.salesorderitem.slice(0, this.displayLimit);
    }

    get canShowMore() {
        return this.salesorderitem.length > this.displayLimit && !this.showAll;
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
        const cloneData = [...this.salesorderitem];

        cloneData.sort(this.sortBy(sortedBy, sortDirection === 'asc' ? 1 : -1));
        this.salesorderitem = cloneData;
        this.sortDirection = sortDirection;
        this.sortedBy = sortedBy;
    }

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

    get noData() {
        return !this.isLoading && Array.isArray(this.salesorderitem) && this.salesorderitem.length === 0;
    }
}
