package exercicios;
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Exercicio1 exercicio1 = new Exercicio1();
        Exercicio2 exercicio2 = new Exercicio2();
        int opt;
        do {
            System.out.println("Digite o número do exercício (apenas número). Digite 0 para terminar:");
            opt = sc.nextInt();
            switch (opt) {
                case 1:
                    exercicio1.resolve();
                    break;
                case 2:
                    exercicio2.resolve();
                    break;
                case 3:

                    break;
                case 4:

                    break;
                default:
                    System.out.println("Opção inválida! Tente novamente.");
                    break;
            }
        } while (opt != 0);
        sc.close();
    }
}
