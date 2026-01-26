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
                // this.buildChannels();
                if (res && Object.keys(res).length > 0) {
                    let email_subscribe = res.Email_Subscribe * 100 || 0;
                    email_subscribe = parseFloat(email_subscribe);
                    email_subscribe = isNaN(email_subscribe) ? 0 : parseFloat(email_subscribe.toFixed(2));

                    let formatted_email_subscribe = email_subscribe.toLocaleString('id-ID', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    
                    // let formatted_email_subscribe = Email_Subscribe.toLocaleString('id-ID', {
                    //     minimumFractionDigits: 2,
                    //     maximumFractionDigits: 2
                    // });

                    let email_engagement = res.Email_Engagement * 100  || 0;
                    email_engagement = parseFloat(email_engagement);
                    email_engagement = isNaN(email_engagement) ? 0 : parseFloat(email_engagement.toFixed(2));

                    let formatted_email_engagement = email_engagement.toLocaleString('id-ID', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });

                    let email_open = res.Email_Open * 100  || 0;
                    email_open = parseFloat(email_open);
                    email_open = isNaN(email_open) ? 0 : parseFloat(email_open.toFixed(2));

                    let formatted_email_open = email_open.toLocaleString('id-ID', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                
                    this.data = {
                        Email_Subscribe: formatted_email_subscribe,
                        Email_Engagement: formatted_email_engagement,
                        Email_Open: formatted_email_open
                    };
                } else {
                    throw new Error('No record found.');
                }
            })
            .catch((err) => {
                this.error = err.body?.message || err.message;
                this.isLoading = false;
            });
    }

    // buildChannels() {
    //     const sub = Number(this.data?.Email_Subscribe) || 0;
    //     const eng = Number(this.data?.Email_Engagement) || 0;
    //     const open = Number(this.data?.Email_Open) || 0;

    //     const toPercent = (val) => `${(val) * 100}%`;

    //     this.channels = [
    //         {
    //             label: 'Whatsapp Subscribe',
    //             value: sub?.toFixed(2),
    //             style: `width:${toPercent(sub)}; background-color:#2ecc71;`
    //         },
    //         {
    //             label: 'Email Engagement',
    //             value: eng?.toFixed(2),
    //             style: `width:${toPercent(eng)}; background-color:#f1c40f;`
    //         },
    //         {
    //             label: 'Whatsapp Read',
    //             value: open?.toFixed(2),
    //             style: `width:${toPercent(open)}; background-color:#e74c3c;`
    //         }
    //     ];
    // }
}