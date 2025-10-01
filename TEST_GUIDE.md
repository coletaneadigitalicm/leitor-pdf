# 🧪 Guia de Teste - Query Parameters

Este guia ajuda a testar a nova funcionalidade de query parameters.

## ✅ Checklist de Testes

### 1. Teste Básico
- [ ] Acesse: `http://localhost:4200/`
- [ ] Verifique se a página inicial carrega normalmente
- [ ] Não deve haver PDF carregado

### 2. Teste com Query Parameter Simples
- [ ] Acesse: `http://localhost:4200/?url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`
- [ ] O PDF deve carregar automaticamente
- [ ] Verifique se a página é exibida corretamente
- [ ] Teste a navegação e zoom

### 3. Teste com URL Codificada
- [ ] Acesse: `http://localhost:4200/?url=https%3A%2F%2Fwww.africau.edu%2Fimages%2Fdefault%2Fsample.pdf`
- [ ] O PDF deve carregar automaticamente
- [ ] Verifique se a decodificação funcionou

### 4. Teste de URL Inválida
- [ ] Acesse: `http://localhost:4200/?url=https://invalid-url.com/fake.pdf`
- [ ] Deve exibir mensagem de erro
- [ ] Não deve quebrar a aplicação

### 5. Teste sem Query Parameter
- [ ] Acesse: `http://localhost:4200/`
- [ ] Deve mostrar a tela de upload normal
- [ ] Sem erros no console

### 6. Teste com Multiple Parameters (futuro)
- [ ] Prepare para: `http://localhost:4200/?url=PDF_URL&page=5`
- [ ] Atualmente apenas `url` é suportado

## 🔍 Verificações no Console

Abra o DevTools (F12) e verifique:

### Console
Deve mostrar logs como:
```
[PDF Viewer] Query param detected: https://...
[PDF Viewer] Loading PDF from URL...
[PDF Viewer] PDF loaded successfully
```

### Network
- Verifique se a requisição ao PDF foi feita
- Status deve ser 200 OK
- Content-Type deve ser `application/pdf`

### Errors
- Não deve haver erros não tratados
- Erros esperados (URL inválida) devem mostrar mensagens amigáveis

## 📱 Teste em Diferentes Dispositivos

### Desktop
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari

### Mobile (Use DevTools ou dispositivo real)
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Firefox Mobile

## 🎯 Cenários de Uso Real

### Cenário 1: Link em Email
1. Abra `test-query-params.html` em um navegador
2. Gere um link usando o gerador
3. Copie e abra em nova aba
4. Verifique se funciona

### Cenário 2: QR Code
1. Use um gerador de QR Code online
2. Insira: `http://localhost:4200/?url=PDF_URL`
3. Escaneie com smartphone
4. Verifique se abre o PDF

### Cenário 3: Bookmark
1. Acesse um PDF via query param
2. Adicione aos favoritos
3. Abra o favorito
4. Deve carregar o mesmo PDF

## 🐛 Problemas Conhecidos e Soluções

### Problema: PDF não carrega
**Possíveis causas:**
- URL inválida
- Problema de CORS
- PDF corrompido

**Solução:**
1. Verifique o console para erros
2. Teste a URL diretamente no navegador
3. Use uma URL diferente

### Problema: URL não é decodificada
**Solução:**
- Já implementado: `decodeURIComponent(urlParam)`

### Problema: Delay no carregamento
**Solução:**
- Já implementado: `setTimeout` de 500ms para aguardar PDF.js

## 📊 Métricas de Performance

Use o DevTools Performance para medir:
- [ ] Tempo de carregamento inicial
- [ ] Tempo de carregamento do PDF
- [ ] Tempo de renderização da primeira página

### Benchmarks Esperados
- Carregamento inicial: < 2s
- Carregamento de PDF pequeno: < 3s
- Primeira renderização: < 1s

## 🔐 Testes de Segurança

### XSS Prevention
- [ ] Teste com URL maliciosa: `javascript:alert('XSS')`
- [ ] Deve ser rejeitada ou sanitizada

### URL Validation
- [ ] URL sem protocolo: `example.com/file.pdf`
- [ ] URL com protocolo inválido: `ftp://...`
- [ ] URL vazia: `?url=`
- [ ] URL com caracteres especiais

## 📝 Resultados Esperados

| Teste | Input | Resultado Esperado |
|-------|-------|-------------------|
| URL válida | `?url=https://valid.pdf` | PDF carrega |
| URL inválida | `?url=https://invalid` | Mensagem de erro |
| Sem query param | `/` | Tela de upload |
| URL codificada | `?url=https%3A%2F%2F...` | PDF carrega |
| URL vazia | `?url=` | Tela de upload |

## 🎉 Teste Manual Completo

### Passo a Passo
1. **Inicie o servidor**
   ```bash
   npm start
   ```

2. **Abra a página de teste**
   - Abra `test-query-params.html` em um navegador
   - Ou acesse via servidor local

3. **Teste cada link**
   - Clique em "PDF Simples"
   - Clique em "PDF com Imagens"
   - Use o gerador de links

4. **Teste o gerador**
   - Cole uma URL de PDF
   - Copie o link gerado
   - Abra em nova aba

5. **Verifique funcionalidades**
   - Navegação funciona?
   - Zoom funciona?
   - Botão "Carregar outro PDF" funciona?

## 📸 Screenshots de Teste

Capture screenshots de:
- [ ] Página inicial sem query param
- [ ] PDF carregado via query param
- [ ] Mensagem de erro (URL inválida)
- [ ] Funcionamento em mobile

## ✨ Casos de Sucesso

### ✅ Teste passou se:
- PDF carrega automaticamente ao acessar URL com `?url=`
- Não há erros no console
- Todas as funcionalidades funcionam normalmente
- Performance é aceitável
- Funciona em diferentes navegadores

### ❌ Teste falhou se:
- PDF não carrega
- Erros aparecem no console
- Aplicação quebra
- Performance é ruim
- Não funciona em algum navegador

## 🚀 Próximos Passos

Após validar todos os testes:
1. [ ] Documentar descobertas
2. [ ] Corrigir bugs encontrados
3. [ ] Otimizar performance se necessário
4. [ ] Adicionar testes automatizados
5. [ ] Preparar para deploy em produção

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador
2. Revise os logs do terminal
3. Consulte a documentação em `QUERY_PARAMS.md`
4. Abra uma issue no repositório
