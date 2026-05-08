import pygame
import random
import sys

# Inicialização
pygame.init()
LARGURA, ALTURA = 800, 600
tela = pygame.display.set_mode((LARGURA, ALTURA))
pygame.display.set_caption("🚴 Corrida Verde - Sustentabilidade Urbana")
relogio = pygame.time.Clock()
fonte = pygame.font.Font(None, 36)
fonte_grande = pygame.font.Font(None, 72)

# 🎨 CORES (CORRIGIDO - TODAS DEFINIDAS)
PRETO = (0, 0, 0)
BRANCO = (255, 255, 255)
VERDE = (0, 255, 0)
CINZA = (128, 128, 128)
AMARELO = (255, 255, 0)
VERMELHO = (255, 0, 0)
AZUL = (0, 100, 255)

class Jogador:
    def __init__(self):
        self.x = 100
        self.y = 420
        self.velocidade = 5
        self.largura = 60
        self.altura = 60
        self.pontos = 0
        self.co2_economizado = 0
        
    def mover(self, teclas):
        if teclas[pygame.K_LEFT] and self.x > 0:
            self.x -= self.velocidade
        if teclas[pygame.K_RIGHT] and self.x < LARGURA - self.largura:
            self.x += self.velocidade
        if teclas[pygame.K_UP] and self.y > 300:
            self.y -= self.velocidade
        if teclas[pygame.K_DOWN] and self.y < ALTURA - self.altura:
            self.y += self.velocidade
    
    def desenhar(self, tela):
        # Caminhão simples (CORRIGIDO)
        pygame.draw.rect(tela, VERDE, (self.x, self.y, self.largura, self.altura))
        pygame.draw.circle(tela, PRETO, (self.x + 15, self.y + self.altura), 12)
        pygame.draw.circle(tela, PRETO, (self.x + 45, self.y + self.altura), 12)

class ItemReciclavel:
    def __init__(self):
        self.x = random.randint(0, LARGURA - 30)
        self.y = -30
        self.velocidade = random.randint(3, 6)
        self.largura = 30
        self.altura = 30
        self.tipo = random.choice(['plastico', 'papel', 'vidro'])
    
    def atualizar(self):
        self.y += self.velocidade
    
    def desenhar(self, tela):
        cor = AMARELO if self.tipo == 'plastico' else VERDE if self.tipo == 'papel' else AZUL
        pygame.draw.rect(tela, cor, (self.x, self.y, self.largura, self.altura))
        pygame.draw.rect(tela, PRETO, (self.x, self.y, self.largura, self.altura), 2)

class Obstaculo:
    def __init__(self):
        self.x = random.randint(0, LARGURA - 50)
        self.y = -50
        self.velocidade = random.randint(4, 7)
        self.largura = 50
        self.altura = 80
    
    def atualizar(self):
        self.y += self.velocidade
    
    def desenhar(self, tela):
        # Carro poluente
        pygame.draw.rect(tela, VERMELHO, (self.x, self.y, self.largura, self.altura))
        pygame.draw.rect(tela, CINZA, (self.x + 5, self.y + 10, 40, 20))  # Janela

# Jogo principal
def main():
    jogador = Jogador()
    itens = []
    obstaculos = []
    score = 0
    tempo = 0
    
    rodando = True
    while rodando:
        # INPUT
        for evento in pygame.event.get():
            if evento.type == pygame.QUIT:
                rodando = False
        
        teclas = pygame.key.get_pressed()
        jogador.mover(teclas)
        
        # UPDATE
        tempo += 1
        
        # Gerar itens recicláveis
        if random.randint(1, 30) == 1:
            itens.append(ItemReciclavel())
        
        # Gerar obstáculos
        if random.randint(1, 40) == 1:
            obstaculos.append(Obstaculo())
        
        # Atualizar itens
        for item in itens[:]:
            item.atualizar()
            if item.y > ALTURA:
                itens.remove(item)
            # Colisão com item
            elif (jogador.x < item.x + item.largura and
                  jogador.x + jogador.largura > item.x and
                  jogador.y < item.y + item.altura and
                  jogador.y + jogador.altura > item.y):
                itens.remove(item)
                jogador.pontos += 10
                jogador.co2_economizado += 5
        
        # Atualizar obstáculos
        for obs in obstaculos[:]:
            obs.atualizar()
            if obs.y > ALTURA:
                obstaculos.remove(obs)
            # Colisão com obstáculo (GAME OVER)
            elif (jogador.x < obs.x + obs.largura and
                  jogador.x + jogador.largura > obs.x and
                  jogador.y < obs.y + obs.altura and
                  jogador.y + jogador.altura > obs.y):
                return mostrar_game_over(tela, jogador.pontos, jogador.co2_economizado)
        
        # DRAW
        tela.fill((135, 250, 235))  # Céu
        
        # Rua
        pygame.draw.rect(tela, CINZA, (0, 400, LARGURA+500, 100))
        pygame.draw.rect(tela, AMARELO, (0, 440, LARGURA+500, 5))  # Linha central
        
        jogador.desenhar(tela)
        
        for item in itens:
            item.desenhar(tela)
        for obs in obstaculos:
            obs.desenhar(tela)
        
        # HUD
        texto_pontos = fonte.render(f"Pontos: {jogador.pontos}", True, BRANCO)
        texto_co2 = fonte.render(f"CO2 Economizado: {jogador.co2_economizado}kg", True, BRANCO)
        texto_nivel = fonte.render(f"Nível: {min(jogador.pontos//200 + 1, 10)}", True, BRANCO)
        
        tela.blit(texto_pontos, (10, 10))
        tela.blit(texto_co2, (10, 50))
        tela.blit(texto_nivel, (10, 90))
        
        # Instruções
        instrucoes = pygame.font.Font(None, 24).render("← → ↑ ↓ para mover | Colete itens VERDES!", True, BRANCO)
        tela.blit(instrucoes, (10, ALTURA - 30))
        
        pygame.display.flip()
        relogio.tick(60)
    
    pygame.quit()
    sys.exit()

def mostrar_game_over(tela, pontos, co2):
    tela.fill(PRETO)
    titulo = fonte_grande.render("GAME OVER", True, VERDE)
    pontuacao = fonte.render(f"Pontos: {pontos}", True, BRANCO)
    impacto = fonte.render(f"Você economizou {co2}kg de CO2!", True, VERDE)
    mensagem = pygame.font.Font(None, 32).render("Reciclar faz bem pro planeta! ♻️", True, AMARELO)
    reiniciar = fonte.render("Pressione ESPAÇO para jogar novamente", True, BRANCO)
    
    tela.blit(titulo, (250, 150))
    tela.blit(pontuacao, (300, 250))
    tela.blit(impacto, (250, 300))
    tela.blit(mensagem, (200, 350))
    tela.blit(reiniciar, (200, 450))
    
    pygame.display.flip()
    
    esperando = True
    while esperando:
        for evento in pygame.event.get():
            if evento.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if evento.type == pygame.KEYDOWN: 
                if evento.key == pygame.K_SPACE:
                    return main()
    
    return None

if __name__ == "__main__":
    main()