import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext, APPLICATION_SCOPE } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';
import getProductRecommendation from '@salesforce/apex/Customer360Controller.getProductRecommendation';

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
                const result = await getProductRecommendation({ unifiedId: message.recordId });
                
                if (result && result.length > 0) {
                    this.productList = result
                        .filter(item => 
                            item.Vertical === 'Erajaya Digital' && 
                            item.Prediction_Rank >= 6 && 
                            item.Prediction_Rank <= 10
                        )
                        .map(item => {
                            // Pastikan nilai dikonversi ke angka untuk pengecekan
                            const discountVal = parseFloat(item.Product_Discount) || 0;
                            const originalPriceVal = parseFloat(item.Product_Original_Price) || 0;
                            const currentPriceVal = parseFloat(item.Product_Current_Price) || 0;
                            // Cek apakah ada diskon (bukan null, bukan 0)
                            const hasDiscount = discountVal > 0 && (currentPriceVal < originalPriceVal);
                            
                            return {
                                id: item.Product_Id,
                                name: item.Product_Name,
                                image: item.Product_Link,
                                // Jika ada diskon, tampilkan harga asli untuk dicoret
                                originalPrice: hasDiscount ? this.currencyFormatter.format(originalPriceVal) : '',
                                // Harga utama (current price)
                                currentPrice: this.currencyFormatter.format(currentPriceVal || originalPriceVal),
                                // Label diskon
                                discount: hasDiscount ? `${Math.round(discountVal)}%` : '',
                                hasDiscount: hasDiscount
                            };
                        });
                }
                this.startAutoPlay();
            } catch (error) {
                console.error('Error fetching recommendations:', error);
            } finally {
                this.isLoading = false;
            }
        } else {
            this.record = null;
            this.productList = [];
            this.stopAutoPlay();
        }
    }

    // --- Carousel Logic ---
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