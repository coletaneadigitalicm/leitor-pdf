# Exemplos de URLs com Query Parameters

Este documento contém exemplos práticos de como usar o leitor de PDF com query parameters para abrir PDFs automaticamente.

## 🔗 Como Funciona

Adicione o parâmetro `url` na query string da aplicação:

```
http://localhost:4200/?url=URL_DO_PDF
```

O PDF será carregado automaticamente ao acessar o link!

## 📝 Exemplos Práticos

### Exemplo 1 - PDF Simples (W3C)
```
http://localhost:4200/?url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
```

### Exemplo 2 - PDF com Imagens
```
http://localhost:4200/?url=https://www.africau.edu/images/default/sample.pdf
```

### Exemplo 3 - URL Codificada
Se a URL do PDF contém caracteres especiais, use encodeURIComponent:

```javascript
const pdfUrl = "https://example.com/documents/my file.pdf";
const encodedUrl = encodeURIComponent(pdfUrl);
const finalUrl = `http://localhost:4200/?url=${encodedUrl}`;
// Resultado: http://localhost:4200/?url=https%3A%2F%2Fexample.com%2Fdocuments%2Fmy%20file.pdf
```

## 💻 Gerando Links Programaticamente

### JavaScript/TypeScript
```typescript
function generatePdfViewerLink(pdfUrl: string): string {
  const baseUrl = 'http://localhost:4200';
  const encodedPdfUrl = encodeURIComponent(pdfUrl);
  return `${baseUrl}/?url=${encodedPdfUrl}`;
}

// Uso
const link = generatePdfViewerLink('https://example.com/document.pdf');
console.log(link);
// http://localhost:4200/?url=https%3A%2F%2Fexample.com%2Fdocument.pdf
```

### Python
```python
from urllib.parse import urlencode

def generate_pdf_viewer_link(pdf_url):
    base_url = 'http://localhost:4200'
    params = {'url': pdf_url}
    return f"{base_url}/?{urlencode(params)}"

# Uso
link = generate_pdf_viewer_link('https://example.com/document.pdf')
print(link)
# http://localhost:4200/?url=https%3A%2F%2Fexample.com%2Fdocument.pdf
```

### PHP
```php
<?php
function generatePdfViewerLink($pdfUrl) {
    $baseUrl = 'http://localhost:4200';
    $encodedUrl = urlencode($pdfUrl);
    return "$baseUrl/?url=$encodedUrl";
}

// Uso
$link = generatePdfViewerLink('https://example.com/document.pdf');
echo $link;
// http://localhost:4200/?url=https%3A%2F%2Fexample.com%2Fdocument.pdf
?>
```

## 🌐 Casos de Uso

### 1. Sistema de Documentação
Compartilhe links diretos para manuais e documentos:
```html
<a href="http://localhost:4200/?url=https://docs.example.com/manual.pdf">
  Ver Manual de Usuário
</a>
```

### 2. Email Marketing
Inclua links para visualizar PDFs diretamente:
```html
<a href="http://localhost:4200/?url=https://cdn.example.com/catalog-2025.pdf">
  📄 Ver Catálogo 2025
</a>
```

### 3. Sistema de Gestão de Documentos
```typescript
class DocumentManager {
  getViewerUrl(documentId: string): string {
    const pdfUrl = `https://api.example.com/documents/${documentId}/download`;
    return `http://localhost:4200/?url=${encodeURIComponent(pdfUrl)}`;
  }
}
```

### 4. Integração com CMS
```javascript
// WordPress, Drupal, etc.
function getDocumentViewerLink(attachmentUrl) {
  return `http://localhost:4200/?url=${encodeURIComponent(attachmentUrl)}`;
}
```

## 🔐 Considerações de Segurança

### CORS
O servidor que hospeda o PDF deve permitir CORS:
```
Access-Control-Allow-Origin: *
```

### HTTPS
Em produção, use sempre HTTPS:
```
https://seu-dominio.com/?url=https://docs.example.com/file.pdf
```

### Validação de URL
O componente aceita apenas URLs válidas. URLs malformadas serão rejeitadas.

## 🎯 Em Produção

Quando deployar para produção, substitua `localhost:4200` pela URL real:

### Netlify
```
https://seu-app.netlify.app/?url=URL_DO_PDF
```

### Vercel
```
https://seu-app.vercel.app/?url=URL_DO_PDF
```

### GitHub Pages
```
https://usuario.github.io/leitor-pdf/?url=URL_DO_PDF
```

### Domínio Customizado
```
https://leitor.seudominio.com/?url=URL_DO_PDF
```

## 📱 Compartilhamento em Redes Sociais

### WhatsApp
```
https://wa.me/?text=Confira%20este%20documento:%20http://localhost:4200/?url=URL_DO_PDF
```

### Telegram
```
https://t.me/share/url?url=http://localhost:4200/?url=URL_DO_PDF
```

### Email
```html
mailto:?subject=Documento%20PDF&body=Veja%20o%20documento:%20http://localhost:4200/?url=URL_DO_PDF
```

## 🧪 Testando

### Teste Local
1. Inicie o servidor: `npm start`
2. Acesse: `http://localhost:4200/?url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`
3. O PDF deve carregar automaticamente

### Debug
Abra o console do navegador (F12) para ver logs de carregamento:
- "Carregando PDF da URL..."
- "PDF carregado com sucesso"
- Ou mensagens de erro se houver problemas

## 📊 Analytics

Rastreie PDFs visualizados:
```typescript
// No componente
this.route.queryParams.subscribe(params => {
  const urlParam = params['url'];
  if (urlParam) {
    // Envie para seu sistema de analytics
    analytics.track('pdf_viewed', { url: urlParam });
  }
});
```

## 🔄 Redirecionamento

Crie URLs curtas que redirecionam para o leitor:
```javascript
// Servidor Node.js
app.get('/doc/:id', (req, res) => {
  const documentUrl = getDocumentUrl(req.params.id);
  const viewerUrl = `https://leitor.example.com/?url=${encodeURIComponent(documentUrl)}`;
  res.redirect(viewerUrl);
});
```

## 🎨 Customização Adicional

Você pode adicionar mais parâmetros no futuro:
```
http://localhost:4200/?url=PDF_URL&page=5&zoom=150
```

Basta expandir a lógica no `checkUrlParameter()` do componente!

## 📚 Referências

- [encodeURIComponent - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
- [Angular Router Query Params](https://angular.dev/guide/router#query-parameters)
- [URL API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/URL)
