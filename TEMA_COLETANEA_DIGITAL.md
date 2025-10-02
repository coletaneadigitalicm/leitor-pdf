# Tema Visual "Coletânea Digital"

## Visão Geral
Este documento define o tema visual completo do projeto "Coletânea Digital", um design elegante e clássico com inspiração em livros antigos e coletâneas musicais tradicionais. O tema utiliza tons terrosos, dourados e uma tipografia serifada sofisticada para criar uma atmosfera refinada e acolhedora.

---

## 🎨 Paleta de Cores

### Cores Principais

#### Background e Estrutura
```css
--background-color: #4B2D2B;
```
- **Nome**: Marrom Escuro / Sienna Escuro
- **Uso**: Cor de fundo principal da aplicação
- **Contexto**: Evoca a sensação de papel antigo ou couro de livros clássicos
- **Exemplo de uso**: `background`, `body`, containers principais

#### Cor Dourada (Destaque Principal)
```css
--gold-color: #D4AF37;
```
- **Nome**: Dourado Antigo / Old Gold
- **Uso**: Cor de destaque, bordas, elementos interativos
- **Contexto**: Representa elegância e sofisticação, usado para chamar atenção
- **Exemplo de uso**: bordas de inputs, texto de botões secundários, ícones, títulos de seção

#### Cor de Placeholder/Título
```css
--placeholder-color: #F0E68C;
```
- **Nome**: Khaki Claro / Light Khaki
- **Uso**: Títulos principais, placeholders
- **Contexto**: Tom mais suave de amarelo/dourado para criar hierarquia visual
- **Exemplo de uso**: título "COLETÂNEA DIGITAL", placeholders de campos de busca

#### Cor de Card/Conteúdo
```css
--card-color: #FFF8E1;
```
- **Nome**: Creme / Cream
- **Uso**: Fundo de cards de conteúdo
- **Contexto**: Simula papel envelhecido, proporcionando contraste suave com o fundo escuro
- **Exemplo de uso**: cards de resultados, containers de conteúdo interno

#### Cor de Título (Cards)
```css
--title-color: #6A2F2F;
```
- **Nome**: Marrom Avermelhado
- **Uso**: Títulos dentro de elementos de conteúdo
- **Contexto**: Cria hierarquia de texto com tom mais quente
- **Exemplo de uso**: títulos de cards, headings secundários

#### Cor de Botão
```css
--btn-background-color: #6A3B39;
```
- **Nome**: Marrom Médio
- **Uso**: Fundo de botões secundários
- **Contexto**: Tom intermediário entre o background e o dourado
- **Exemplo de uso**: botões de ação secundária, elementos clicáveis

### Cores Complementares (Sistema)

#### Texto Primário em Fundos Escuros
```css
color: #FFF; /* Branco puro */
color: rgba(255, 255, 255, 0.7); /* Branco com 70% opacidade para textos secundários */
```

#### Cards e Elementos de Conteúdo
```css
background: #f8f9fa; /* Cinza muito claro - cards de resultado */
border: #e9ecef; /* Cinza claro para bordas */
color: #2c3e50; /* Azul-cinza escuro para texto em fundos claros */
```

#### Badges e Tags
```css
background: #e3f2fd; /* Azul muito claro - para números/códigos */
background: #f5f7fa; /* Cinza azulado claro - para categorias */
```

---

## 📝 Tipografia

### Família de Fontes

#### Fonte Serifada - EB Garamond (Títulos Principais)
```css
font-family: 'EB Garamond', serif;
```
- **Uso**: Títulos principais, cabeçalhos de destaque
- **Características**: Fonte serifada clássica, elegante, com variações de peso (100-900)
- **Fonte Variável**: Suporta weights de 100 a 900
- **Variantes**: Normal e Itálico
- **Exemplo**: Título "COLETÂNEA DIGITAL"
- **Fallback**: `serif`

**Importação (Google Fonts):**
```html
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Ou via @font-face (local):**
```css
@font-face {
    font-family: 'EB Garamond';
    src: url('../fonts/EBGaramond-VariableFont_wght.ttf') format('truetype');
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
}
```

#### Fonte Sans-Serif - Open Sans (Corpo de Texto)
```css
font-family: 'Open Sans', sans-serif;
```
- **Uso**: Corpo de texto, inputs, botões, conteúdo geral
- **Características**: Limpa, legível, moderna, humanista
- **Fonte Variável**: Suporta weights de 100 a 900 e widths de 75% a 100%
- **Variantes**: Normal e Itálico
- **Fallback**: `sans-serif`

**Importação (Google Fonts):**
```html
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

**Ou via @font-face (local):**
```css
@font-face {
    font-family: 'Open Sans';
    src: url('../fonts/OpenSans-VariableFont_wdth,wght.ttf') format('truetype');
    font-weight: 100 900;
    font-stretch: 75% 100%;
    font-style: normal;
    font-display: swap;
}
```

### Hierarquia de Tamanhos

#### Título Principal (H1)
```css
font-size: 2.5rem; /* 40px @ base 16px */
font-family: 'EB Garamond', serif;
font-weight: 700;
color: var(--placeholder-color);
letter-spacing: 2px;
text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
```

**Mobile:**
```css
font-size: 2rem; /* 32px */
```

#### Título de Card (H3)
```css
font-size: 1.4rem; /* 22.4px */
color: #2c3e50;
line-height: 1.3;
font-family: 'Open Sans', sans-serif;
font-weight: 600;
```

#### Input de Busca
```css
font-size: 1.2rem; /* 19.2px */
font-family: 'Open Sans', sans-serif;
color: #FFF;
```

#### Botões
```css
font-size: 1.1rem; /* 17.6px */
font-family: 'Open Sans', sans-serif;
font-weight: 500;
```

#### Texto de Badge/Tag
```css
font-size: 1.1rem; /* 17.6px */
font-weight: 600;
```

#### Texto de Filtro
```css
font-size: 0.9rem; /* 14.4px */
font-weight: 600;
color: var(--gold-color);
```

---

## 🎯 Componentes e Estilos

### Inputs de Texto

```css
.input-padrao {
    height: 44px;
    border: 2px solid var(--gold-color);
    border-radius: 8px;
    background: var(--background-color);
    color: #FFF;
    padding: 0 16px;
    font-size: 1.2rem;
    font-family: 'Open Sans', sans-serif;
    outline: none;
}

.input-padrao::placeholder {
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
}
```

### Botões

#### Botão Primário (Dourado)
```css
.btn-primario {
    background: var(--gold-color);
    color: var(--background-color);
    border: 2px solid var(--gold-color);
    border-radius: 8px;
    height: 44px;
    padding: 0 24px;
    font-size: 1.1rem;
    font-family: 'Open Sans', sans-serif;
    font-weight: 500;
    cursor: pointer;
    transition: filter 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.btn-primario:hover {
    filter: brightness(0.97);
}
```

#### Botão Secundário (Outline)
```css
.btn-secundario {
    background: var(--background-color);
    color: var(--gold-color);
    border: 2px solid var(--gold-color);
    border-radius: 8px;
    height: 44px;
    padding: 0 24px;
    font-size: 1.1rem;
    font-family: 'Open Sans', sans-serif;
    font-weight: 500;
    cursor: pointer;
    transition: filter 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.btn-secundario:hover {
    filter: brightness(1.1);
}

.btn-secundario:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
```

### Cards

```css
.card-resultado {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
}

.card-resultado:hover {
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
    border-color: #dee2e6;
}

.card-resultado:active {
    transform: translateY(0);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
```

### Badges/Tags

```css
.badge-numero {
    background: #e3f2fd;
    color: #2c3e50;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 1.1rem;
    font-weight: 600;
    display: inline-block;
    width: fit-content;
}

.badge-categoria {
    background: #f5f7fa;
    color: #2c3e50;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 1.1rem;
    font-weight: 500;
}
```

### Container Principal

```css
.container-principal {
    background: var(--background-color);
    min-height: 100vh;
    padding: 2rem;
}

@media (max-width: 960px) {
    .container-principal {
        padding: 1rem;
    }
}
```

---

## 🎨 Efeitos Visuais

### Sombras

#### Sombra de Card (Padrão)
```css
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
```

#### Sombra de Card (Hover)
```css
box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
```

#### Sombra de Texto (Título Principal)
```css
text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
```

#### Sombra de Botão
```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
```

### Transições

#### Transição de Hover (Cards)
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

#### Transição de Botão
```css
transition: filter 0.2s, transform 0.2s;
```

#### Transição de Cor
```css
transition: background 0.2s, color 0.2s, box-shadow 0.2s;
```

### Animações

#### Spinner de Carregamento
```css
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-left: 4px solid #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
```

#### Fade In (Conteúdo)
```css
.fade-in {
    opacity: 0;
    transition: opacity 0.3s ease;
}

.fade-in.active {
    opacity: 1;
}
```

### Border Radius (Padrões)

- **Inputs e Botões**: `8px`
- **Cards**: `12px`
- **Badges**: `0.5rem` (8px)
- **Container Principal**: `12px`

---

## 📐 Espaçamento e Layout

### Grid/Flex Gap
```css
gap: 12px; /* Padrão para containers de filtros */
gap: 10px; /* Padrão para botões em linha */
gap: 8px; /* Padrão para ícones e texto */
```

### Padding
```css
padding: 16px; /* Container de busca */
padding: 1.5rem; /* Cards (24px) */
padding: 0.5rem 1rem; /* Badges (8px 16px) */
padding: 2rem; /* Container principal desktop (32px) */
padding: 1rem; /* Container principal mobile (16px) */
```

### Margin
```css
margin-bottom: 2rem; /* Espaçamento entre seções (32px) */
margin-bottom: 1rem; /* Espaçamento entre elementos (16px) */
```

### Larguras Responsivas

#### Desktop
```css
min-width: 50vw;
max-width: 50vw;
```

#### Mobile (max-width: 960px)
```css
min-width: 80vw;
max-width: 80vw;
```

#### Mobile Pequeno (max-width: 768px)
```css
min-width: 90vw;
max-width: 90vw;
```

---

## 🔧 Variáveis CSS Completas

```css
:root {
    /* Cores Principais */
    --background-color: #4B2D2B;
    --card-color: #FFF8E1;
    --title-color: #6A2F2F;
    --gold-color: #D4AF37;
    --placeholder-color: #F0E68C;
    --btn-background-color: #6A3B39;
    
    /* Cores de Sistema */
    --text-light: #FFF;
    --text-light-secondary: rgba(255, 255, 255, 0.7);
    --card-bg: #f8f9fa;
    --card-border: #e9ecef;
    --card-border-hover: #dee2e6;
    --text-dark: #2c3e50;
    --badge-blue-bg: #e3f2fd;
    --badge-gray-bg: #f5f7fa;
    
    /* Sombras */
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 2px 12px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 6px 25px rgba(0, 0, 0, 0.15);
    --text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    
    /* Tipografia */
    --font-serif: 'EB Garamond', serif;
    --font-sans: 'Open Sans', sans-serif;
    
    /* Tamanhos */
    --text-xs: 0.9rem;
    --text-sm: 1.1rem;
    --text-md: 1.2rem;
    --text-lg: 1.4rem;
    --text-xl: 2rem;
    --text-2xl: 2.5rem;
    
    /* Espaçamentos */
    --spacing-xs: 0.5rem;
    --spacing-sm: 1rem;
    --spacing-md: 1.5rem;
    --spacing-lg: 2rem;
    
    /* Border Radius */
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-tag: 0.5rem;
    
    /* Transições */
    --transition-fast: 0.2s;
    --transition-normal: 0.3s;
    --transition-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 📱 Responsividade

### Breakpoints

```css
/* Desktop Padrão: > 960px */
/* Tablet/Mobile: ≤ 960px */
@media (max-width: 960px) { }

/* Mobile Pequeno: ≤ 768px */
@media (max-width: 768px) { }
```

### Ajustes Mobile

1. **Containers**: Largura aumenta de 50vw para 80-90vw
2. **Títulos**: Tamanho de fonte reduzido (2.5rem → 2rem)
3. **Padding**: Reduzido de 2rem para 1rem
4. **Alinhamento**: De centralizado vertical para topo
5. **Overflow**: Sempre visível para permitir scroll natural

---

## 🎯 Diretrizes de Uso para IAs

### Quando Aplicar Este Tema

1. **Projetos de Coletâneas**: Sistemas de biblioteca, acervos musicais, catálogos culturais
2. **Aplicações Clássicas**: Interfaces que requeiram elegância e sofisticação
3. **Sistemas de Pesquisa**: Ferramentas de busca e catalogação de conteúdo cultural

### Ordem de Implementação

1. **Configurar variáveis CSS** no `:root` ou arquivo de configuração
2. **Importar fontes** (EB Garamond + Open Sans)
3. **Aplicar cores de fundo** (background-color principal)
4. **Estilizar componentes base** (inputs, botões, cards)
5. **Adicionar transições e sombras**
6. **Implementar responsividade**

### Combinações de Cores

#### Background Escuro + Texto Claro
```css
background: var(--background-color);
color: var(--text-light);
border: 2px solid var(--gold-color);
```

#### Card Claro + Texto Escuro
```css
background: var(--card-bg);
color: var(--text-dark);
border: 1px solid var(--card-border);
```

#### Botão Primário
```css
background: var(--gold-color);
color: var(--background-color);
border: 2px solid var(--gold-color);
```

#### Botão Secundário
```css
background: var(--background-color);
color: var(--gold-color);
border: 2px solid var(--gold-color);
```

### Acessibilidade

- **Contraste mínimo**: 4.5:1 para texto normal
- **Área clicável mínima**: 44x44px
- **Estados interativos**: Sempre incluir `:hover`, `:focus`, `:active`
- **Estados desabilitados**: `opacity: 0.6` + `cursor: not-allowed`

### Performance

- **Font-display**: Use `swap` para evitar FOIT (Flash of Invisible Text)
- **Transições**: Limite a propriedades que não causam reflow (opacity, transform, filter)
- **Sombras**: Use com moderação, podem impactar performance em listas grandes

---

## 📋 Checklist de Implementação

- [ ] Importar fontes EB Garamond e Open Sans
- [ ] Definir variáveis CSS no `:root`
- [ ] Aplicar background-color principal (#4B2D2B)
- [ ] Configurar tipografia padrão (Open Sans para body)
- [ ] Estilizar título principal (EB Garamond, 2.5rem, dourado)
- [ ] Criar inputs com borda dourada e placeholder itálico
- [ ] Implementar botões primário (dourado) e secundário (outline)
- [ ] Estilizar cards com sombra e hover elevado
- [ ] Adicionar badges com cores diferenciadas
- [ ] Configurar responsividade (breakpoints 960px e 768px)
- [ ] Implementar animação de loading
- [ ] Adicionar transições suaves em elementos interativos
- [ ] Testar contraste de cores (acessibilidade)
- [ ] Validar estados disabled em botões e inputs

---

## 🎨 Exemplos de Código Prontos

### HTML Base com Tema
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meu Projeto - Tema Coletânea Digital</title>
    <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="tema-coletanea.css">
</head>
<body>
    <div class="container-principal">
        <h1 class="titulo-principal">MEU PROJETO</h1>
        <!-- Conteúdo aqui -->
    </div>
</body>
</html>
```

### CSS Base
```css
/* Importar variáveis do tema */
@import url('tema-coletanea-vars.css');

/* Reset e Base */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html, body {
    background: var(--background-color);
    color: var(--text-light);
    font-family: var(--font-sans);
    scroll-behavior: smooth;
    min-height: 100vh;
}

/* Título Principal */
.titulo-principal {
    font-family: var(--font-serif);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--placeholder-color);
    text-align: center;
    letter-spacing: 2px;
    text-shadow: var(--text-shadow);
    margin-bottom: var(--spacing-lg);
}

/* Container Principal */
.container-principal {
    max-width: 50vw;
    margin: 0 auto;
    padding: var(--spacing-lg);
    min-height: 100vh;
}

@media (max-width: 960px) {
    .container-principal {
        max-width: 90vw;
        padding: var(--spacing-sm);
    }
    
    .titulo-principal {
        font-size: var(--text-xl);
    }
}
```

---

## 🌟 Inspiração e Conceito

Este tema foi criado para evocar:
- **Elegância clássica** de bibliotecas e salas de música antigas
- **Sofisticação** de coletâneas musicais tradicionais
- **Acessibilidade** mantendo legibilidade e contraste adequados
- **Modernidade** através de transições suaves e design responsivo

O contraste entre o **marrom escuro terroso** e o **dourado brilhante** cria uma estética atemporal que funciona tanto para conteúdo cultural quanto para aplicações que exigem um toque de classe e refinamento.

---

**Última atualização**: Outubro 2025  
**Versão**: 1.0  
**Autor**: Jairo (ICM)
