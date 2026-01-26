import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext, APPLICATION_SCOPE } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';

export default class ProductRecommendation extends LightningElement {
    @wire(MessageContext) messageContext;

    subscription = null;
    @track record = null; // Menyimpan data customer yang terpilih
    @track currentIndex = 0;
    @track itemsPerPage = 3;
    
    // Data produk statis sesuai kebutuhan desain
    productList = [
        { id: '1', name: '14-inch MacBook Pro M4 Pro', originalPrice: 'Rp 34.999.000', currentPrice: 'Rp 33.999.000', discount: '3%', image: 'https://demo04-14-inch-macbook-pro-m4-pro.edgeone.app/14-inch%20MacBook%20Pro%20M4%20Pro.jpeg' },
        { id: '2', name: 'iPhone 16 Pro', originalPrice: 'Rp 21.999.000', currentPrice: 'Rp 17.499.000', discount: '20%', image: 'https://demo04-iphone-16-pro.edgeone.app/iPhone%2016%20Pro.jpg' },
        { id: '3', name: 'Apple Watch Series 10', originalPrice: 'Rp 7.299.000', currentPrice: 'Rp 6.299.000', discount: '14%', image: 'https://demo04-apple-watch-series-10-with-sport-band.edgeone.app/Apple%20Watch%20Series%2010%20with%20Sport%20Band.jpg' },
        { id: '4', name: 'MacBook Air M3', originalPrice: 'Rp 18.999.000', currentPrice: 'Rp 17.999.000', discount: '5%', image: 'https://demo04-14-inch-macbook-pro-m4-pro.edgeone.app/14-inch%20MacBook%20Pro%20M4%20Pro.jpeg' },
        { id: '5', name: 'iPad Pro M4 Chip', originalPrice: 'Rp 20.499.000', currentPrice: 'Rp 19.499.000', discount: '4%', image: 'https://demo04-iphone-16-pro.edgeone.app/iPhone%2016%20Pro.jpg' },
        { id: '6', name: 'iPad Gen 10', originalPrice: 'Rp 5.499.000', currentPrice: 'Rp 4.399.200', discount: '20%', image: 'https://demo04-ipad-gen-10.edgeone.app/iPad%20Gen%2010.jpg' },
    ];

    timer;
    startX = 0;
    isDragging = false;

    // --- Lifecycle Hooks ---

    connectedCallback() {
        // Berlangganan ke Message Channel saat komponen dimuat
        this.subscribeToMessageChannel();
        this.updateItemsPerPage();
        window.addEventListener('resize', this.updateItemsPerPage.bind(this));
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.updateItemsPerPage);
        this.stopAutoPlay();
    }

    // --- Lightning Message Service Logic ---

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
        // Template akan muncul HANYA jika message mengandung recordId
        if (message && message.recordId) {
            this.record = message.recordId;
            this.currentIndex = 0; // Reset posisi ke awal untuk customer baru
            this.resetTimer();     // Mulai autoplay
        } else {
            this.record = null;
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

    get dots() {
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

    // --- Navigation Actions ---

    moveToNext() {
        if (this.currentIndex >= this.productList.length - this.itemsPerPage) {
            this.currentIndex = 0;
        } else {
            this.currentIndex++;
        }
    }

    moveToPrev() {
        if (this.currentIndex <= 0) {
            this.currentIndex = this.productList.length - this.itemsPerPage;
        } else {
            this.currentIndex--;
        }
    }

    handleNext() {
        this.moveToNext();
        this.resetTimer();
    }

    handlePrev() {
        this.moveToPrev();
        this.resetTimer();
    }

    handleDotClick(event) {
        this.currentIndex = parseInt(event.target.dataset.index, 10);
        this.resetTimer();
    }

    // --- Interaction Logic (Drag & Pointer) ---

    handlePointerDown(event) {
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

    preventDrag(e) { 
        e.preventDefault(); 
    }

    // --- Timer Management ---

    startAutoPlay() { 
        this.stopAutoPlay(); 
        // Jalankan autoplay hanya jika data customer (record) sudah ada
        if (this.record) {
            this.timer = setInterval(() => {
                this.moveToNext();
            }, 3000); 
        }
    }

    stopAutoPlay() { 
        if (this.timer) clearInterval(this.timer); 
    }

    resetTimer() { 
        this.stopAutoPlay(); 
        this.startAutoPlay(); 
    }
}