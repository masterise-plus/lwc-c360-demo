import { LightningElement, track, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import chartjs from '@salesforce/resourceUrl/ChartJs';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getTop3CategoryByQty from '@salesforce/apex/Customer360Controller.getTop3CategoryByQty';

export default class CategoryChart extends LightningElement {
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
            console.log('🎯 UnifiedId changed:', this.unifiedId);
            if (this.chartJsLoaded) {
                this.fetchCategoryData();
            }
        }
    }

    renderedCallback() {
        if (this.chartJsLoaded) return;
        loadScript(this, chartjs + '/chart.umd.js')
            .then(() => {
                this.chartJsLoaded = true;
                console.log('✅ ChartJS loaded');
                if (this.unifiedId) this.fetchCategoryData();
            })
            .catch(err => console.error('ChartJS load error', err));
    }

    fetchCategoryData() {
        if (!this.chartJsLoaded || !this.unifiedId) return;

        console.log('📦 Fetching top categories for', this.unifiedId);
        getTop3CategoryByQty({ unifiedId: this.unifiedId })
            .then(data => {
                console.log('📊 Data:', data);
                if (data && data.length > 0) {
                    this.renderChart(data);
                } else {
                    this.clearChart('No data available');
                }
            })
            .catch(error => {
                console.error('❌ Error fetching category data:', error);
                this.clearChart('Error loading data');
            });
    }

    renderChart(data) {
        const ctx = this.template.querySelector('canvas')?.getContext('2d');
        if (!ctx) return;

        if (this.chart) this.chart.destroy();

        const labels = data.map(d => d.Category || 'Unknown');
        const values = data.map(d => d.Qty || 0);

        this.chart = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantity',
                    data: values,
                    backgroundColor: ['#6EC1E4', '#4FB0A9', '#A5D8A6'],
                    borderRadius: 6,
                    barThickness: 30,
                    maxBarThickness: 30
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#333',
                        titleFont: { size: 13 },
                        bodyFont: { size: 12 }
                    }
                },
                scales: {
                    x: { beginAtZero: true, grid: { display: false } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    clearChart(message) {
        const container = this.template.querySelector('.chart-container');
        const canvas = this.template.querySelector('canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        // Auto adjust container height if no data
        container.style.height = 'auto';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(message, 10, 20);
    }
}