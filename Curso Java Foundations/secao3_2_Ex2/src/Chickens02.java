public class Chickens02 {
    public static void main(String[] args) {
        //Put yout code here
double mondayEggs = 100;
        double tuesdayEggs = 121;
        double wednesdayEggs = 117;
        double dailyAverage = (mondayEggs + tuesdayEggs + wednesdayEggs) / 3;
        double monthlyAverage = dailyAverage * 30;
        double monthlyProfit = monthlyAverage * 0.18;
        System.out.println("Daily Average:   " +dailyAverage);
        System.out.println("Monthly Average: " +monthlyAverage);
        System.out.println("Monthly Profit:  $" +monthlyProfit);
    }
    
}
