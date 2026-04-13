import { LightningElement, api, wire, track } from 'lwc';
import { subscribe, MessageContext, APPLICATION_SCOPE } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';

export default class StoreLocationRecommendation extends LightningElement {
    @api storesJson;
    
    @wire(MessageContext) messageContext;
    
    subscription = null;
    @track selectedCustomerId = null; // Menjadi track agar UI reaktif

    connectedCallback() {
        this.subscribeToMessageChannel();
    }

    subscribeToMessageChannel() {
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                RECORD_SELECTED_CHANNEL,
                (message) => this.handleRecordSelection(message),
                { scope: APPLICATION_SCOPE }
            );
        }
    }

    handleRecordSelection(message) {
        if (message && message.recordId) {
            this.selectedCustomerId = message.recordId;
        } else {
            this.selectedCustomerId = null;
        }
    }

    get displayStores() {
        try {
            if (!this.storesJson || !this.selectedCustomerId) return [];
            const rawData = JSON.parse(this.storesJson);

            return rawData.map((item, index) => {
                const isFirst = index === 0;
                return {
                    id: index + 1,
                    name: item.name,
                    address: item.address,
                    openHours: item.openHours || '-',
                    phone: item.phone || '-',
                    distance: item.distance || '-',
                    rankClass: isFirst ? 'rank rank-1' : 'rank',
                    rankLabel: `#${index + 1}`,
                    isTop: isFirst
                };
            });
        } catch (error) {
            console.error('Format JSON tidak valid:', error);
            return [];
        }
    }

    get isCustomerSelected() {
        return !!this.selectedCustomerId;
    }

    get hasStores() {
        return this.displayStores.length > 0;
    }

    get isInvalidJson() {
        if (!this.storesJson) return false;
        try {
            JSON.parse(this.storesJson);
            return false;
        } catch (e) {
            return true;
        }
    }
}