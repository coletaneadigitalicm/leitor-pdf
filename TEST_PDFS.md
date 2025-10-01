# URLs de PDFs para Teste

Use estas URLs públicas para testar o leitor de PDF:

## PDFs Pequenos (< 1MB)

1. **Dummy PDF (W3C)**
   ```
   https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
   ```
   - Tamanho: ~13KB
   - Páginas: 1
   - Ideal para testes rápidos

2. **Sample PDF (AfricaU)**
   ```
   https://www.africau.edu/images/default/sample.pdf
   ```
   - Tamanho: ~3.2MB
   - Páginas: 1
   - Com imagens

## PDFs Médios (1-10MB)

3. **Lorem Ipsum PDF**
   ```
   http://www.pdf995.com/samples/pdf.pdf
   ```
   - Tamanho: ~9KB
   - Páginas: 1
   - Texto simples

## Como Usar no Leitor

1. Copie a URL desejada
2. Cole no campo "Digite a URL do PDF"
3. Clique em "Carregar da URL"
4. Aguarde o carregamento

## Observações

⚠️ **CORS**: Algumas URLs podem ter restrições CORS. Se encontrar erro, tente outra URL ou faça upload do arquivo localmente.

🔒 **HTTPS**: Em produção, prefira sempre URLs HTTPS para segurança.

📦 **Tamanho**: PDFs maiores demoram mais para carregar, especialmente em conexões lentas.

## Criando Seus Próprios PDFs de Teste

### Online (Gratuito)

1. **Google Docs**
   - Crie um documento
   - File → Download → PDF
   - Faça upload no Google Drive
   - Compartilhe como público
   - Use o link de visualização

2. **Canva**
   - Crie um design
   - Baixe como PDF
   - Hospede em seu servidor

3. **LibreOffice**
   - Crie um documento
   - File → Export as PDF
   - Faça upload para testar

## PDFs de Exemplo por Categoria

### Documentos Técnicos
- Relatórios
- Manuais
- Especificações

### Documentos Comerciais
- Contratos
- Propostas
- Apresentações

### Documentos Educacionais
- Apostilas
- Exercícios
- Provas

### Documentos com Imagens
- Portfolios
- Catálogos
- Revistas

## Testando Funcionalidades

### Teste de Navegação
Use PDFs com múltiplas páginas (10+) para testar:
- Navegação por botões
- Navegação por teclado
- Swipe em mobile

### Teste de Zoom
Use PDFs com texto pequeno ou detalhes para testar:
- Zoom in/out
- Qualidade da renderização
- Performance

### Teste de Upload
Use PDFs do seu computador para testar:
- Drag and drop
- Click to upload
- Validação de arquivo

## Recursos Úteis

### Geradores de PDF Online
- [PDF Generator](https://www.pdf-generator.com/)
- [Lorem Ipsum PDF](https://www.lorem-ipsum.info/)
- [Dummy PDF](https://dummypdf.com/)

### Hospedagem de PDFs
- Google Drive
- Dropbox
- GitHub (para projetos públicos)
- AWS S3
- Cloudinary

## Problemas Comuns

### Erro: "Failed to fetch"
- **Causa**: URL inválida ou servidor offline
- **Solução**: Verifique a URL e tente outra

### Erro: "CORS policy"
- **Causa**: Servidor não permite CORS
- **Solução**: Faça upload do arquivo localmente

### Erro: "Invalid PDF"
- **Causa**: Arquivo corrompido ou não é PDF
- **Solução**: Use outro arquivo válido

## Contribuindo

Conhece URLs públicas de PDFs que funcionam bem? 
Adicione-as a este arquivo via Pull Request!
