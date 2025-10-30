package org.example;
import java.util.Random;
import java.util.Scanner;
public class Main {
    static void main(String[] args) {
        /*
            Matheus Dell'Areti de Souza - 325126354
            Kauã Kellysson de Oliveira Mendes - 32511708
        */
            Random random = new Random();
            Scanner scan = new Scanner(System.in);
            int palpite, tentativa = 7,random_num = random.nextInt(100)+1;
            //System.out.println(random_num);
            System.out.println("Bem vindo ao randomizador");
            for(int i = 1; i <= 7; i++){
                System.out.println("Digite um numero entre 1 e 100     Tentativas: "+ tentativa);
                palpite = scan.nextInt();
                if (palpite < random_num){
                    System.out.println("Errou!!! O numero digitado é menor que o numero escolhido");
                    tentativa--;
                }else if(palpite > random_num){
                    System.out.println("O numero digitado é maior que o numero escolhido");
                    tentativa--;
                }else {
                    System.out.println("Você ganhou!!!!!!");
                    break;
                }
                if(tentativa == 0){
                    System.out.println("Você Perdeu :( O numero secreto era: " + random_num);
                }
            }
    }
}
