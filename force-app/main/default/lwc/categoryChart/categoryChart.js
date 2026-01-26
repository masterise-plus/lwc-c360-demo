import { LightningElement, track, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import chartjs from '@salesforce/resourceUrl/ChartJs';
import { subscribe, MessageContext } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getTop3CategoryByQty from '@salesforce/apex/Customer360Controller.getTop3CategoryByQty';

export default class CategoryChart extends LightningElement {
    @track unifiedId;
    @track data;
    @track isLoading = false;
    @track error; // Tambahkan ini agar pesan error muncul di UI

    chart = null; // Tidak perlu @track untuk objek ChartJs
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
                this.fetchCategoryData();
            }
        }
    }

    renderedCallback() {
        if (this.chartJsLoaded) return;
        loadScript(this, chartjs + '/chart.umd.js')
            .then(() => {
                this.chartJsLoaded = true;
                if (this.unifiedId) this.fetchCategoryData();
            })
            .catch(err => {
                this.error = 'Failed to load ChartJS';
                console.error(err);
            });
    }

    fetchCategoryData() {
        if (!this.unifiedId) return;

        this.isLoading = true;
        this.error = null;

        getTop3CategoryByQty({ unifiedId: this.unifiedId })
            .then(result => {
                this.data = result;
                if (result && result.length > 0) {
                    // Berikan jeda satu tick agar template merender canvas
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

        // BERSIHKAN CHART LAMA
        const existingChart = window.Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        const ctx = canvas.getContext('2d');
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
                    borderRadius: 3,
                    barThickness: 25,
                    maxBarThickness: 25
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                // Perbaikan struktur kurung di sini
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
                        // Memberikan ruang agar bar tidak terpotong saat memanjang
                        suggestedMax: Math.max(...values) + 1 
                    },
                    y: { 
                        grid: { display: false } 
                    }
                }
            }
        });
    }

    // Pastikan chart dihancurkan saat komponen dilepas
    disconnectedCallback() {
        if (this.chart) {
            this.chart.destroy();
        }
    }
}