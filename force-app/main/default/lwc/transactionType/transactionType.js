import { LightningElement, track, wire } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getTransactionTypeCount from '@salesforce/apex/Customer360Controller.getTransactionTypeCount';

export default class TransactionType extends LightningElement {
    @track unifiedId;
    @track onlineTransaction = 0;
    @track offlineTransaction = 0;
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
        if (message?.recordId) {
            this.unifiedId = message.recordId;
            console.log('🎯 UnifiedId received in TransactionType:', this.unifiedId);
            this.fetchTransactionTypeData();
        }
    }

    fetchTransactionTypeData() {
        if (!this.unifiedId) return;
        this.isLoading = true;

        getTransactionTypeCount({ unifiedId: this.unifiedId })
            .then((data) => {
                console.log('📊 Transaction data:', data);
                this.onlineTransaction = data?.Online_Transaction || 0;
                this.offlineTransaction = data?.Offline_Transaction || 0;
            })
            .catch((error) => {
                console.error('❌ Error fetching transaction data:', error);
                this.onlineTransaction = 0;
                this.offlineTransaction = 0;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
