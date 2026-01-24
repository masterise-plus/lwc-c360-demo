import { LightningElement, track } from 'lwc';

export default class DemoCampaignPromoCarousel extends LightningElement {
    @track currentIndex = 0;
    @track autoSlideCount = 0;
    
    maxAutoSlides = 6;
    autoSlideInterval = null;
    slideInterval = 4000; // 4 seconds per slide
    
    // Touch/Swipe tracking
    touchStartX = 0;
    touchEndX = 0;
    isDragging = false;
    dragStartX = 0;
    currentTranslate = 0;
    
    // Slide width percentage (showing partial cards on sides)
    slideWidth = 70; // 70% width for main card, leaving room for peek effect
    
    // Demo promo items - replace with actual data from Apex
    @track promoItems = [
        {
            id: '1',
            badge: '2 TAHUN GARANSI',
            title: 'ELEVATED CHARGING EXPERIENCE',
            subtitle: 'IT Wireless Powerbank 2 in 1 WPB31',
            price: '499,000',
            hasImage: true,
            cardStyle: 'background: linear-gradient(135deg, #f5f0e8 0%, #ebe4d8 100%);',
            imageStyle: 'background: linear-gradient(135deg, #d4cfc5 0%, #c5bfb3 100%);',
            logo: ''
        },
        {
            id: '2',
            badge: '',
            title: 'DOUBLE-IN SERUNYA MUSIK LO!',
            subtitle: 'LOOPS Mini Ball X19',
            price: '299,000',
            hasImage: true,
            cardStyle: 'background: linear-gradient(135deg, #ffd93d 0%, #ffb800 100%);',
            imageStyle: 'background: linear-gradient(135deg, #3a7bd5 0%, #00d2ff 100%);',
            logo: 'LOOPS'
        },
        {
            id: '3',
            badge: '1 TAHUN GARANSI',
            title: 'SAMA DIS CO',
            subtitle: 'Marshall Premium Earbuds',
            price: '1,299,000',
            hasImage: true,
            cardStyle: 'background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);',
            imageStyle: 'background: linear-gradient(135deg, #8B7355 0%, #A0826D 100%);',
            logo: 'Marshall'
        },
        {
            id: '4',
            badge: '',
            title: 'SPECIAL BUNDLE PROMO',
            subtitle: 'Samsung Galaxy Buds Pro',
            price: '1,899,000',
            hasImage: true,
            cardStyle: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);',
            imageStyle: 'background: linear-gradient(135deg, #232526 0%, #414345 100%);',
            logo: 'Samsung'
        }
    ];

    get trackStyle() {
        const baseTranslate = -this.currentIndex * this.slideWidth;
        const dragOffset = this.isDragging ? this.currentTranslate : 0;
        const transition = this.isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        return `transform: translateX(calc(${baseTranslate}% + ${dragOffset}px)); transition: ${transition};`;
    }

    get indicators() {
        return this.promoItems.map((item, index) => ({
            index,
            className: `indicator ${index === this.currentIndex ? 'active' : ''}`,
            ariaLabel: `Go to slide ${index + 1}`
        }));
    }

    connectedCallback() {
        this.startAutoSlide();
    }

    disconnectedCallback() {
        this.stopAutoSlide();
    }

    startAutoSlide() {
        if (this.autoSlideCount >= this.maxAutoSlides) {
            return;
        }
        
        this.autoSlideInterval = setInterval(() => {
            if (this.autoSlideCount >= this.maxAutoSlides) {
                this.stopAutoSlide();
                return;
            }
            
            this.nextSlide();
            this.autoSlideCount++;
        }, this.slideInterval);
    }

    stopAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
        }
    }

    resetAutoSlide() {
        this.stopAutoSlide();
        this.autoSlideCount = 0;
        this.startAutoSlide();
    }

    nextSlide() {
        if (this.currentIndex < this.promoItems.length - 1) {
            this.currentIndex++;
        } else {
            this.currentIndex = 0;
        }
    }

    prevSlide() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
        } else {
            this.currentIndex = this.promoItems.length - 1;
        }
    }

    goToSlide(index) {
        this.currentIndex = index;
    }

    handleIndicatorClick(event) {
        const index = parseInt(event.target.dataset.index, 10);
        this.goToSlide(index);
        this.resetAutoSlide();
    }

    // Touch Events for Mobile Swipe
    handleTouchStart(event) {
        this.touchStartX = event.touches[0].clientX;
        this.isDragging = true;
        this.stopAutoSlide();
    }

    handleTouchMove(event) {
        if (!this.isDragging) return;
        
        this.touchEndX = event.touches[0].clientX;
        const diff = this.touchEndX - this.touchStartX;
        this.currentTranslate = diff;
    }

    handleTouchEnd() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        const diff = this.touchEndX - this.touchStartX;
        const threshold = 50;

        if (diff > threshold) {
            this.prevSlide();
        } else if (diff < -threshold) {
            this.nextSlide();
        }
        
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.currentTranslate = 0;
        this.resetAutoSlide();
    }

    // Mouse Events for Desktop Swipe
    handleMouseDown(event) {
        event.preventDefault();
        this.dragStartX = event.clientX;
        this.isDragging = true;
        this.stopAutoSlide();
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;
        
        const diff = event.clientX - this.dragStartX;
        this.currentTranslate = diff;
    }

    handleMouseUp(event) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        const diff = event.clientX - this.dragStartX;
        const threshold = 50;

        if (diff > threshold) {
            this.prevSlide();
        } else if (diff < -threshold) {
            this.nextSlide();
        }
        
        this.dragStartX = 0;
        this.currentTranslate = 0;
        this.resetAutoSlide();
    }

    handleMouseLeave() {
        if (this.isDragging) {
            this.isDragging = false;
            this.dragStartX = 0;
            this.currentTranslate = 0;
            this.resetAutoSlide();
        }
    }
}