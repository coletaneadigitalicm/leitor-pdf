# 📚 Múltiplos PDFs - Funcionalidade de Carrossel

## 🎯 O que foi implementado

Sistema completo para visualizar múltiplos PDFs com carrossel de abas, carregamento inteligente e interface responsiva!

## 🚀 Como Usar

### Método 1: Query Parameter `urls` (Múltiplos PDFs)

Passe múltiplas URLs separadas por **vírgula** ou **pipe** (`|`):

#### Com Vírgula:
```
http://localhost:4200/?urls=URL1,URL2,URL3
```

#### Com Pipe:
```
http://localhost:4200/?urls=URL1|URL2|URL3
```

### Exemplo Completo:

```
http://localhost:4200/?urls=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf,https://www.africau.edu/images/default/sample.pdf
```

## ✨ Funcionalidades

### 1. Carregamento Inteligente
- ✅ **Primeiro PDF carrega imediatamente** para exibição rápida
- ✅ **PDFs restantes carregam em paralelo** em background
- ✅ **Indicador de carregamento** em cada aba
- ✅ **Tratamento de erros** individual por PDF

### 2. Carrossel de Abas
- ✅ **Scroll horizontal** suave
- ✅ **Chip largo** para boa usabilidade
- ✅ **Indicador de aba ativa** com gradiente
- ✅ **Número do documento** em cada aba
- ✅ **Nome extraído da URL** automaticamente
- ✅ **Contador de páginas** exibido
- ✅ **100% responsivo** (mobile, tablet, desktop)

### 3. Interface Visual
- ✅ **Aba ativa** - Gradiente roxo com destaque
- ✅ **Aba inativa** - Fundo cinza claro
- ✅ **Hover effect** - Animação suave
- ✅ **Loading spinner** - Indicador animado
- ✅ **Ícone de erro** - Alerta visual (⚠️)
- ✅ **Scrollbar customizado** - Design moderno

### 4. Responsividade
- ✅ **Desktop** - Abas com largura 140-280px
- ✅ **Tablet** - Abas com largura 120-200px
- ✅ **Mobile** - Abas com largura 110-160px
- ✅ **Scroll horizontal** funciona em todos os dispositivos
- ✅ **Touch-friendly** em dispositivos móveis

## 📋 Estrutura das Abas

Cada aba exibe:
1. **Número do documento** (1, 2, 3...)
2. **Nome do PDF** (extraído da URL ou "Documento X")
3. **Status:**
   - Spinner de carregamento (enquanto carrega)
   - Contador de páginas (após carregar)
   - Ícone de erro (se falhar)

## 💻 Exemplos Práticos

### Exemplo 1: Dois PDFs
```
http://localhost:4200/?urls=https://url1.pdf,https://url2.pdf
```

### Exemplo 2: Três PDFs com Pipe
```
http://localhost:4200/?urls=https://url1.pdf|https://url2.pdf|https://url3.pdf
```

### Exemplo 3: URLs Encoded
```javascript
const urls = [
  'https://example.com/doc1.pdf',
  'https://example.com/doc2.pdf',
  'https://example.com/doc3.pdf'
];

const urlsString = urls.map(u => encodeURIComponent(u)).join(',');
const link = `http://localhost:4200/?urls=${encodeURIComponent(urlsString)}`;
```

### Exemplo 4: JavaScript Helper
```javascript
function generateMultiplePdfLink(pdfUrls) {
  const baseUrl = 'http://localhost:4200';
  const urlsParam = pdfUrls.join(',');
  return `${baseUrl}/?urls=${encodeURIComponent(urlsParam)}`;
}

// Uso
const link = generateMultiplePdfLink([
  'https://example.com/manual.pdf',
  'https://example.com/tutorial.pdf',
  'https://example.com/guide.pdf'
]);
```

## 🎨 Comportamento Visual

### Aba Ativa
```
┌─────────────────────────────────────┐
│ ● 1  Manual de Usuário  [15p]      │  ← Gradiente roxo
└─────────────────────────────────────┘
```

### Aba Carregando
```
┌─────────────────────────────────────┐
│ ● 2  Tutorial  ⟳                   │  ← Spinner animado
└─────────────────────────────────────┘
```

### Aba com Erro
```
┌─────────────────────────────────────┐
│ ● 3  Guia  ⚠️                       │  ← Borda vermelha
└─────────────────────────────────────┘
```

### Aba Normal
```
┌─────────────────────────────────────┐
│ ● 4  Catálogo  [42p]               │  ← Fundo cinza
└─────────────────────────────────────┘
```

## 🔍 Logs no Console

Ao carregar múltiplos PDFs, você verá:
```
[PDF Viewer] Multiple URLs detected: 3
[PDF Viewer] Loading first PDF...
[PDF Viewer] Loading PDF 1/3: https://...
[PDF Viewer] PDF 1 loaded successfully: 10 pages
[PDF Viewer] Loading remaining PDFs in background...
[PDF Viewer] Loading PDF 2/3: https://...
[PDF Viewer] Loading PDF 3/3: https://...
[PDF Viewer] PDF 2 loaded successfully: 15 pages
[PDF Viewer] PDF 3 loaded successfully: 8 pages
[PDF Viewer] All PDFs loaded
```

## 🎯 Casos de Uso

### 1. Sistema de Documentação
Carregar múltiplos manuais de uma vez:
```
/documentos?urls=manual.pdf,tutorial.pdf,faq.pdf
```

### 2. Processo de Onboarding
Múltiplos documentos para novos funcionários:
```
/onboarding?urls=contrato.pdf,politicas.pdf,beneficios.pdf
```

### 3. Conjunto de Relatórios
Visualizar vários relatórios juntos:
```
/relatorios?urls=q1.pdf,q2.pdf,q3.pdf,q4.pdf
```

### 4. Material Didático
Aulas e apostilas em sequência:
```
/curso?urls=aula1.pdf,aula2.pdf,aula3.pdf,exercicios.pdf
```

### 5. Proposta Comercial
Proposta + anexos:
```
/proposta?urls=proposta.pdf,contrato.pdf,termos.pdf
```

## 🔄 Troca Entre Documentos

### Via Interface
- Clique em qualquer aba do carrossel
- A aba ativa muda automaticamente
- O PDF correspondente é exibido
- Página volta para 1
- Zoom reseta para 100%

### Comportamento
1. Usuário clica na aba
2. Sistema verifica se o PDF já está carregado
3. Se sim: Exibe imediatamente
4. Se não: Carrega o PDF primeiro, depois exibe

## 📱 Responsividade Detalhada

### Desktop (> 768px)
```scss
.tab-chip {
  min-width: 140px;
  max-width: 280px;
  padding: 0.625rem 1rem;
  font-size: 0.9rem;
}
```

### Tablet (480px - 768px)
```scss
.tab-chip {
  min-width: 120px;
  max-width: 200px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
}
```

### Mobile (< 480px)
```scss
.tab-chip {
  min-width: 110px;
  max-width: 160px;
  padding: 0.45rem 0.65rem;
  font-size: 0.8rem;
}
```

## 🎨 Customização

### Alterar Cores do Carrossel
```scss
// src/app/pdf-viewer/pdf-viewer.component.scss

.tab-chip.active {
  background: linear-gradient(135deg, #sua-cor-1 0%, #sua-cor-2 100%);
}
```

### Alterar Tamanho dos Chips
```scss
.tab-chip {
  min-width: 200px;  // Aumentar largura mínima
  max-width: 400px;  // Aumentar largura máxima
}
```

### Alterar Separador
No TypeScript, troque a regex:
```typescript
const urls = urlsParam.split(/[,|;]/) // Adiciona ponto-e-vírgula
```

## 🧪 Como Testar

### Teste 1: Dois PDFs
```
http://localhost:4200/?urls=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf,https://www.africau.edu/images/default/sample.pdf
```

### Teste 2: Abrir e alternar
1. Acesse o link acima
2. Aguarde o primeiro PDF carregar
3. Observe as outras abas carregando em background
4. Clique na segunda aba
5. O segundo PDF deve aparecer instantaneamente

### Teste 3: Responsividade
1. Abra o DevTools (F12)
2. Ative o modo mobile
3. Veja o carrossel se adaptar
4. Teste o scroll horizontal com touch

## 🔧 Parâmetros Técnicos

### Interface PdfDocument
```typescript
interface PdfDocument {
  id: string;           // ID único
  url: string;          // URL do PDF
  name: string;         // Nome extraído
  doc: any;             // Documento PDF.js
  totalPages: number;   // Total de páginas
  isLoaded: boolean;    // Já carregou?
  isLoading: boolean;   // Está carregando?
  error?: string;       // Mensagem de erro
}
```

### Signals Reativos
```typescript
pdfDocuments = signal<PdfDocument[]>([]);
activeDocumentIndex = signal(0);
activeDocument = computed(() => ...);
hasMultipleDocs = computed(() => ...);
```

## 🎊 Features Futuras (Sugestões)

### 1. Reordenar Abas
Arrastar e soltar para reorganizar

### 2. Fechar Abas
Botão X em cada aba para remover

### 3. Adicionar PDF
Botão + para adicionar mais PDFs

### 4. Download em Lote
Baixar todos os PDFs de uma vez

### 5. Comparação
Ver dois PDFs lado a lado

### 6. Favoritar
Marcar PDFs importantes

## 📊 Performance

### Otimizações Implementadas
- ✅ Carregamento assíncrono em paralelo
- ✅ Renderização sob demanda
- ✅ Apenas o PDF ativo é exibido
- ✅ PDFs inativos ficam em memória
- ✅ Scroll horizontal otimizado com CSS

### Benchmarks Esperados
- Primeiro PDF: < 2s
- Troca entre PDFs: < 100ms (já carregados)
- Scroll do carrossel: 60 FPS
- Memória: ~10-50MB por PDF

## 🎉 Está Pronto!

A funcionalidade está 100% implementada e pronta para uso!

**Teste agora mesmo:**
```
http://localhost:4200/?urls=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf,https://www.africau.edu/images/default/sample.pdf
```

Aproveite! 🚀
