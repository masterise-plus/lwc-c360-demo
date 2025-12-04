import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getCustomerEngagement from '@salesforce/apex/Customer360Controller.getCustomerEngagement';

export default class CustomerEngagement extends LightningElement {
    @wire(MessageContext) messageContext;
    subscription;

    @track engagements = [];
    @track isLoading = false;
    @track error;

    connectedCallback() {
        this.subscription = subscribe(
            this.messageContext,
            RECORD_SELECTED_CHANNEL,
            (message) => this.handleRecordSelection(message)
        );
    }

    handleRecordSelection(message) {
        console.log('?? recordId received from message:', message.recordId);

        if (!message || !message.recordId) {
            this.error = 'Invalid recordId received';
            this.engagements = [];
            return;
        }

        this.isLoading = true;
        this.error = undefined;

        getCustomerEngagement({ unifiedId: message.recordId })
            .then((result) => {
                console.log('?? Engagement data:', JSON.stringify(result, null, 2));
                if (result && result.length > 0) {
                    this.engagements = result.map((row) => {
                        const eventName = row.event_name || '';
                        const eventDescription = row.event_description || '';
                        const timeElapsed = row.time_elapsed || '';
                        // Normalize business unit coming from Data Lake Object (DLO)
                        const businessunits = row.businessunits ||'';

                        return {
                            eventName,
                            eventDescription,
                            timeElapsed,
                            businessunits,
                            iconName: this.getIconName(eventName) // ? tambahkan iconName di sini
                        };
                    });
                } else {
                    this.engagements = [];
                }
            })
            .catch((error) => {
                console.error('? Error fetching engagement:', error);
                this.error = error?.body?.message || error.message;
                this.engagements = [];
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    getIconName(eventName) {
        if (!eventName) return 'standard:outcome_activity';
        const name = eventName.toLowerCase();

        if (name.includes('visit')) return 'standard:channel_programs';
        if (name.includes('cart')) return 'standard:webcart';
        if (name.includes('open')) return 'standard:email_chatter';
        if (name.includes('click')) return 'standard:email_chatter';
        return 'standard:outcome_activity';
    }
}
