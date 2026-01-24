import { LightningElement, track } from 'lwc';

export default class DemoCampaignPromo extends LightningElement {
    @track currentIndex = 0;
    @track autoSlideCount = 0;
    maxAutoSlides = 3;
    autoSlideInterval = null;
    slideInterval = 3000; // 3 seconds per slide
    
    // Touch/Swipe tracking
    touchStartX = 0;
    touchEndX = 0;
    isDragging = false;
    dragStartX = 0;
    currentTranslate = 0;
    prevTranslate = 0;
    
    // Demo promo items - replace with actual data
    @track promoItems = [
        {
            id: '1',
            badge: '2 TAHUN GARANSI',
            badgeIcon: '',
            badgeStyle: 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);',
            title: 'ELEVATED CHARGING EXPERIENCE',
            subtitle: 'IT Wireless Powerbank 2 in 1 WPB31',
            price: '499,000',
            image: '',
            cardStyle: 'background: linear-gradient(135deg, #f5f0e8 0%, #e8e0d5 100%);',
            logo: ''
        },
        {
            id: '2',
            badge: '',
            badgeIcon: '',
            badgeStyle: '',
            title: 'DOUBLE-IN SERUNYA MUSIK LO!',
            subtitle: 'LOOPS Mini Ball X19',
            price: '299,000',
            image: '',
            cardStyle: 'background: linear-gradient(135deg, #ffd93d 0%, #ffb800 100%);',
            logo: 'LOOPS'
        },
        {
            id: '3',
            badge: '1 TAHUN GARANSI',
            badgeIcon: '',
            badgeStyle: 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);',
            title: 'SAME DISCO',
            subtitle: 'Marshall Premium Earbuds',
            price: '1,299,000',
            image: '',
            cardStyle: 'background: linear-gradient(135deg, #f0f0f0 0%, #e5e5e5 100%);',
            logo: 'Marshall'
        }
    ];

    get trackStyle() {
        const translateX = this.isDragging 
            ? this.currentTranslate 
            : -this.currentIndex * 100;
        return `transform: translateX(${translateX}%); transition: ${this.isDragging ? 'none' : 'transform 0.5s ease-in-out'};`;
    }

    get indicators() {
        return this.promoItems.map((item, index) => ({
            index,
            className: `indicator ${index === this.currentIndex ? 'active' : ''}`
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

    nextSlide() {
        this.currentIndex = (this.currentIndex + 1) % this.promoItems.length;
    }

    prevSlide() {
        this.currentIndex = this.currentIndex === 0 
            ? this.promoItems.length - 1 
            : this.currentIndex - 1;
    }

    goToSlide(index) {
        this.currentIndex = index;
    }

    handleIndicatorClick(event) {
        const index = parseInt(event.target.dataset.index, 10);
        this.goToSlide(index);
        this.stopAutoSlide();
    }

    // Touch Events for Swipe
    handleTouchStart(event) {
        this.touchStartX = event.touches[0].clientX;
        this.isDragging = true;
        this.stopAutoSlide();
    }

    handleTouchMove(event) {
        if (!this.isDragging) return;
        this.touchEndX = event.touches[0].clientX;
        const diff = this.touchEndX - this.touchStartX;
        const containerWidth = this.template.querySelector('.carousel-wrapper').offsetWidth;
        const percentMove = (diff / containerWidth) * 100;
        this.currentTranslate = -this.currentIndex * 100 + percentMove;
    }

    handleTouchEnd() {
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
        const containerWidth = this.template.querySelector('.carousel-wrapper').offsetWidth;
        const percentMove = (diff / containerWidth) * 100;
        this.currentTranslate = -this.currentIndex * 100 + percentMove;
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
    }
}