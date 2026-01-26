import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getUnifiedIndividualById from '@salesforce/apex/Customer360Controller.getUnifiedIndividualById';
import getPreferredPaymentPerBU from '@salesforce/apex/Customer360Controller.getPreferredPaymentPerBU';

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
                    
                    // 1. Inisialisasi record dengan score 0 untuk memicu titik awal animasi
                    this.isLoading = false;

                    this.record = { 
                        ...result, 
                        engagement_score: 0,
                        engagement_label: 'Calculating...' 
                    };

                    // 2. Beri jeda kecil (tick) agar DOM merender state score 0
                    setTimeout(() => {
                        let engagement = parseFloat(result.engagement_score || 0);
                        engagement = Math.max(0, Math.min(engagement, 100));

                        let engagementLabel = '';
                        if (engagement >= 75) engagementLabel = 'Highly Engaged';
                        else if (engagement >= 40) engagementLabel = 'Moderately Engaged';
                        else engagementLabel = 'Low Engagement';

                        // 3. Update ke nilai asli, memicu CSS Transition
                        this.record = {
                            ...result,
                            engagement_score: engagement,
                            engagement_label: engagementLabel
                        };
                    }, 50);

                    return getPreferredPaymentPerBU({ unifiedId: message.recordId });
                } else {
                    throw new Error('No record found for this ID.');
                }
            })
            .catch(error => {
                this.error = error?.body?.message || error.message;
            })
            
    }

    get gaugeColor() {
        const score = this.record?.engagement_score || 0;
        if (score >= 75) return '#3EB489'; // hijau
        if (score >= 40) return '#F7B500'; // kuning
        return '#D94F4F'; // merah
    }

    get gaugeStyle() {
        const score = this.record?.engagement_score || 0;
        const radius = 40;
        const circumference = Math.PI * radius; // Keliling setengah lingkaran
        const filled = (score / 100) * circumference;
        const offset = circumference - filled;
        
        // CSS Transition akan menganimasikan perubahan stroke-dashoffset
        return `stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};`;
    }
}