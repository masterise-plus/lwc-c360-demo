import { LightningElement, track } from 'lwc';

export default class CampaignCarousel extends LightningElement {
    @track currentIndex = 2; 
    @track isTransitioning = true;
    @track isMoving = false;
    @track displayPromos = [];
    timer;
    itemWidth = 606; // Harus sama dengan --promo-width di CSS

    originalData = [
        { id: '1', image: 'https://demo04-carousel-01.edgeone.app/loops%20carousel.png', title: 'Promo 1' },
        { id: '2', image: 'https://demo04-carousel-02.edgeone.app/carousel%202.png', title: 'Promo 2' },
        { id: '3', image: 'https://demo04-carousel-03.edgeone.app/carousel%203.png', title: 'Promo 3' },
        { id: '4', image: 'https://demo04-carousel-04.edgeone.app/carousel%204.png', title: 'Promo 4' }
    ];

    connectedCallback() {
        this.prepareData();
        this.startAutoPlay();
    }

    prepareData() {
        const data = this.originalData;
        const len = data.length;
        const clonesBefore = [data[len - 2], data[len - 1]];
        const clonesAfter = [data[0], data[1]];

        this.displayPromos = [
            ...clonesBefore.map(i => ({...i, id: 'before-'+i.id})),
            ...data,
            ...clonesAfter.map(i => ({...i, id: 'after-'+i.id}))
        ];
    }

    handleTransitionEnd() {
        this.isMoving = false;
        const total = this.originalData.length;

        if (this.currentIndex >= total + 2) {
            this.jump(2);
        } else if (this.currentIndex <= 1) {
            this.jump(total + 1);
        }
    }

    jump(target) {
        this.isTransitioning = false;
        this.currentIndex = target;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => { this.isTransitioning = true; }, 50);
    }

    handleNext() {
        if (this.isMoving) return;
        this.isMoving = true;
        this.isTransitioning = true;
        this.currentIndex++;
        this.resetTimer();
    }

    handlePrev() {
        if (this.isMoving) return;
        this.isMoving = true;
        this.isTransitioning = true;
        this.currentIndex--;
        this.resetTimer();
    }

    handleDotClick(event) {
        if (this.isMoving) return;
        const targetId = parseInt(event.target.dataset.index, 10);
        this.isMoving = true;
        this.isTransitioning = true;
        this.currentIndex = targetId + 1; 
        this.resetTimer();
    }

    get trackStyle() {
        // RUMUS AS TENGAH MUTLAK:
        // Karena track dimulai dari left: 50% (tengah), kita tarik mundur (negatif)
        // sejauh jarak index ditambah setengah lebar gambar.
        const offset = (this.currentIndex * this.itemWidth) + (this.itemWidth / 2);
        const transition = this.isTransitioning ? 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
        
        return `transform: translateX(${-offset}px); transition: ${transition};`;
    }

    get promos() {
        return this.displayPromos.map((item, index) => ({
            ...item,
            className: `promo-item ${index === this.currentIndex ? 'active' : ''} ${!this.isTransitioning ? 'no-transition' : ''}`
        }));
    }

    get dots() {
        const total = this.originalData.length;
        let logicalIndex = ((this.currentIndex - 2) % total + total) % total + 1;
        return this.originalData.map((item) => ({
            index: parseInt(item.id, 10),
            className: logicalIndex === parseInt(item.id, 10) ? 'dot active' : 'dot'
        }));
    }

    startAutoPlay() {
        this.stopAutoPlay();
        this.timer = setInterval(() => {
            if (!this.isMoving) this.handleNext();
        }, 4000);
    }

    stopAutoPlay() { if (this.timer) clearInterval(this.timer); }
    
    resetTimer() {
        this.stopAutoPlay();
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => this.startAutoPlay(), 2000); 
    }
}