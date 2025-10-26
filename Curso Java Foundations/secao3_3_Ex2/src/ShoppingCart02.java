public class ShoppingCart02 {
    public static void main(String[] args) {
        String custName = "Alex";
        String itemDesc = "Shirts";
        String message = custName+" wants to purchase two "+itemDesc;
        // Declare and initialize numeric fields: price, tax, quantity.   
        double price;
        double tax;
        int quantity;
        double total;
        // Declare and assign a calculated totalPrice
        price = 12.28;
        tax = 5;
        quantity = 2;
        total = (price * quantity)*(1 + tax / 100);
        // Modify message to include quantity 
        System.out.println(message);
        // Print another message with the total cost
        System.out.println("The total cost with taxes is: " + total);
    }    
}
