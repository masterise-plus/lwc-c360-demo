import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getUnifiedIndividualById from '@salesforce/apex/Customer360Controller.getUnifiedIndividualById';

export default class CustomerProfile extends LightningElement {
    @wire(MessageContext) messageContext;

    subscription;
    @track record;
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
        if (!message || !message.recordId) {
            this.error = 'Invalid recordId received';
            this.record = undefined;
            return;
        }

        this.isLoading = true;
        this.error = undefined;
        this.record = undefined;

        getUnifiedIndividualById({ ssotId: message.recordId })
            .then(result => {
                if (result && Object.keys(result).length > 0) {
                    let ltv = result.LTV || 0;
                    ltv = parseFloat(ltv);
                    ltv = isNaN(ltv) ? 0 : parseFloat(ltv.toFixed(2));

                    let formattedLTV = ltv.toLocaleString('id-ID', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });

                    let engagement = parseFloat(result.engagement_score || 0);
                    if (isNaN(engagement)) engagement = 0;
                    engagement = Math.max(0, Math.min(engagement, 100));

                    let engagementLabel = '';
                    if (engagement >= 75) engagementLabel = 'Highly Engaged';
                    else if (engagement >= 40) engagementLabel = 'Moderately Engaged';
                    else engagementLabel = 'Low Engagement';

                    let createdDateRaw = result.ssot__CreatedDate__c;
                    let formattedCreatedDate = '—';
                    if (createdDateRaw) {
                        const d = new Date(createdDateRaw);
                        if (!isNaN(d.getTime())) {
                            formattedCreatedDate = d.toLocaleDateString('id-ID');
                        }
                    }

                    this.record = {
                        ...result,
                        LTV: formattedLTV,
                        ssot__CreatedDate__c: formattedCreatedDate,
                        engagement_score: engagement,
                        engagement_label: engagementLabel
                    };
                } else {
                    this.error = 'No record found for this ID.';
                }
            })
            .catch(error => {
                this.error = error?.body?.message || error.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // --- GAUGE CONFIGURATIONS ---
    get gaugeColor() {
        const score = this.record?.engagement_score || 0;
        if (score >= 75) return '#3EB489'; // hijau
        if (score >= 40) return '#F7B500'; // kuning
        return '#D94F4F'; // merah
    }

    get gaugeStyle() {
        const score = this.record?.engagement_score || 0;
        const radius = 40;
        const circumference = Math.PI * radius; // panjang half-circle
        const filled = (score / 100) * circumference;
        const empty = circumference - filled;

        // offset = empty (so the filled part will be the first 'filled' length)
        return `stroke-dasharray: ${circumference}; stroke-dashoffset: ${empty}; transform-origin: 50% 50%;`;
    }

}
