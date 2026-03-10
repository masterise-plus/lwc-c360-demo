import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getSalesComment from '@salesforce/apex/Customer360Controller.getSalesComment';

const AVATAR_COLORS = [
    '#6B4C9A', '#2E86AB', '#A23B72', '#F18F01',
    '#C73E1D', '#3B7A57', '#5C6BC0', '#00897B'
];

export default class SalesComment extends LightningElement {
    @track comments = [];
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

        this.fetchSalesComments(unifiedId);
    }

    fetchSalesComments(unifiedId) {
        this.isLoading = true;
        this.error = null;
        this.comments = [];

        getSalesComment({ unifiedId })
            .then((results) => {
                console.log('Sales Comment Results:', results);

                if (results && results.length > 0) {
                    this.comments = results.map((item, index) => {
                        const sellerName = item.seller_name__c || 'Unknown Seller';
                        const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];
                        return {
                            id: item.comment_id__c || `comment-${index}`,
                            sellerName: sellerName,
                            sellerId: item.seller_id__c || '',
                            sellerType: item.seller_type__c || '',
                            storeName: item.store_name__c || '',
                            commentText: item.comment_text__c || '',
                            timeAgo: this.getTimeAgo(item.created_at__c),
                            commentDate: this.formatDate(item.created_at__c),
                            initials: this.getInitials(sellerName),
                            avatarStyle: `background: ${avatarBg}`
                        };
                    });
                } else {
                    this.error = 'No sales comments found for this customer.';
                }
            })
            .catch((err) => {
                console.error('Error fetching sales comments:', err);
                this.error = err.body?.message || err.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    }

    getTimeAgo(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins} minutes ago`;
            if (diffHours < 24) return `${diffHours} hours ago`;
            if (diffDays < 30) return `${diffDays} days ago`;
            return date.toLocaleDateString();
        } catch (e) {
            return dateStr;
        }
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const day = date.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const mins = String(date.getMinutes()).padStart(2, '0');
            return `${day} ${month} ${year}, ${hours}:${mins}`;
        } catch (e) {
            return dateStr;
        }
    }

    get hasComments() {
        return this.comments && this.comments.length > 0;
    }

    get hasNoData() {
        return !this.hasComments && !this.isLoading && !this.error;
    }
}