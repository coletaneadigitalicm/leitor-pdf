# 🚀 Deploy no GitHub Pages - Guia Completo

## ✅ Status do Deploy

O código foi enviado com sucesso para a branch `gh-pages`! 🎉

---

## 📋 Configuração Necessária no GitHub

### Passo 1: Ativar GitHub Pages no Repositório

1. **Acesse o repositório no GitHub**:
   ```
   https://github.com/coletaneadigitalicm/leitor-pdf
   ```

2. **Vá em Settings** (⚙️ Configurações):
   - Clique na aba **"Settings"** no topo do repositório

3. **Configure GitHub Pages**:
   - No menu lateral esquerdo, procure por **"Pages"**
   - Em **"Source"** (Origem):
     - Selecione: **"Deploy from a branch"**
   - Em **"Branch"**:
     - Selecione: **`gh-pages`** (não `main`)
     - Pasta: **`/ (root)`**
   - Clique em **"Save"** (Salvar)

4. **Aguarde o deploy**:
   - GitHub vai processar os arquivos (1-2 minutos)
   - Uma mensagem verde aparecerá: **"Your site is live at..."**

---

## 🌐 URLs do Site

Após a configuração, o site estará disponível em:

### URL Principal:
```
https://coletaneadigitalicm.github.io/leitor-pdf/
```

**⚠️ IMPORTANTE**: Sempre use a **barra final** (`/`) no final da URL!

---

## 🔍 Como Verificar se Funcionou

### 1. Verifique a Branch `gh-pages`:

```
https://github.com/coletaneadigitalicm/leitor-pdf/tree/gh-pages
```

Deve conter:
- ✅ `index.html`
- ✅ `404.html`
- ✅ `.nojekyll`
- ✅ Pasta com arquivos JS/CSS

### 2. Verifique o Status do Deploy:

1. Vá em **Actions** no repositório
2. Verifique se há um workflow **"pages build and deployment"**
3. Status deve estar: ✅ **Success** (verde)

### 3. Teste a URL:

```
https://coletaneadigitalicm.github.io/leitor-pdf/
```

---

## 🛠️ Scripts Configurados

### Build de Produção:
```bash
npm run build:prod
```
- Compila o projeto para produção
- Configura `base-href` para `/leitor-pdf/`

### Deploy Completo:
```bash
npm run deploy
```
- Faz build de produção
- Envia para branch `gh-pages`
- Cria `404.html` e `.nojekyll` automaticamente

---

## 📁 Estrutura Após Deploy

### Branch `main`:
```
src/
dist/
package.json
angular.json
...
```

### Branch `gh-pages`:
```
index.html           ← Página principal
404.html             ← Página de erro (redirecionamento)
.nojekyll            ← Desabilita Jekyll
chunk-*.js           ← JavaScript compilado
styles-*.css         ← CSS compilado
...
```

---

## ❓ Problemas Comuns

### 1. Erro 404 ao Acessar

**Causa**: GitHub Pages não está configurado ou branch errada

**Solução**:
1. Vá em **Settings → Pages**
2. Confirme que está usando a branch **`gh-pages`**
3. Aguarde 1-2 minutos após salvar

### 2. Página em Branco

**Causa**: `base-href` incorreto

**Solução**:
- Já está configurado corretamente: `/leitor-pdf/`
- Rode novamente: `npm run deploy`

### 3. Assets Não Carregam (CSS/JS)

**Causa**: Caminhos relativos incorretos

**Solução**:
- O `base-href` corrige isso automaticamente
- Certifique-se de usar: `npm run deploy` (não `npm run build`)

### 4. Rotas do Angular Não Funcionam

**Causa**: GitHub Pages não redireciona automaticamente

**Solução**:
- O `404.html` já está configurado para redirecionar
- Funciona automaticamente após deploy

---

## 🔄 Como Atualizar o Site

### Sempre que fizer mudanças:

```bash
# 1. Commit suas mudanças
git add .
git commit -m "Suas alterações"
git push origin main

# 2. Deploy para GitHub Pages
npm run deploy
```

**⚠️ Não é necessário** fazer push manual da branch `gh-pages`!  
O comando `npm run deploy` faz tudo automaticamente.

---

## 🎯 Casos de Uso

### Exemplo 1: Abrir PDF via URL

```
https://coletaneadigitalicm.github.io/leitor-pdf/?url=https://exemplo.com/documento.pdf
```

### Exemplo 2: Abrir PDF em Página Específica

```
https://coletaneadigitalicm.github.io/leitor-pdf/?url=https://exemplo.com/doc.pdf#page=5
```

### Exemplo 3: Múltiplos PDFs

```
https://coletaneadigitalicm.github.io/leitor-pdf/?urls=URL1,URL2,URL3
```

---

## 📊 Status do Projeto

### ✅ Configurado:
- [x] Build de produção
- [x] Base href correto (`/leitor-pdf/`)
- [x] Script de deploy automatizado
- [x] Arquivo 404.html (redirecionamento)
- [x] .nojekyll (desabilita Jekyll)
- [x] Branch gh-pages criada

### ⏳ Pendente (VOCÊ deve fazer):
- [ ] Ativar GitHub Pages nas configurações do repositório
- [ ] Selecionar branch `gh-pages` como origem
- [ ] Aguardar deploy do GitHub (1-2 minutos)

---

## 🎨 Customização de Domínio (Opcional)

Se quiser usar um domínio próprio:

1. **Nas configurações do GitHub Pages**:
   - Em "Custom domain", adicione: `seudominio.com`

2. **No DNS do seu domínio**:
   - Adicione um registro CNAME apontando para:
     ```
     coletaneadigitalicm.github.io
     ```

3. **Atualize o base-href**:
   ```json
   // package.json
   "deploy": "ng build --configuration production --base-href / && npx angular-cli-ghpages --dir=dist/pdf-reader/browser"
   ```

---

## 🔐 Configurações de Segurança

### HTTPS

✅ GitHub Pages usa HTTPS automaticamente:
```
https://coletaneadigitalicm.github.io/leitor-pdf/
```

### CORS

Se carregar PDFs de outros domínios, certifique-se que:
- O servidor permite CORS
- Headers corretos: `Access-Control-Allow-Origin`

---

## 🧪 Teste Local Antes do Deploy

### Simular ambiente de produção:

```bash
# 1. Build de produção
npm run build:prod

# 2. Instalar servidor local
npm install -g http-server

# 3. Servir a pasta dist
cd dist/pdf-reader/browser
http-server -p 8080 -o

# 4. Testar em:
http://localhost:8080/leitor-pdf/
```

---

## 📝 Checklist de Deploy

### Antes do Deploy:
- [ ] Código commitado e sem erros
- [ ] Testado localmente (`npm start`)
- [ ] Build de produção funcionando (`npm run build:prod`)

### Durante o Deploy:
```bash
npm run deploy
```

### Após o Deploy:
- [ ] Configurar GitHub Pages (Settings → Pages → gh-pages)
- [ ] Aguardar 1-2 minutos
- [ ] Testar URL: `https://coletaneadigitalicm.github.io/leitor-pdf/`
- [ ] Testar funcionalidades principais
- [ ] Verificar console do navegador (F12)

---

## 🎉 Pronto!

Após seguir os passos acima, seu **Leitor de PDF** estará disponível publicamente em:

```
🌐 https://coletaneadigitalicm.github.io/leitor-pdf/
```

### Próximos Passos:

1. ✅ Vá nas **Settings → Pages** do repositório
2. ✅ Selecione a branch **`gh-pages`**
3. ✅ Aguarde o deploy (1-2 min)
4. ✅ Acesse a URL e teste!

---

**Criado em:** 30/09/2025  
**Repositório:** https://github.com/coletaneadigitalicm/leitor-pdf  
**Tecnologia:** Angular 20 + GitHub Pages + angular-cli-ghpages
