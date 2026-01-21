import { LightningElement, api, track } from 'lwc';

export default class WebsiteEngagementCard extends LightningElement {
    // API properties for external data binding
    @api recordId;
    
    // Track engagement data
    @track engagementData = {
        averageDuration: '20 324',
        lastSiteVisit: '07.12.2022',
        lastVisitDuration: '324'
    };

    // Getter for average duration formatted
    get averageDuration() {
        return this.engagementData?.averageDuration || '0';
    }

    // Getter for last site visit date
    get lastSiteVisit() {
        return this.engagementData?.lastSiteVisit || '-';
    }

    // Getter for duration of last visit
    get lastVisitDuration() {
        return this.engagementData?.lastVisitDuration || '0';
    }

    // Getter to check if engagement data exists
    get hasEngagementData() {
        return this.engagementData !== null && this.engagementData !== undefined;
    }

    // Method to update engagement data externally
    @api
    setEngagementData(data) {
        if (data) {
            this.engagementData = {
                averageDuration: data.averageDuration || '0',
                lastSiteVisit: data.lastSiteVisit || '-',
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