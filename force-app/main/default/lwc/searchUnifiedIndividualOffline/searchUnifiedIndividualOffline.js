import { LightningElement, track, wire } from 'lwc';
import getUnifiedIndividuals from '@salesforce/apex/Customer360Controller.getUnifiedIndividuals';
import { publish, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';

export default class SearchUnifiedIndividualOffline extends LightningElement {
    @track searchKey = '';
    @track searchField = 'Id';
    @track records;
    @track error;
    @track isLoading = false;
    @track suggestions = [];
    @track showSuggestions = false;

    @track searchOptions = [
        { label: 'ID', value: 'Id' },
        { label: 'First Name', value: 'FirstName' },
        { label: 'Last Name', value: 'LastName' }
        
    ];

    // columns = [
    //     { label: 'Id', fieldName: 'ssot__Id__c' },
    //     { label: 'First Name', fieldName: 'ssot__FirstName__c' },
    //     { label: 'Last Name', fieldName: 'ssot__LastName__c' },
    //     { label: 'Gender', fieldName: 'ssot__GenderId__c' },
    //     { label: 'City', fieldName: 'City__c' },
    //     // { label: 'Office Position', fieldName: 'Officer_Position__c' },
    //     { label: 'Created Date', fieldName: 'ssot__CreatedDate__c' },
    //     { label: 'Segment Id', fieldName: 'Segment_Id__c' },
    //     { label: 'Segment Name', fieldName: 'Segment_Display_Name' }
    // ];

    @wire(MessageContext)
    messageContext;

    handleInputChange(event) {
        this.searchKey = event.target.value;
        if ((this.searchField === 'FirstName' || this.searchField === 'LastName') && this.searchKey.length >= 2) {
            this.fetchSuggestions();
        } else {
            this.showSuggestions = false;
            this.suggestions = [];
        }
    }

    handleFieldChange(event) {
        this.searchField = event.target.value;
        this.showSuggestions = false;
        this.suggestions = [];
    }

    fetchSuggestions() {
        const sf = (this.searchField === 'LastName') ? 'LastName' : 'FirstName';
        getUnifiedIndividuals({ keyword: this.searchKey, searchField: sf })
            .then(result => {
                const names = result
                    .filter(r => r.ssot__FirstName__c && r.ssot__LastName__c)
                    .map(r => `${r.ssot__FirstName__c} ${r.ssot__LastName__c}`);

                const uniqueNames = [];
                const seen = new Set();
                for (const n of names) {
                    if (!seen.has(n)) {
                        uniqueNames.push(n);
                        seen.add(n);
                    }
                }

                this.suggestions = uniqueNames.map(name => ({ label: name, value: name }));
                this.showSuggestions = this.suggestions.length > 0;
            })
            .catch(err => {
                console.error('Suggestion fetch error', err);
                this.suggestions = [];
                this.showSuggestions = false;
            });
    }

    handleSuggestionClick(event) {
        const selectedFullName = event.currentTarget.dataset.value;
        if (!selectedFullName) return;

        this.searchKey = selectedFullName;
        this.showSuggestions = false;
        this.suggestions = [];
        this.isLoading = true;
        this.records = undefined;
        this.error = undefined;

        getUnifiedIndividuals({ keyword: selectedFullName, searchField: 'FullName' })
            .then(result => {
                this.records = result;
                if (result && result.length > 0 && result[0].ssot__Id__c) {
                    const message = { recordId: result[0].ssot__Id__c };
                    publish(this.messageContext, RECORD_SELECTED_CHANNEL, message);
                }
            })
            .catch(err => {
                this.records = undefined;
                this.error = this._parseError(err);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    handleSearchClick() {
        this.isLoading = true;
        this.records = undefined;
        this.error = undefined;
        this.showSuggestions = false;

        getUnifiedIndividuals({ keyword: this.searchKey, searchField: this.searchField })
            .then(result => {
                this.records = result;
                this.error = undefined;

                
                if (this.isSearchById && result && result.length > 0 && result[0].ssot__Id__c) {
                    const message = { recordId: result[0].ssot__Id__c };
                    publish(this.messageContext, RECORD_SELECTED_CHANNEL, message);
                }
            })
            .catch(err => {
                this.records = undefined;
                this.error = this._parseError(err);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    _parseError(err) {
        let message = 'Unknown error';
        try {
            if (Array.isArray(err.body)) message = err.body.map(e => e.message).join('; ');
            else if (err.body && err.body.message) message = err.body.message;
            else if (err.body) message = JSON.stringify(err.body);
            else if (err.message) message = err.message;
        } catch (e) {
            message = 'Error parsing response';
        }
        return message;
    }

    get noResults() {
        return !this.isLoading && Array.isArray(this.records) && this.records.length === 0;
    }


    get isSearchById() {
        return (this.searchField || '').toLowerCase() === 'id';
    }   
}