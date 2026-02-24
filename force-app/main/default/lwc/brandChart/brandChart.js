import { LightningElement, track, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import chartjs from '@salesforce/resourceUrl/ChartJs';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getTop3BrandByQty from '@salesforce/apex/Customer360Controller.getTop3BrandByQty';

export default class BrandChart extends LightningElement {
    @track unifiedId;
    @track data;
    @track isLoading = false;
    @track error;

    chart = null; 
    chartJsLoaded = false;
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
            if (this.chartJsLoaded) {
                this.fetchBrandData();
            }
        }
    }

    renderedCallback() {
        if (this.chartJsLoaded) return;
        loadScript(this, chartjs + '/chart.umd.js')
            .then(() => {
                this.chartJsLoaded = true;
                if (this.unifiedId) this.fetchBrandData();
            })
            .catch(err => {
                this.error = 'Failed to load ChartJS';
                console.error(err);
            });
    }

    fetchBrandData() {
        if (!this.unifiedId) return;

        this.isLoading = true;
        this.error = null;

        getTop3BrandByQty({ unifiedId: this.unifiedId })
            .then(result => {
                this.data = result;
                if (result && result.length > 0) {
                    // Jeda satu tick agar template merender canvas (seperti di CategoryChart)
                    setTimeout(() => {
                        this.renderChart(result);
                    }, 50);
                }
            })
            .catch((err) => {
                console.error('Error:', err);
                this.error = err.body?.message || err.message;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    renderChart(data) {
        const canvas = this.template.querySelector('canvas');
        if (!canvas) return;

        // BERSIHKAN CHART LAMA (Logic disamakan)
        const existingChart = window.Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        const labels = data.map(d => d.Brand || 'Unknown');
        const values = data.map(d => d.Qty || 0);

        this.chart = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantity',
                    data: values,
                    backgroundColor: ['#F6BD60', '#84A59D', '#F28482'], // Warna tetap Brand
                    borderRadius: 3,
                    barThickness: 25,
                    maxBarThickness: 25
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1200,
                    easing: 'easeOutQuart'
                },
                animations: {
                    x: {
                        from: 0,
                        duration: 1200
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        titleFont: { size: 13 },
                        bodyFont: { size: 12 }
                    }
                },
                scales: {
                    x: { 
                        beginAtZero: true, 
                        grid: { display: false },
                        suggestedMax: Math.max(...values) + 1 
                    },
                    y: { 
                        grid: { display: false } 
                    }
                }
            }
        });
    }

    disconnectedCallback() {
        if (this.chart) {
            this.chart.destroy();
        }
    }
}