import { LightningElement, wire, track } from 'lwc';
import { subscribe, MessageContext, APPLICATION_SCOPE } from 'lightning/messageService';
import RECORD_SELECTED_CHANNEL from '@salesforce/messageChannel/UnifiedIndividualSelected__c';

export default class OtherProductRecommendation extends LightningElement {
    @wire(MessageContext) messageContext;

    subscription = null;
    @track record = null; // Menyimpan data customer yang terpilih
    @track currentIndex = 0;
    @track itemsPerPage = 3;
    
    // Data produk statis sesuai kebutuhan desain
    productList = [
        { id: '1', name: 'Macbook Air 13', originalPrice: 'Rp 34.999.000', currentPrice: 'Rp 33.999.000', discount: '3%', image: 'https://demo04-macbook-air-13.edgeone.app/macbook%20air%2013.png' },
        { id: '2', name: 'Macbook Air M2', originalPrice: 'Rp 21.999.000', currentPrice: 'Rp 17.499.000', discount: '20%', image: 'https://demo04-macbook-air-m2.edgeone.app/macbook%20air%20m2.jpg' },
        { id: '3', name: 'iPhone 16e', originalPrice: 'Rp 7.299.000', currentPrice: 'Rp 6.299.000', discount: '14%', image: 'https://extra-scarlet-gb1rrdz7qf.edgeone.app/iphone%2016e.jpg' },
        { id: '4', name: 'iPhone 15 128GB', originalPrice: 'Rp 18.999.000', currentPrice: 'Rp 17.999.000', discount: '5%', image: 'https://demo04-iphone-15-128gb.edgeone.app/iphone%2015%20128GB.jpg' },
        { id: '5', name: 'Apple iPhone 13 128GB', originalPrice: 'Rp 10.299.000', currentPrice: 'Rp 8.249.000', discount: '20%', image: 'https://cdnpro.eraspace.com/media/catalog/product/i/p/iphone_13_midnight_1.jpg' },
        { id: '6', name: 'Apple iPhone 17 Pro Max 256GB', originalPrice: 'Rp 25.749.000', currentPrice: 'Rp 20.599.200', discount: '20%', image: 'https://cdnpro.eraspace.com/media/catalog/product/i/p/iphone-17-pro-cosmic-orange-1000_1_3.webp' },
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