import { LightningElement, wire, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import chartjs from '@salesforce/resourceUrl/ChartJs';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getTop3BrandByQty from '@salesforce/apex/Customer360Controller.getTop3BrandByQty';

export default class BrandChart extends LightningElement {
    @track unifiedId;
    @track chart;
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
            this.fetchBrandData();
        }
    }

    renderedCallback() {
        if (this.chartJsLoaded) return;
        loadScript(this, chartjs + '/chart.umd.js')
            .then(() => {
                this.chartJsLoaded = true;
                if (this.unifiedId) this.fetchBrandData();
            })
            .catch(err => console.error('ChartJS load error', err));
    }

    fetchBrandData() {
        if (!this.chartJsLoaded || !this.unifiedId) return;

        getTop3BrandByQty({ unifiedId: this.unifiedId })
            .then(data => {
                if (data && data.length > 0) {
                    this.renderChart(data);
                } else {
                    this.clearChart('No data available');
                }
            })
            .catch(error => {
                console.error('Error fetching brand data', error);
                this.clearChart('Error loading data');
            });
    }

    renderChart(data) {
        const ctx = this.template.querySelector('canvas').getContext('2d');
        if (this.chart) {
            this.chart.destroy();
        }

        const labels = data.map(d => d.Brand || 'Unknown');
        const values = data.map(d => d.Qty || 0);

        this.chart = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantity',
                    data: values,
                    backgroundColor: ['#F6BD60', '#84A59D', '#F28482'],
                    borderRadius: 6,
                    barThickness: 30,
                    maxBarThickness: 30
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false, // biar fleksibel mengikuti tinggi container
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#333',
                        titleFont: { size: 13 },
                        bodyFont: { size: 12 }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { display: false },
                        ticks: { stepSize: 1 }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 13 } }
                    }
                }
            }
        });
    }

    clearChart(message) {
        const container = this.template.querySelector('.chart-container');
        container.style.height = 'auto'; // biar otomatis collapse kalau tidak ada data
        const ctx = this.template.querySelector('canvas').getContext('2d');
        if (this.chart) this.chart.destroy();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '14px Arial';
        ctx.fillText(message, 10, 20);
    }
}
