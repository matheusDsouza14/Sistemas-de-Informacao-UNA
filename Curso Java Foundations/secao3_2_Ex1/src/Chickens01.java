public class Chickens01 {
    public static void main(String[] args) {
        //Put yout code here
        //----- First scenario -----
        int eggsPerChicken = 5;
        int chickenCount = 3;
        int totalEggs = 0;
        //Monday
        totalEggs += chickenCount * eggsPerChicken;
        //Tuesday
        chickenCount += 1;
        totalEggs += chickenCount * eggsPerChicken;
        //Wednesday
        chickenCount /= 2;
        totalEggs += chickenCount * eggsPerChicken;
        System.out.println(totalEggs + " First scenario");
        //-----Second scenario -----
        eggsPerChicken = 4;
        chickenCount = 8;
        totalEggs = 0;
        //Monday
        totalEggs += chickenCount * eggsPerChicken;
        //Tuesday
        chickenCount += 1;
        totalEggs += chickenCount * eggsPerChicken;
        //Wednesday
        chickenCount /= 2;
        totalEggs += chickenCount * eggsPerChicken;
        System.out.println(totalEggs + " Second scenario");
    }   
}
