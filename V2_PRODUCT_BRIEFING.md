# Leitor de PDF 1.x &rarr; Briefing para Versão 2.0

## 1. Propósito do Documento
Este briefing consolida as regras de negócio, experiências de uso e diretrizes visuais da versão atual do leitor. A intenção é servir de insumo direto para a concepção da versão 2.0, preservando o que já funciona bem e indicando pontos a evoluir, sem amarrar a arquitetura futura a decisões técnicas do passado.

## 2. Essência do Produto Atual
- **Plataforma**: Aplicação Angular responsiva, pensada para desktop, tablet e mobile.
- **Missão**: Exibir PDFs rapidamente a partir de URLs externas ou arquivos locais, com navegação fluida e identidade visual própria (tema "Coletânea Digital").
- **Usuário-alvo**: Pessoas que compartilham coleções de PDFs (ex.: partituras, manuais, materiais didáticos) e precisam alternar entre documentos com o mínimo de fricção.

## 3. Inventário de Funcionalidades
### 3.1 Aquisição de Documentos
- **Query string `url`**: Permite deep-link para abrir um documento automaticamente (`/?url=https://...`). Revalida e recarrega se a URL mudar.
- **Múltiplos PDFs via `urls`**: Aceita lista separada por vírgula ou barra vertical (`/?urls=pdf1,pdf2`). Mantém histórico da última combinação para evitar recarregamentos redundantes.

### 3.2 Gerenciamento de Vários PDFs
- **Carrossel de abas**: Exibe cada documento em um chip rolável horizontalmente; nome deduzido a partir da URL ou arquivo. Mostra contagem de páginas quando disponíveis.
- **Estados visuais por aba**:
  - *Ativa*: Gradiente roxo (#667eea &rarr; #764ba2), texto branco, badges translúcidas. Será refatorado, pois as cores não se adequam ao tema!!
  - *Inativa*: Fundo cinza-claro, texto escuro, bordas neutras.
  - *Carregando*: Opacidade reduzida + spinner.
  - *Erro*: Borda vermelha + ícone de alerta.
- **Estratégia de carregamento**: Primeiro documento é prioritário e bloqueante; os demais carregam em paralelo em background.

### 3.5 Feedback e Estados Globais
- **Overlay de carregamento**: Tela semitransparente com spinner sempre que um PDF principal está carregando.
- **Mensagens de erro**: Banner persistente posiciona ícone + texto (ex.: CORS, falha no arquivo). Para o primeiro PDF carregado falhar, orienta usuário a revisar a fonte.

### 3.6 Responsividade
- **Desktop (>1024px)**: Layout espaçoso, toolbar completa, abas largas.
- **Tablet (480–1024px)**: Componentes compactos, manutenção do carrossel e gestos.
- **Mobile (<480px)**: Botões reduzidos, texto abreviado, foco em gestos touch e rolagem mínima.

## 4. Diretrizes Visuais do Tema "Coletânea Digital"
### 4.1 Paleta Base (CSS Variables)
| Token | Hex | Uso principal |
|-------|-----|---------------|
| `--background-color` | `#4B2D2B` | Fundo estrutural da aplicação, toolbar e seções escuras |
| `--card-color` / `--card-bg` | `#FFF8E1` / `#f8f9fa` | Cards de conteúdo, área de drop |
| `--title-color` | `#6A2F2F` | Títulos internos e texto de destaque |
| `--gold-color` | `#D4AF37` | Borda, botões primários, divisores e destaques |
| `--placeholder-color` | `#F0E68C` | Títulos hero, placeholders, texto suave |
| `--btn-background-color` | `#6A3B39` | Fundo de botões secundários e chips da toolbar |
| Suportes (`--text-light`, `--text-dark`, `--badge-blue-bg`, `--badge-gray-bg`) | Branco pleno, azul-acinzentado | Tipografia em fundos específicos, badges numéricas e de categoria |

### 4.2 Tipografia
- **Títulos**: `EB Garamond`, peso 700, com `letter-spacing` amplo e sombra leve.
- **Corpo/Controles**: `Open Sans`, pesos 500–600 para botões e labels, 400 para texto corrente.
- **Escala**: hero 2,5rem (desktop) / 2rem (mobile), subtítulos ~1,4rem, botões 1,1rem, microtexto 0,9rem.

### 4.3 Componentização Visual
- **Toolbar**: Fundo marrom-escuro, borda inferior dourada, sombra média. Mantém-se fixa no topo ao rolar.
- **Botões**:
  - Primário: Fundo dourado, texto marrom-escuro, hover com leve escurecimento.
  - Ícone: Fundo escuro, borda dourada, ícone claro; encolhem progressivamente em telas menores.
  - Zoom level: Usa o mesmo tom dos botões secundários e alterna aparência quando o reset está disponível.
- **Carrossel de documentos**: Chips arredondadas, animações de hover e estado ativo com fundo marrom escuro e sombreado.
- **Mensageria**: Overlays usam contraste alto e ícones SVG padronizados.

### 4.4 Espaçamentos & Raios
- Variáveis globais: espaçamentos de 0.5rem a 2rem, raios de 8px (controles) e 12px (cards). Chips usam 24px ou `0.5rem` conforme contexto.
- Sombras: `--shadow-md` (cards, toolbar), `--shadow-lg` em hover e estados enfatizados.

## 5. Padrões de Interação por Dispositivo
| Contexto | Expectativa atual |
|----------|------------------|
| Desktop | Navegação majoritariamente por toolbar + teclado, scroll vertical livre no canvas |
| Tablet | Combinação de toques e botões; carrossel permanece acessível com rolagem horizontal suave. |
| Mobile | Gestos priorizados (swipe/pinch); botões ficam compactos e alguns controles (reset viewer) escondem-se em <380px para preservar espaço. |

## 6. Regras de Negócio Importantes
1. **Mensagens reativas**: O banner de erro e as instruções só aparecem quando relevantes e desaparecem de forma automática ou mediante nova ação.

## 7. Restrições & Pontos de Atenção para a V2
- **Dependência de CORS**: URLs externas precisam de permissões, gerando erros frequentes. Uma camada proxy ou fallback offline pode ser desejável.
- **Ausência de busca/anotações**: Usuários não conseguem localizar texto ou marcar páginas. Considerar na roadmap.
- **Performance em PDFs grandes**: Canvas único por página limita funcionalidades como pré-visualização e rolagem contínua.
- **Acessibilidade**: Falta descrição completa dos controles para leitores de tela e foco visível uniforme.
- **Internacionalização**: Textos fixos em português; avaliar necessidades multilíngues.

---
Este briefing reúne o pano de fundo necessário para que a IA (ou equipe) redefina o leitor na versão 2.0 preservando a coerência de negócio, experiência e identidade visual que os usuários já reconhecem.
