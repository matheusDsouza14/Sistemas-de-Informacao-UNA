public class Casting01 {
    public static void main(String[] args) {
        //Declare and initialize a byte with a value of 128
        //Observe NetBeans' complaint
        byte bit = (byte)128;
        //Declare and initialize a short with a value of 128
        short shurt = 128;
        //Create a print statement that casts this short to a byte
        System.out.println((byte)shurt);
        //Declare and initialize a byte with a value of 127
        byte bit2 = (byte)127;
        //Add 1 to this variable and print it
        bit2++;
        System.out.println(bit2);
        //Add 1 to this variable again and print it again
        bit2++;
        System.out.println(bit2);
    }    
}
