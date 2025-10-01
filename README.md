# Leitor de PDF - Angular 20

Um leitor de PDF moderno e responsivo construído com Angular 20 standalone.

## ✨ Funcionalidades

- 📱 **Totalmente Responsivo**: Funciona perfeitamente em smartphones, tablets e desktops
- 📄 **Upload de PDF**: 
  - Drag and drop de arquivos
  - Seleção clicando na área de upload
  - **NOVO:** Upload de múltiplos PDFs simultaneamente
  - Carregamento a partir de URL
  - **NOVO:** Múltiplos PDFs com carrossel de abas
- 🔍 **Controles de Zoom**: Aumentar, diminuir e resetar zoom
- ⬅️➡️ **Navegação de Páginas**: 
  - Botões de navegação
  - Setas do teclado (← →)
  - Gestos de swipe em dispositivos touch
- 📚 **Visualização Multi-Documento**: 
  - Carrossel de abas horizontal
  - Indicador visual de aba ativa
  - Carregamento inteligente (primeiro rápido, resto em background)
  - Contador de páginas por documento
  - Suporta upload e URL
- 🎨 **Interface Moderna**: Design limpo e intuitivo com gradientes vibrantes

## 🚀 Tecnologias Utilizadas

- Angular 20 (Standalone Components)
- PDF.js para renderização de PDF
- SCSS para estilização
- TypeScript
- Angular CDK para gestos

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start
```

A aplicação estará disponível em `http://localhost:4200/`

## 🎮 Como Usar

### Carregar PDF por URL

**Opção 1 - Através da Interface:**
1. Digite ou cole a URL do PDF no campo de texto
2. Clique em "Carregar da URL"

**Opção 2 - Query Parameter (Link Direto):**
Use a URL com o parâmetro `url` para abrir PDFs automaticamente:

```
http://localhost:4200/?url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
```

**Opção 3 - Múltiplos PDFs (✨ NOVO!):**
Use o parâmetro `urls` com vírgula ou pipe para carregar vários PDFs:

```
http://localhost:4200/?urls=URL1,URL2,URL3
```

Exemplo:
```
http://localhost:4200/?urls=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf,https://www.africau.edu/images/default/sample.pdf
```

- Primeiro PDF carrega imediatamente
- Outros PDFs carregam em paralelo no background
- Carrossel de abas para navegar entre documentos
- Indicador visual de aba ativa
- 100% responsivo

Veja mais em [MULTIPLE_PDFS.md](MULTIPLE_PDFS.md)

### Fazer Upload de Arquivo

**Opção 1 - Upload Múltiplo (✨ NOVO!):**
1. Clique na área de upload
2. **Selecione múltiplos arquivos PDF** (Ctrl/Cmd + clique ou Shift + clique)
3. Todos os PDFs aparecem no carrossel de abas
4. Primeiro PDF carrega imediatamente, outros em paralelo

**Opção 2 - Drag and Drop (✨ Múltiplos!):**
1. **Arraste um ou mais arquivos PDF** para a área de upload
2. Solte os arquivos quando a área ficar destacada
3. Todos os PDFs são processados automaticamente

Veja mais em [UPLOAD_MULTIPLO.md](UPLOAD_MULTIPLO.md)

### Navegação

- **Botões**: Use os botões de seta no topo para avançar/voltar páginas
- **Teclado**: 
  - `←` (seta esquerda): Página anterior
  - `→` (seta direita): Próxima página
  - `+` ou `=`: Aumentar zoom
  - `-`: Diminuir zoom
  - `0`: Resetar zoom
- **Touch/Swipe** (em dispositivos móveis):
  - Deslize para a esquerda: Próxima página
  - Deslize para a direita: Página anterior

### Controles de Zoom

- **Aumentar Zoom**: Clique no botão de lupa com `+`
- **Diminuir Zoom**: Clique no botão de lupa com `-`
- **Resetar Zoom**: Clique no indicador de porcentagem de zoom

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm start

# Build de produção
npm run build

# Executar testes
npm test

# Watch mode (desenvolvimento)
npm run watch
```

## 📱 Compatibilidade

- Chrome/Edge (versões recentes)
- Firefox (versões recentes)
- Safari (versões recentes)
- Navegadores móveis modernos

## 🎨 Estrutura do Projeto

```
src/
├── app/
│   ├── pdf-viewer/
│   │   ├── pdf-viewer.component.ts    # Lógica do leitor
│   │   ├── pdf-viewer.component.html  # Template
│   │   └── pdf-viewer.component.scss  # Estilos
│   ├── app.ts                         # Componente principal
│   ├── app.html                       # Template principal
│   ├── app.config.ts                  # Configuração
│   └── app.routes.ts                  # Rotas
├── styles.scss                        # Estilos globais
└── index.html                         # HTML raiz
```

## 🔧 Customização

### Alterar Cores do Tema

Edite `src/app/pdf-viewer/pdf-viewer.component.scss`:

```scss
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Ajustar Limites de Zoom

No arquivo `pdf-viewer.component.ts`, modifique:

```typescript
zoomIn() {
  this.scale.update(s => Math.min(s + 0.25, 3.0)); // Máximo 3.0x
}

zoomOut() {
  this.scale.update(s => Math.max(s - 0.25, 0.5)); // Mínimo 0.5x
}
```

## 📝 Notas

- O projeto usa standalone components do Angular 20
- PDF.js é carregado via CDN para melhor performance
- Todos os gestos touch são otimizados para dispositivos móveis

## 📄 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.

## Development server


To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
