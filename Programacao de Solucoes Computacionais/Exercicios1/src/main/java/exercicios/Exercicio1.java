package exercicios;
import java.util.Scanner;
public class Exercicio1 {
    public void resolve(){
        /*1. Faça um programa que solicite um número inteiro ao
        usuário e calcule o número fatorial desse número.*/
        Scanner sc = new Scanner();
        int num,resultado;
        System.out.println("Digite um numero: ");
        num = sc.nextInt();
        resultado = num;
        for (int i = num-1;i>=1;i--){
            resultado *=i;
        }
        System.out.println("O fatorial de: " +  resultado);
    }
}
