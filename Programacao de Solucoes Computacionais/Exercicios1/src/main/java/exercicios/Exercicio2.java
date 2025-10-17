package exercicios;
import java.util.Scanner;
public class Exercicio2 {
    public void resolve(){
        /*2. Escreva um programa para imprimir o padrão a seguir até um número inteiro
        positivo ‘n’ informado pelo usuário.
        1
        22
        333
        4444
        55555
        nnnnnn…...n (linha n com impressão de n valores)*/
        Scanner sc = new Scanner(System.in);
        int num;
        System.out.println("Digite um numero: ");
        num = sc.nextInt();
        for (int i = 1; i <= num; i++){
            for(int j =1;j<=num;j++){
                System.out.print(i);
            }
            System.out.println();
        }
    }
}
