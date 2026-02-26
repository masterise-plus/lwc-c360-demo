import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext, APPLICATION_SCOPE } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getMCPRecommendations from '@salesforce/apex/Customer360Controller.getMCPRecommendations';

export default class ProductRecommendation extends LightningElement {
    @wire(MessageContext) messageContext;

    subscription = null;
    @track record = null; 
    @track currentIndex = 0;
    @track itemsPerPage = 3;
    @track productList = [];
    @track isLoading = false;

    timer;
    startX = 0;
    isDragging = false;

    // Formatter Rupiah Indonesia
    currencyFormatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    });

    connectedCallback() {
        this.subscribeToMessageChannel();
        this.updateItemsPerPage();
        window.addEventListener('resize', this.updateItemsPerPage.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.updateItemsPerPage);
        this.stopAutoPlay();
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

    async handleRecordSelection(message) {
        if (message && message.recordId) {
            this.record = message.recordId;
            this.currentIndex = 0;
            this.isLoading = true;
            this.productList = []; 

            try {
                // 1. Panggil Apex untuk mem-fetch data dari MCP
                const result = await getMCPRecommendations({ unifiedId: message.recordId });
                
                if (result && result.error) {
                    console.warn('MCP Fetch Warning: ', result.error);
                    this.isLoading = false;
                    return;
                }
                
                // 2. Navigasi JSON untuk mengambil string Recommendations
                let recommendationsString = null;
                if (result && result.campaignResponses && result.campaignResponses.length > 0) {
                    const payload = result.campaignResponses[0].payload;
                    if (payload && payload.Recommendations) {
                        recommendationsString = payload.Recommendations;
                    }
                }

                // 3. Ubah String menjadi Array Object
                let recommendations = [];
                if (recommendationsString) {
                    try {
                        recommendations = JSON.parse(recommendationsString);
                    } catch (parseError) {
                        console.error('Gagal mem-parsing string Recommendations:', parseError);
                    }
                }

                // 4. Map seluruh data produk untuk Carousel (Tanpa batasan limit)
                if (recommendations && recommendations.length > 0) {
                    this.productList = recommendations.map((item) => {
                        const priceVal = parseFloat(item.price) || 0;
                        
                        return {
                            id: item.id,
                            name: item.name,
                            image: item.imageUrl,
                            // Karena data diskon/harga coret tidak ada di payload, kita set false/kosong
                            originalPrice: '', 
                            currentPrice: this.currencyFormatter.format(priceVal),
                            discount: '',
                            hasDiscount: false,
                            productUrl: item.url // Link produk ke website Eraspace
                        };
                    });
                }
                
                // Jalankan animasi carousel
                this.startAutoPlay();
            } catch (error) {
                console.error('Error fetching MCP recommendations:', error);
            } finally {
                this.isLoading = false;
            }
        } else {
            this.record = null;
            this.productList = [];
            this.stopAutoPlay();
        }
    }

    // --- LOGIKA CAROUSEL ---

    updateItemsPerPage() {
        const width = window.innerWidth;
        if (width <= 600) this.itemsPerPage = 1;
        else if (width <= 1024) this.itemsPerPage = 2;
        else this.itemsPerPage = 3;
    }

    get displayProducts() {
        return this.productList;
    }

    get hasProducts() {
        return this.productList && this.productList.length > 0;
    }

    get dots() {
        if (this.productList.length <= this.itemsPerPage) return [];
        const totalDots = this.productList.length - (this.itemsPerPage - 1);
        let dotsArr = [];
        for (let i = 0; i < totalDots; i++) {
            dotsArr.push({
                index: i,
                className: i === this.currentIndex ? 'dot active' : 'dot'
            });
        }
        return dotsArr;
    }

    get trackStyle() {
        const itemWidth = 100 / this.itemsPerPage;
        return `transform: translateX(-${this.currentIndex * itemWidth}%); transition: transform 0.5s ease-in-out;`;
    }

    moveToNext() {
        if (this.productList.length <= this.itemsPerPage) return;
        if (this.currentIndex >= this.productList.length - this.itemsPerPage) {
            this.currentIndex = 0;
        } else {
            this.currentIndex++;
        }
    }

    moveToPrev() {
        if (this.productList.length <= this.itemsPerPage) return;
        if (this.currentIndex <= 0) {
            this.currentIndex = Math.max(0, this.productList.length - this.itemsPerPage);
        } else {
            this.currentIndex--;
        }
    }

    handleNext() { this.moveToNext(); this.resetTimer(); }
    handlePrev() { this.moveToPrev(); this.resetTimer(); }

    handleDotClick(event) {
        this.currentIndex = parseInt(event.target.dataset.index, 10);
        this.resetTimer();
    }

    handlePointerDown(event) {
        if (this.productList.length <= this.itemsPerPage) return;
        this.isDragging = true;
        this.startX = event.clientX;
        this.stopAutoPlay();
        const viewport = this.template.querySelector('.carousel-viewport');
        if (viewport) viewport.setPointerCapture(event.pointerId);
    }

    handlePointerMove(event) {
        if (!this.isDragging) return;
        const x = event.clientX;
        const walk = x - this.startX;
        if (Math.abs(walk) > 60) { 
            if (walk > 0) this.moveToPrev();
            else this.moveToNext();
            this.isDragging = false; 
            this.resetTimer();
        }
    }

    handlePointerUp() {
        this.isDragging = false;
        this.startAutoPlay();
    }

    preventDrag(e) { e.preventDefault(); }

    startAutoPlay() { 
        this.stopAutoPlay(); 
        if (this.record && this.productList.length > this.itemsPerPage) {
            this.timer = setInterval(() => { this.moveToNext(); }, 3000); 
        }
    }

    stopAutoPlay() { if (this.timer) clearInterval(this.timer); }
    resetTimer() { this.stopAutoPlay(); this.startAutoPlay(); }
}