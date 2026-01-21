import { LightningElement, api } from 'lwc';

export default class DeliveryPreferences extends LightningElement {
    @api totalPickupOrders = 15;
    @api totalHomeDeliveries = 32;
    @api avgDeliveryTime = 25;
    @api orderSatisfaction = 98;
}