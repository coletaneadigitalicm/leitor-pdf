# 📄 Abertura de PDF em Página Específica (#page=N)

## 🎯 Funcionalidade Implementada

Agora é possível **abrir PDFs diretamente em uma página específica** usando o hash `#page=N` na URL!

Funciona tanto para:
- ✅ **URL única**: `?url=PDF_URL#page=5`
- ✅ **Múltiplas URLs**: `?urls=PDF1#page=2,PDF2#page=10,PDF3#page=1`

---

## 🔧 Como Usar

### Sintaxe da URL:

```
http://localhost:4200/?url=SUA_URL_PDF#page=NUMERO_DA_PAGINA
```

### Exemplos:

#### 1️⃣ URL Única (página específica):
```
http://localhost:4200/?url=https://exemplo.com/documento.pdf#page=5
```
✅ Abre o PDF na **página 5**

#### 2️⃣ URL Única (sem página):
```
http://localhost:4200/?url=https://exemplo.com/documento.pdf
```
✅ Abre o PDF na **página 1** (padrão)

#### 3️⃣ Múltiplas URLs (páginas específicas):
```
http://localhost:4200/?urls=https://exemplo.com/doc1.pdf#page=3,https://exemplo.com/doc2.pdf#page=10,https://exemplo.com/doc3.pdf#page=1
```
✅ Abre cada PDF na página especificada

#### 4️⃣ Múltiplas URLs (misturadas):
```
http://localhost:4200/?urls=https://exemplo.com/doc1.pdf#page=5,https://exemplo.com/doc2.pdf,https://exemplo.com/doc3.pdf#page=15
```
✅ Doc1 na página 5, Doc2 na página 1, Doc3 na página 15

---

## 📋 Formato do Hash

### Sintaxe aceita:

| Formato | Exemplo | Resultado |
|---------|---------|-----------|
| `#page=N` | `#page=5` | Página 5 ✅ |
| `#PAGE=N` | `#PAGE=10` | Página 10 ✅ (case insensitive) |
| `#Page=N` | `#Page=3` | Página 3 ✅ |

### Validação automática:

- ✅ **Página válida** (1 a totalPages): Abre na página solicitada
- ❌ **Página < 1**: Ignora e abre na página 1
- ❌ **Página > totalPages**: Ignora e abre na página 1
- ❌ **Hash inválido**: Ignora e abre na página 1
- ❌ **Sem hash**: Abre na página 1 (comportamento padrão)

---

## 🔍 Comportamento Detalhado

### Ao Carregar PDF:

1. **Extrai o hash** da URL
2. **Procura por `page=N`** no hash (case insensitive)
3. **Valida o número** da página:
   - Se válido: Armazena em `doc.initialPage`
   - Se inválido: Define como `undefined`
4. **Remove o hash** da URL antes de carregar o PDF
5. **Carrega o PDF** normalmente
6. **Abre na página especificada** (ou página 1 se não especificado)

### Ao Trocar de Documento:

Quando você clica em outro chip:
- ✅ Se o documento tem `initialPage`: Abre nessa página
- ✅ Se não tem: Abre na página 1 (padrão)
- ✅ Zoom é mantido (persistência global)

---

## 💡 Casos de Uso

### Caso 1: Contrato Multi-página

```
Cenário: Enviar link direto para cláusula específica
URL: http://localhost:4200/?url=https://exemplo.com/contrato.pdf#page=15

Resultado:
✅ PDF abre diretamente na página 15
✅ Cliente vê a cláusula imediatamente
✅ Não precisa navegar manualmente
```

### Caso 2: Múltiplos Relatórios

```
Cenário: Revisar seções específicas de vários relatórios
URL: http://localhost:4200/?urls=relatorio-jan.pdf#page=5,relatorio-fev.pdf#page=8,relatorio-mar.pdf#page=3

Resultado:
✅ Janeiro abre na página 5 (resumo executivo)
✅ Fevereiro abre na página 8 (gráficos)
✅ Março abre na página 3 (análise)
✅ Navegação direta para conteúdo relevante
```

### Caso 3: Documentação Técnica

```
Cenário: Link para seção específica da documentação
URL: http://localhost:4200/?url=https://api.exemplo.com/docs.pdf#page=42

Resultado:
✅ Abre diretamente na página 42 (API Reference)
✅ Usuário não perde tempo procurando
✅ Experiência otimizada
```

### Caso 4: Apresentação com Slides

```
Cenário: Começar apresentação em slide específico
URL: http://localhost:4200/?url=https://drive.com/apresentacao.pdf#page=10

Resultado:
✅ Inicia no slide 10
✅ Economiza tempo em reuniões
✅ Foco no conteúdo relevante
```

---

## 🔧 Implementação Técnica

### Interface `PdfDocument`:

```typescript
interface PdfDocument {
  id: string;
  url: string;
  name: string;
  doc: any;
  totalPages: number;
  isLoaded: boolean;
  isLoading: boolean;
  error?: string;
  file?: File;
  initialPage?: number; // ← Nova propriedade
}
```

### Método `extractPageFromUrl()`:

```typescript
private extractPageFromUrl(url: string): number | undefined {
  try {
    const decodedUrl = decodeURIComponent(url);
    
    // Verifica se há hash na URL
    if (!decodedUrl.includes('#')) {
      return undefined;
    }

    // Extrai o hash
    const hash = decodedUrl.split('#')[1];
    
    // Procura por page=N no hash (case insensitive)
    const pageMatch = hash.match(/page=(\d+)/i);
    
    if (pageMatch && pageMatch[1]) {
      const pageNum = parseInt(pageMatch[1], 10);
      console.log(`[PDF Viewer] Found page number in URL: ${pageNum}`);
      return pageNum;
    }

    return undefined;
  } catch (error) {
    console.warn('[PDF Viewer] Error extracting page from URL:', error);
    return undefined;
  }
}
```

### Modificação em `loadMultiplePdfs()`:

```typescript
const docs: PdfDocument[] = urls.map((url, index) => {
  const initialPage = this.extractPageFromUrl(url);
  return {
    id: `pdf-${index}-${Date.now()}`,
    url: decodeURIComponent(url).split('#')[0], // Remove hash
    name: this.extractFileName(url, index),
    doc: null,
    totalPages: 0,
    isLoaded: false,
    isLoading: false,
    error: undefined,
    initialPage: initialPage // ← Armazena página inicial
  };
});
```

### Validação em `loadPdfDocument()`:

```typescript
// Usa a página inicial se especificada na URL, senão começa na página 1
const startPage = doc.initialPage && doc.initialPage > 0 && doc.initialPage <= pdfDoc.numPages 
  ? doc.initialPage 
  : 1;

if (startPage !== 1) {
  console.log(`[PDF Viewer] Opening PDF at page ${startPage} (from URL hash)`);
}

this.currentPage.set(startPage);
await this.renderPage(startPage);
```

### Validação em `switchToDocument()`:

```typescript
// Usa a página inicial se especificada na URL, senão volta para página 1
const startPage = doc.initialPage && doc.initialPage > 0 && doc.initialPage <= doc.totalPages
  ? doc.initialPage
  : 1;

this.currentPage.set(startPage);
this.renderPage(startPage);
```

---

## 🧪 Como Testar

### Teste 1: URL Única com Página

1. Abra o navegador
2. Cole a URL:
   ```
   http://localhost:4200/?url=SUA_URL_PDF#page=5
   ```
3. Verifique:
   - ✅ PDF carrega
   - ✅ Abre na página 5
   - ✅ Indicador mostra "5/N"
   - ✅ Console: `Opening PDF at page 5 (from URL hash)`

### Teste 2: Múltiplas URLs com Páginas

1. Cole a URL:
   ```
   http://localhost:4200/?urls=PDF1#page=3,PDF2#page=10,PDF3
   ```
2. Verifique:
   - ✅ PDF1 abre na página 3
   - ✅ Clica no chip 2 → Abre na página 10
   - ✅ Clica no chip 3 → Abre na página 1 (padrão)

### Teste 3: Validação de Página Inválida

1. Cole a URL com página maior que o total:
   ```
   http://localhost:4200/?url=PDF_URL#page=999
   ```
2. Verifique:
   - ✅ PDF carrega normalmente
   - ✅ Abre na página 1 (fallback)
   - ⚠️ Console: Sem mensagem de erro

### Teste 4: Hash sem page=

1. Cole a URL com hash diferente:
   ```
   http://localhost:4200/?url=PDF_URL#section=intro
   ```
2. Verifique:
   - ✅ PDF carrega
   - ✅ Abre na página 1 (ignora hash inválido)

### Teste 5: URL Encoded

1. Cole a URL com encoding:
   ```
   http://localhost:4200/?url=https%3A%2F%2Fexemplo.com%2Fdoc.pdf%23page%3D7
   ```
2. Verifique:
   - ✅ Decodifica corretamente
   - ✅ Extrai `page=7`
   - ✅ Abre na página 7

---

## 📊 Fluxo de Processamento

```
┌─────────────────────────────────────────────────────┐
│ URL: https://exemplo.com/doc.pdf#page=5            │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ 1. extractPageFromUrl(url)                         │
│    - Decodifica URL                                 │
│    - Verifica presença de '#'                       │
│    - Extrai hash: "page=5"                          │
│    - Match regex: /page=(\d+)/i                     │
│    - Retorna: 5                                     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ 2. Cria PdfDocument                                 │
│    {                                                │
│      url: "https://exemplo.com/doc.pdf",  ← Sem #  │
│      initialPage: 5,                      ← Página  │
│      ...                                            │
│    }                                                │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ 3. loadPdfDocument(index)                          │
│    - Carrega PDF normalmente                        │
│    - Obtém totalPages                               │
│    - Valida: initialPage <= totalPages?             │
│      ✅ Sim: startPage = 5                          │
│      ❌ Não: startPage = 1                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ 4. renderPage(startPage)                           │
│    - Renderiza página 5                             │
│    - Atualiza UI: "5/50"                            │
│    - Console: "Opening PDF at page 5"               │
└─────────────────────────────────────────────────────┘
```

---

## 🆚 Comparação: Antes vs Depois

| Aspecto | ❌ Antes | ✅ Depois |
|---------|---------|-----------|
| **Página inicial** | Sempre 1 | Especificável via hash |
| **URL única** | `?url=PDF` | `?url=PDF#page=N` |
| **Múltiplas URLs** | Todas na página 1 | Cada uma com sua página |
| **Casos de uso** | Limitado | Compartilhamento preciso |
| **Experiência** | Manual | Direta ao conteúdo |
| **Validação** | N/A | Automática |

---

## 🎯 Exemplos Práticos

### E-commerce (Catálogo):

```html
<!-- Produto específico no catálogo PDF -->
<a href="http://localhost:4200/?url=https://loja.com/catalogo-2025.pdf#page=42">
  Ver Produto X no Catálogo (Página 42)
</a>
```

### Educação (Apostila):

```html
<!-- Link para capítulo específico -->
<a href="http://localhost:4200/?url=https://escola.com/apostila-matematica.pdf#page=15">
  Capítulo 3: Trigonometria (Página 15)
</a>
```

### Jurídico (Processo):

```html
<!-- Links para peças do processo -->
<ul>
  <li><a href="?url=processo-123.pdf#page=1">Petição Inicial</a></li>
  <li><a href="?url=processo-123.pdf#page=50">Contestação</a></li>
  <li><a href="?url=processo-123.pdf#page=100">Sentença</a></li>
</ul>
```

### Imobiliário (Documentos):

```html
<!-- Vários contratos -->
<a href="?urls=contrato.pdf#page=5,escritura.pdf#page=8,certidoes.pdf#page=1">
  Ver Documentos do Imóvel
</a>
```

---

## 📝 Logs do Console

### Sucesso (página válida):

```
[PDF Viewer] Found page number in URL: 5
[PDF Viewer] Loading PDF 1/1: https://exemplo.com/doc.pdf
[PDF Viewer] Opening PDF at page 5 (from URL hash)
[PDF Viewer] PDF 1 loaded successfully: 50 pages
```

### Página padrão (sem hash):

```
[PDF Viewer] Loading PDF 1/1: https://exemplo.com/doc.pdf
[PDF Viewer] PDF 1 loaded successfully: 50 pages
```

### Múltiplos PDFs:

```
[PDF Viewer] Found page number in URL: 3
[PDF Viewer] Found page number in URL: 10
[PDF Viewer] Loading first PDF...
[PDF Viewer] Opening PDF at page 3 (from URL hash)
[PDF Viewer] PDF 1 loaded successfully: 20 pages
[PDF Viewer] Loading remaining PDFs in background...
```

---

## ⚠️ Tratamento de Erros

### Página maior que total:

```typescript
// URL: documento.pdf#page=999
// Documento tem 50 páginas

const startPage = 999 > 50 ? 1 : 999; // Fallback para 1
```

### Página negativa ou zero:

```typescript
// URL: documento.pdf#page=0
// ou documento.pdf#page=-5

const startPage = 0 > 0 ? 0 : 1; // Fallback para 1
```

### Hash inválido:

```typescript
// URL: documento.pdf#notapage
// Regex não encontra match

const pageMatch = null;
const initialPage = undefined; // Sem página inicial
const startPage = 1; // Usa padrão
```

### URL malformada:

```typescript
try {
  const pageNum = extractPageFromUrl(url);
} catch (error) {
  console.warn('Error extracting page from URL:', error);
  return undefined; // Fallback seguro
}
```

---

## ✅ Status

✅ **Implementado**: Hash `#page=N` funcional  
✅ **URL única**: Suporte completo  
✅ **Múltiplas URLs**: Suporte completo  
✅ **Validação**: Automática e segura  
✅ **Fallback**: Página 1 se inválido  
✅ **Case insensitive**: `#page`, `#PAGE`, `#Page`  
✅ **Console logs**: Informativos  
✅ **Compatibilidade**: Com todas as features existentes  
✅ **Performance**: Zero impacto  
✅ **Pronto para usar**: SIM! 📄

---

**Implementado em:** 30/09/2025  
**Solicitado por:** Usuário  
**Funcionalidade:** Abertura em página específica via hash  
**Benefício:** Compartilhamento preciso de conteúdo! 🎯
