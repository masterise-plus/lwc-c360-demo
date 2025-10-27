import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getEmailEngagementScores from '@salesforce/apex/Customer360Controller.getEmailEngagementScores';

export default class EngagementScoring extends LightningElement {
    @track data;
    @track channels = [];
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

        this.fetchScores(unifiedId);
    }

    fetchScores(unifiedId) {
        this.isLoading = true;
        this.error = null;

        getEmailEngagementScores({ unifiedId })
            .then((res) => {
                this.data = res;
                this.isLoading = false;
                this.buildChannels();
            })
            .catch((err) => {
                this.error = err.body?.message || err.message;
                this.isLoading = false;
            });
    }

    buildChannels() {
        const sub = Number(this.data?.Email_Subscribe) || 0;
        const eng = Number(this.data?.Email_Engagement) || 0;
        const open = Number(this.data?.Email_Open) || 0;

        const toPercent = (val) => `${(val) * 100}%`;

        this.channels = [
            {
                label: 'Email Subscribe',
                value: sub?.toFixed(2),
                style: `width:${toPercent(sub)}; background-color:#2ecc71;`
            },
            {
                label: 'Email Engagement',
                value: eng?.toFixed(2),
                style: `width:${toPercent(eng)}; background-color:#f1c40f;`
            },
            {
                label: 'Email Open',
                value: open?.toFixed(2),
                style: `width:${toPercent(open)}; background-color:#e74c3c;`
            }
        ];
    }
}
