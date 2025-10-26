public class Parsing01 {
    public static void main(String[] args) {
        //Declare and intitialize 3 Strings: shirtPrice, taxRate, and gibberish
        String shirtPrice = "15";
        String taxRate = "0.05";
        String gibberish = "887ds7nds87dsfs";
        //Parse shirtPrice and taxRate, and print the total tax
        int price = Integer.parseInt(shirtPrice);
        double tax = Double.parseDouble(taxRate);
        double totalTax = price * tax;
        System.out.println("Total tax: " + totalTax);
        //Try to parse taxRate as an int
        try {
            int wrongTax = Integer.parseInt(taxRate);
            System.out.println("Parsed taxRate as int: " + wrongTax);
        } catch (NumberFormatException e) {
            System.out.println("Cannot parse taxRate as int!");
        }
        //Try to parse gibberish as an int
        try {
            int nonsense = Integer.parseInt(gibberish);
            System.out.println("Parsed gibberish as int: " + nonsense);
        } catch (NumberFormatException e) {
            System.out.println("Cannot parse gibberish as int!");
        }
    }
    
}
