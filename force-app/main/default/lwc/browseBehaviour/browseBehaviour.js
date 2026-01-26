import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getBrowseBehaviour from '@salesforce/apex/Customer360Controller.getBrowseBehaviour';

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

        this.fetchBrowseBehaviour(unifiedId);
    }

    fetchBrowseBehaviour(unifiedId) {
        this.isLoading = true;
        this.error = null;
        this.data = null;

        getBrowseBehaviour({ unifiedId })
            .then((results) => {
                console.log('Browse Behaviour Results:', results);
                
                // getBrowseBehaviour returns array, ambil data pertama
                if (results && results.length > 0) {
                    this.data = results[0];
                    console.log('Data:', this.data);
                } else {
                    this.error = 'No browse behaviour data found for this customer.';
                }
            })
            .catch((err) => {
                console.error('Error fetching browse behaviour:', err);
                this.error = err.body?.message || err.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // Getter untuk display browser dengan fallback
    get browserDisplay() {
        if (!this.data) return '';
        const browser = this.data.browser__c || 'Chrome';
        const version = this.data.browser_version__c || '';
        return `${browser} ${version}`.trim();
    }

    // Getter untuk geo display
    get geoDisplay() {
        if (!this.data) return '';
        const region = this.data.geo_region__c || '';
        const country = this.data.geo_country__c || '';
        const language = this.data.language__c || '';
        const timezone = this.data.timezone__c || '';
        
        return `${region}, ${country} | ${language} | ${timezone}`;
    }

    // Getter untuk mobile app version display
    get mobileAppDisplay() {
        if (!this.data) return 'No';
        const installed = this.data.installed_mobile_app__c || 'No';
        const version = this.data.mobile_app_version__c;
        
        if (installed === 'Yes' && version) {
            return `Yes (${version})`;
        }
        return installed;
    }
}