import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getCustomerAcquisition from '@salesforce/apex/Customer360Controller.getCustomerAcquisition';

export default class BrowseBehaviour extends LightningElement {
    @track data;
    @track error;
    @track isLoading = false;

    subscription = null;

    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        this.subscribeToMessageChannel();
    }

    subscribeToMessageChannel() {
        if (this.subscription) return;

        this.subscription = subscribe(
            this.messageContext,
            RECORD_SELECTED_CHANNEL,
            (message) => this.handleRecordSelected(message)
        );
    }

    handleRecordSelected(message) {
        const unifiedId = message.recordId;
        if (!unifiedId) return;

        this.fetchCustomerAcquisition(unifiedId);
    }

    fetchCustomerAcquisition(unifiedId) {
        this.isLoading = true;
        this.error = null;
        this.data = null;

        getCustomerAcquisition({ unifiedId })
            .then((results) => {
                console.log('Customer Acquisition Results:', results);
                
                // getCustomerAcquisition returns array, ambil data pertama
                if (results && results.length > 0) {
                    this.data = results[0];
                    console.log('Data:', this.data);
                } else {
                    this.error = 'No Customer Acquisition data found for this customer.';
                }
            })
            .catch((err) => {
                console.error('Error fetching Customer Acquisition:', err);
                this.error = err.body?.message || err.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    
    get campaignDisplay() {
        if (!this.data) return '';
        const campaign = this.data.campaign__c || '-';
        return campaign;
    }

    get sourceMediumDisplay() {
        if (!this.data) return '';
        const source_medium = this.data.source_medium__c || '-';
        return source_medium;
    }

    get referrerDisplay() {
        if (!this.data) return '';
        const referrer = this.data.referrer__c  || '-';
        return referrer;
    }
}