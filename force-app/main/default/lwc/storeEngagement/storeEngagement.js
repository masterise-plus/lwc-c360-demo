import { LightningElement, api, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';

export default class StoreEngagement extends LightningElement {
    @wire(MessageContext) messageContext;

    subscription = null;
    
    // Tracked properties
    @track currentRecordId = null;
    @track isLoading = false;
    
    // API properties for external data binding
    @api recordId;
    
    // Track engagement data
    @track engagementData = {
        averageDuration: '650',
        lastStoreVisit: '07.12.2022',
        lastVisitDuration: '324'
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
            return;
        }

        this.isLoading = true;
        this.currentRecordId = message.recordId;

        // Simulate data loading (in real implementation, you would call Apex here)
        // For now, we just show the hardcoded data when a record is selected
        this.isLoading = false;
    }

    // Getter for average duration formatted
    get averageDuration() {
        return this.engagementData?.averageDuration || '0';
    }

    // Getter for last store visit date
    get lastStoreVisit() {
        return this.engagementData?.lastStoreVisit || '-';
    }

    // Getter for duration of last visit
    get lastVisitDuration() {
        return this.engagementData?.lastVisitDuration || '0';
    }

    // Getter to check if engagement data exists (based on recordId availability)
    get hasEngagementData() {
        return !!this.currentRecordId;
    }

    // Method to update engagement data externally
    @api
    setEngagementData(data) {
        if (data) {
            this.engagementData = {
                averageDuration: data.averageDuration || '0',
                lastStoreVisit: data.lastStoreVisit || '-',
                lastVisitDuration: data.lastVisitDuration || '0'
            };
        }
    }

    // Format number with space separator for thousands
    formatNumber(num) {
        if (!num) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
}