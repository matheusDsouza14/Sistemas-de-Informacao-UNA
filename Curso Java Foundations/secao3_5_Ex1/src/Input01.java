import javax.swing.JOptionPane;
public class Input01 {
    public static void main(String[] args) {
        //Create a JOptionPane.
        //Store the input as a String and print it.
        String inputString = JOptionPane.showInputDialog("Type a integer number: ");
        System.out.println("You typed: " + inputString);
        //Parse the input as an int.
        //Print its value +1
        int input = Integer.parseInt(inputString);
        System.out.println("The number plus one is: " + (input++));
        //Try creating a dialog, parsing it, and initializing an int in a single line.
        //You should have only one semicolon (;) in this line.
        int valor = Integer.parseInt(JOptionPane.showInputDialog("Type another number: ")) + 1;
        System.out.println("Value incremented (in one line): " + valor);
    }
}
