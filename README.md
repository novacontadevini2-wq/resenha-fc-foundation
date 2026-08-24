# Resenha FC Foundation

FASE 1 — FUNDAÇÃO OFICIAL DO SISTEMA RESENHA FC

Quero iniciar a implementação de um sistema personalizado chamado Resenha FC.

IMPORTANTE: este projeto NÃO é um SaaS, NÃO é uma plataforma para vários clubes e NÃO deverá possuir arquitetura multi-tenant.

O sistema será desenvolvido exclusivamente para a gestão da pelada do Resenha FC Futebol Clube.

Não crie estruturas relacionadas a:

múltiplos clubes;

organizações;

tenants;

assinaturas;

planos;

cobrança;

billing;

marketplace;

onboarding de novos clubes;

criação de novas organizações.

Tudo deve ser pensado para uma única operação: Resenha FC Futebol Clube.

1. OBJETIVO DESTA FASE

Nesta primeira fase, quero construir somente a fundação do projeto.

Ainda NÃO quero implementar todos os módulos do sistema.

A prioridade desta fase é:

estruturar o projeto;

criar a identidade visual inicial;

criar a estrutura de navegação;

configurar a autenticação/base de usuários;

preparar a persistência de dados;

criar a base para desenvolvimento das próximas fases;

garantir que o projeto fique organizado e escalável.

Não avance por conta própria para implementar sorteios, torneios, rankings, partidas e outras funcionalidades complexas nesta fase.

Primeiro construa a fundação corretamente.

2. IDENTIDADE DO PRODUTO

Nome oficial:

Resenha FC

Nome completo:

Resenha FC Futebol Clube

O sistema será utilizado pelos jogadores e administradores da pelada.

A identidade visual deve transmitir:

futebol;

organização;

modernidade;

competitividade;

comunidade;

simplicidade.

3. IDENTIDADE VISUAL

A interface deve seguir o visual dos protótipos que forneci.

As cores principais devem ser:

Azul-marinho

Cor estrutural principal.

Utilizar em:

backgrounds;

cabeçalhos;

navegação;

elementos institucionais.

Laranja

Cor de destaque.

Utilizar em:

botões principais;

ações;

indicadores;

estrelas;

destaques;

elementos esportivos.

Branco

Utilizar em:

cards;

áreas de conteúdo;

textos de contraste;

componentes principais.

Azul complementar

Utilizar em:

elementos secundários;

indicadores;

estados informativos;

componentes auxiliares.

Evite introduzir cores desnecessárias.

A aparência deve ser consistente em todo o sistema.

4. ESTILO DA INTERFACE

A interface deverá ser:

mobile-first;

limpa;

moderna;

esportiva;

intuitiva;

responsiva;

com cards arredondados;

com boa hierarquia visual;

com botões grandes e fáceis de tocar;

com espaçamento confortável;

com excelente contraste.

O sistema será usado principalmente em celulares.

Também deverá funcionar adequadamente em tablet e desktop.

5. TECNOLOGIA

Utilize uma stack moderna e adequada ao ambiente do Lovable.

Preferência:

Frontend

React;

TypeScript;

Vite;

Tailwind CSS;

React Router;

componentes reutilizáveis.

Backend / persistência

Utilize a infraestrutura suportada pelo Lovable para:

autenticação;

banco de dados;

persistência;

regras de acesso.

A arquitetura deve ser preparada para posteriormente suportar uma API/backend organizado.

Se o Lovable utilizar Supabase como infraestrutura nativa do projeto, utilizar Supabase corretamente em vez de criar uma solução paralela desnecessária.

6. ESTRUTURA DE USUÁRIOS

O sistema terá inicialmente dois tipos de usuário:

ADMIN

Administrador do Resenha FC.

Terá acesso às funcionalidades administrativas.

PLAYER

Jogador da pelada.

Terá acesso às funcionalidades destinadas aos jogadores.

Não criar outros tipos de usuário neste momento.

A estrutura deverá permitir adicionar novos níveis posteriormente sem precisar refazer a autenticação.

7. AUTENTICAÇÃO

Nesta fase, criar a fundação da autenticação.

A aplicação deverá possuir:

Tela de Login

Elementos:

logotipo Resenha FC;

campo de usuário ou identificador de acesso;

campo de senha;

botão ENTRAR;

opção PRIMEIRO ACESSO;

opção ESQUECI MINHA SENHA.

A tela deve ser baseada visualmente no protótipo enviado.

8. FLUXO DE LOGIN

Fluxo esperado:

USUÁRIO
↓
TELA DE LOGIN
↓
INFORMA CREDENCIAIS
↓
SISTEMA VALIDA
↓
USUÁRIO AUTENTICADO
↓
APLICAÇÃO PRINCIPAL

Caso as credenciais sejam inválidas, mostrar uma mensagem amigável.

Nunca mostrar erros técnicos diretamente ao usuário.

Exemplo:

"Usuário ou senha inválidos."

9. PROTEÇÃO DE ROTAS

Criar estrutura de proteção de páginas.

Usuário não autenticado não poderá acessar as áreas internas do sistema.

Fluxo:

usuário acessa página protegida
↓
sistema verifica autenticação
↓
autenticado?
SIM → permite acesso
NÃO → redireciona para LOGIN

Além disso, páginas administrativas devem verificar o perfil do usuário.

PLAYER não pode acessar funcionalidades exclusivas de ADMIN.

10. PRIMEIRO ACESSO

Criar a tela/estrutura inicial para:

Primeiro Acesso

Nesta fase, não invente um processo complexo de identificação.

Apenas prepare a rota e a interface para que o fluxo possa ser implementado posteriormente.

Exemplo:

/primeiro-acesso

A tela deve informar que o usuário poderá ativar seu acesso ao sistema.

Não invente CPF, telefone, código ou outro identificador até que essa regra seja definida oficialmente.

11. RECUPERAÇÃO DE SENHA

Criar a estrutura inicial:

/recuperar-senha

A tela deverá permitir iniciar a recuperação de acesso.

Não exibir informações que revelem se uma determinada conta existe ou não.

12. ROTAS INICIAIS

Criar a estrutura das seguintes rotas:

/login

/primeiro-acesso

/recuperar-senha

/app/principal

/app/jogadores

/app/sorteio

/app/torneios

/app/admin

As páginas que ainda não serão implementadas nesta fase podem utilizar uma tela temporária elegante indicando:

"Esta funcionalidade será disponibilizada em breve."

Porém, as rotas e a estrutura devem existir.

13. NAVEGAÇÃO PRINCIPAL

A aplicação autenticada deverá possuir uma navegação inferior inspirada nos protótipos.

Áreas principais:

Principal

Tela inicial do Resenha FC.

Jogadores

Lista de jogadores.

Sorteio

Área de sorteios.

Torneio

Área de torneios.

A aba ativa deverá ficar visualmente destacada.

Não criar excesso de menus neste momento.

14. LAYOUT DA APLICAÇÃO

Criar um layout autenticado reutilizável.

Estrutura conceitual:

Header
↓
Conteúdo principal
↓
Bottom Navigation

Criar componentes reutilizáveis para:

Header;

Bottom Navigation;

Button;

Input;

Card;

Modal;

Avatar;

Badge;

Loading;

Empty State;

Error State;

Toast.

Não duplicar componentes visualmente equivalentes em páginas diferentes.

15. TELA PRINCIPAL — PRIMEIRA VERSÃO

Criar a primeira versão visual da tela:

/app/principal

Ela deverá reproduzir o conceito do protótipo.

Estrutura:

Header

logo Resenha FC.

Card do local

Exibir inicialmente:

Arena Portal do Gol

e um endereço de exemplo/placeholder até que o endereço oficial seja configurado.

O card deverá possuir espaço para futuramente abrir a localização no mapa.

Informações da pelada

Mostrar:

Toda segunda-feira

20h às 22h

Essas informações deverão ser preparadas para futuramente virem do banco/configurações, não ficar acopladas à lógica da aplicação.

Redes sociais

Criar card/área para:

Instagram oficial do Resenha FC.

O link real será configurado posteriormente.

Vídeos

Criar card/área para o conteúdo em vídeo do clube.

Também deverá ser configurável futuramente.

16. TELA DE JOGADORES — PRIMEIRA VERSÃO

Criar a rota:

/app/jogadores

Nesta fase, criar principalmente a estrutura visual.

A tela deverá possuir:

título;

campo de busca;

espaço para filtros;

lista de cards de jogadores;

estado vazio;

loading;

tratamento de erro.

O card deverá prever:

foto;

nome;

número;

posição;

avaliação em estrelas.

Não implementar ainda todo o CRUD administrativo.

A estrutura deve estar preparada para receber os dados do banco na próxima fase.

17. TELA DE SORTEIO — PRIMEIRA VERSÃO

Criar:

/app/sorteio

Nesta fase, criar apenas a estrutura visual inicial.

A tela deverá transmitir que este é o módulo responsável por criar as equipes da pelada.

Preparar espaço para futuramente:

selecionar jogadores;

definir quantidade de equipes;

definir jogadores por equipe;

executar sorteio;

visualizar times;

repetir sorteio.

Não criar ainda o algoritmo de sorteio.

18. TELA DE TORNEIO — PRIMEIRA VERSÃO

Criar:

/app/torneios

Nesta fase, criar apenas a estrutura visual.

Preparar espaço para:

torneio atual;

classificação;

partidas;

artilharia.

Não implementar ainda as regras do campeonato.

19. ÁREA ADMINISTRATIVA

Criar a estrutura protegida:

/app/admin

Somente usuários ADMIN poderão acessar.

Criar uma tela inicial administrativa com layout compatível com o restante do sistema.

Apresentar cards/resumos de espaço reservado para:

jogadores;

próximas rodadas;

partidas;

torneios;

gols;

artilharia.

Os dados podem ser placeholders nesta fase.

20. BANCO DE DADOS

Preparar a estrutura de persistência usando a tecnologia nativa recomendada pelo Lovable.

Se estiver utilizando Supabase, criar uma estrutura inicial compatível com:

users / auth

Utilizar o sistema de autenticação da plataforma.

players

Campos iniciais:

id;

user_id;

name;

nickname;

photo_url;

shirt_number;

status;

overall_rating;

created_at;

updated_at.

positions

Campos:

id;

code;

name;

active.

player_positions

Campos:

id;

player_id;

position_id;

is_primary.

seasons

Campos:

id;

name;

start_date;

end_date;

status;

created_at;

updated_at.

rounds

Campos:

id;

season_id;

scheduled_date;

start_time;

end_time;

location_name;

location_address;

status;

notes;

created_at;

updated_at.

Não implementar ainda todas as tabelas de partidas, gols e torneios se elas não forem necessárias para esta fase.

Prepare a arquitetura para elas posteriormente, mas não complique a primeira migration sem necessidade.

21. SEGURANÇA DO BANCO

Se estiver utilizando Supabase, configure corretamente as políticas de Row Level Security.

Regra geral:

PLAYER:

pode visualizar os dados públicos permitidos;

não pode modificar dados administrativos.

ADMIN:

pode executar operações administrativas.

Não deixar tabelas sensíveis acessíveis sem política de segurança.

Não utilizar políticas abertas do tipo "allow all" para dados administrativos.

22. DESIGN SYSTEM

Criar tokens centralizados para:

Cores

navy;

orange;

white;

blue.

Tipografia

Criar hierarquia consistente para:

títulos;

subtítulos;

texto;

labels;

informações auxiliares.

Componentes

Padronizar:

botões;

inputs;

cards;

badges;

modais;

navegação;

estados de loading;

estados vazios;

mensagens de erro.

23. RESPONSIVIDADE

A prioridade é mobile.

Validar pelo menos:

celular pequeno;

celular médio;

celular grande;

tablet;

desktop.

A interface não deve quebrar em telas pequenas.

Evitar:

larguras fixas excessivas;

overflow horizontal;

textos cortados;

botões pequenos;

elementos muito próximos.

24. UX

A experiência deve ser simples.

O usuário deve entender:

onde está;
qual tela está aberta;
qual é a ação principal;
quando uma operação está carregando;
quando uma operação terminou;
quando ocorreu um erro.

Sempre apresentar feedback visual adequado.

25. LOADING

Criar estados de carregamento reutilizáveis.

Não deixar telas em branco enquanto os dados estão sendo carregados.

Utilizar skeletons ou indicadores apropriados.

26. EMPTY STATES

Criar estados vazios elegantes.

Exemplo:

"Nenhum jogador encontrado."

"Nenhum torneio disponível."

"Nenhuma rodada criada."

Quando fizer sentido, mostrar uma ação administrativa para criar o primeiro registro.

27. ERROS

Erros devem ser apresentados de forma amigável.

Exemplo:

"Não foi possível carregar os jogadores."

Botão:

"Tentar novamente"

Nunca mostrar stack trace ou erro técnico para o usuário.

28. TOASTS

Criar um sistema reutilizável de notificações.

Exemplos:

"Login realizado com sucesso."

"Jogador salvo com sucesso."

"Alteração realizada com sucesso."

"Não foi possível concluir a operação."

29. ORGANIZAÇÃO DO CÓDIGO

Manter o projeto organizado.

Preferência:

src/

components/

layouts/

pages/

hooks/

services/

types/

utils/

contexts/

lib/

Não colocar toda a aplicação em um único arquivo.

Criar componentes reutilizáveis.

Evitar código duplicado.

30. REGRAS IMPORTANTES DE IMPLEMENTAÇÃO

Não criar funcionalidades fora do escopo desta fase.

Não inventar regras esportivas que ainda não foram definidas.

Não inventar regras do sorteio.

Não inventar critérios do campeonato.

Não criar arquitetura SaaS.

Não criar multi-tenant.

Não criar cobrança.

Não criar assinatura.

Não criar múltiplos clubes.

Não criar complexidade desnecessária.

31. DADOS FIXOS

As informações abaixo são apenas informações visuais iniciais do protótipo:

Resenha FC

Arena Portal do Gol

Toda segunda-feira

20h às 22h

Essas informações deverão ficar preparadas para futuramente serem administráveis.

Não espalhar esses valores pelo código.

Centralizar quando necessário.

32. OBJETIVO VISUAL DA FASE 1

Ao finalizar esta fase, quero conseguir abrir o sistema e visualizar uma experiência já parecida com o produto final:

Login
↓
Principal
↓
Jogadores
↓
Sorteio
↓
Torneio

com navegação funcionando, identidade visual do Resenha FC aplicada, autenticação preparada e estrutura de dados inicial criada.

33. CRITÉRIOS DE CONCLUSÃO DA FASE 1

Considere a Fase 1 concluída somente quando:

o projeto estiver organizado;

o frontend estiver funcionando;

a identidade visual estiver aplicada;

a navegação estiver funcionando;

a tela de login estiver implementada;

a estrutura de autenticação estiver funcionando;

as rotas privadas estiverem protegidas;

a separação ADMIN/PLAYER estiver preparada;

o banco inicial estiver configurado;

as tabelas iniciais estiverem criadas;

as políticas de segurança estiverem configuradas;

a aplicação estiver responsiva;

não houver erros críticos no console;

os componentes principais forem reutilizáveis.

34. IMPORTANTE — NÃO AVANCE PARA A FASE 2

Quando concluir tudo que foi solicitado nesta mensagem, pare.

Não implemente ainda:

algoritmo de sorteio;

criação real de equipes;

registro de gols;

classificação;

cálculo de ranking;

campeonato completo;

notificações;

funcionalidades avançadas.

A próxima fase será enviada separadamente.

35. RESULTADO ESPERADO

Ao final desta fase, quero ter a fundação funcional do Resenha FC, pronta para receber os próximos módulos.

O resultado deverá parecer o início de um aplicativo real, e não apenas um template genérico.

A identidade deverá ser claramente:

RESENHA FC

O sistema deverá transmitir que foi criado especificamente para a gestão dessa pelada.

Implemente esta fase com atenção à qualidade do código, organização, segurança, responsividade e consistência visual.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/32c8131a-609e-46f4-b787-d22a75b6da80).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
