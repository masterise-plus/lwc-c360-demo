public with sharing class apiConnectTest {
    @AuraEnabled(cacheable=true)
    public static List<String> getStoreNames() {
        List<String> storeNames = new List<String>();
        
        // Dummy data - replace with actual Apex callout to ERP/API
        storeNames.add('Jakarta Store');
        storeNames.add('Surabaya Store');
        storeNames.add('Bandung Store');
        storeNames.add('Medan Store');
        storeNames.add('Bali Store');
        
        return storeNames;
    }
}