import { LightningElement, api, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';

export default class DeliveryPreferences extends LightningElement {
    @wire(MessageContext) messageContext;

    subscription = null;
    
    // Tracked properties
    @track currentRecordId = null;
    @track isLoading = false;
    
    // API properties (exposed in meta.xml)
    @api totalPickupOrders = 15;
    @api totalHomeDeliveries = 32;
    @api avgDeliveryTime = 25;
    @api orderSatisfaction = 98;

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
            return;
        }

        this.isLoading = true;
        this.currentRecordId = message.recordId;

        // Simulate data loading (in real implementation, you would call Apex here)
        // For now, we just show the hardcoded data when a record is selected
        this.isLoading = false;
    }

    get hasData() {
        return !!this.currentRecordId;
    }
}