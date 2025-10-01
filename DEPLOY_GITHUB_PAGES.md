# 🚀 Deploy para GitHub Pages

## 📋 Problema Resolvido

### ❌ Erro Original:
```
Cannot read the output path (architect.build.options.outputPath) 
of the Angular project "pdf-reader" in angular.json
```

### ✅ Solução:
Adicionado `outputPath` no `angular.json` para compatibilidade com `angular-cli-ghpages`.

---

## 🔧 Configurações Aplicadas

### 1. `angular.json`

Adicionado `outputPath` nas opções do build:

```json
{
  "architect": {
    "build": {
      "builder": "@angular/build:application",
      "options": {
        "outputPath": "dist/pdf-reader",  // ← ADICIONADO
        "browser": "src/main.ts",
        // ... resto das opções
      }
    }
  }
}
```

### 2. `package.json`

Adicionados scripts de deploy:

```json
{
  "scripts": {
    "build:prod": "ng build --configuration production --base-href /leitor-pdf/",
    "deploy": "ng build --configuration production --base-href /leitor-pdf/ && npx angular-cli-ghpages --dir=dist/pdf-reader/browser"
  }
}
```

---

## 🎯 Como Fazer Deploy

### Passo 1: Build de Produção
```bash
npm run build:prod
```

### Passo 2: Deploy para GitHub Pages
```bash
npm run deploy
```

**OU em um único comando:**
```bash
npm run deploy
```

---

## 📁 Estrutura de Build

Após o build, os arquivos estarão em:

```
dist/
└── pdf-reader/
    └── browser/
        ├── index.html
        ├── main-[hash].js
        ├── polyfills-[hash].js
        └── styles-[hash].css
```

O `angular-cli-ghpages` pega os arquivos de `dist/pdf-reader/browser` e faz o deploy.

---

## 🌐 URL do Projeto

Após o deploy, o projeto estará disponível em:

```
https://coletaneadigitalicm.github.io/leitor-pdf/
```

---

## ⚙️ Detalhes Técnicos

### `--base-href /leitor-pdf/`

É necessário porque o GitHub Pages hospeda em um subdiretório:
- ❌ Sem base-href: `https://usuario.github.io/main.js` (404)
- ✅ Com base-href: `https://usuario.github.io/leitor-pdf/main.js` (200)

### `--dir=dist/pdf-reader/browser`

Angular 17+ usa o novo builder `@angular/build:application` que gera os arquivos em:
- `dist/pdf-reader/browser/` (arquivos do navegador)
- `dist/pdf-reader/server/` (SSR, se houver)

O `angular-cli-ghpages` precisa apontar para o diretório `browser`.

---

## 🔐 Configuração do GitHub

### 1. Habilitar GitHub Pages

No repositório do GitHub:

1. Vá em **Settings** → **Pages**
2. Em **Source**, selecione: `gh-pages branch`
3. Salve

### 2. Token de Acesso (se necessário)

Se o deploy pedir autenticação:

```bash
# Opção 1: Usar token do GitHub
npx angular-cli-ghpages --dir=dist/pdf-reader/browser --token=SEU_GITHUB_TOKEN

# Opção 2: Adicionar ao .env (não commitar!)
GH_TOKEN=seu_token_aqui
```

---

## 🧪 Testar Localmente (Simulando GitHub Pages)

### Instalar servidor HTTP:
```bash
npm install -g http-server
```

### Build e testar:
```bash
npm run build:prod
cd dist/pdf-reader/browser
http-server -p 8080
```

Abra: `http://localhost:8080/`

---

## 📝 Checklist de Deploy

- ✅ `outputPath` configurado no `angular.json`
- ✅ `--base-href /leitor-pdf/` configurado
- ✅ `--dir=dist/pdf-reader/browser` configurado
- ✅ GitHub Pages habilitado no repositório
- ✅ Branch `gh-pages` será criada automaticamente
- ✅ Scripts `build:prod` e `deploy` adicionados

---

## 🐛 Troubleshooting

### Erro: "Cannot read the output path"
✅ **Resolvido!** Adicionamos `outputPath: "dist/pdf-reader"` no `angular.json`.

### Erro: "404 - Page not found"
🔧 **Solução:** Verifique o `--base-href`:
```bash
# Deve corresponder ao nome do repositório
--base-href /leitor-pdf/
```

### Erro: "Failed to load resource: 404" (assets)
🔧 **Solução:** Assets devem estar em `public/`:
```
public/
├── favicon.ico
└── (outros arquivos)
```

### Erro: "Permission denied" no deploy
🔧 **Solução:** Configure token do GitHub:
```bash
npm run deploy -- --token=SEU_GITHUB_TOKEN
```

### PDF não carrega (CORS)
⚠️ **Atenção:** GitHub Pages serve arquivos estáticos. URLs de PDFs externos precisam ter CORS habilitado.

**Solução:**
```typescript
// Use URLs de PDFs com CORS permitido
// OU faça upload dos PDFs para o repositório
```

---

## 🎨 Customizar Branch de Deploy

Por padrão, usa `gh-pages`. Para mudar:

```bash
npx angular-cli-ghpages --dir=dist/pdf-reader/browser --branch=main
```

---

## 📊 Fluxo Completo

```
1. Desenvolver
   ↓
2. npm run build:prod
   ↓
3. Gera dist/pdf-reader/browser/
   ↓
4. npm run deploy
   ↓
5. angular-cli-ghpages cria/atualiza branch gh-pages
   ↓
6. GitHub Pages atualiza automaticamente
   ↓
7. Acesse: https://coletaneadigitalicm.github.io/leitor-pdf/
```

---

## 🔄 CI/CD (Opcional)

### GitHub Actions

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build:prod
        
      - name: Deploy
        run: |
          npx angular-cli-ghpages --dir=dist/pdf-reader/browser --token=${{ secrets.GITHUB_TOKEN }}
```

---

## 📱 Funcionalidades Suportadas no Deploy

Todas as funcionalidades implementadas funcionam no GitHub Pages:

- ✅ **Upload de PDFs** (único e múltiplo)
- ✅ **Carregar via URL** (com CORS)
- ✅ **Query Params**: `?url=PDF_URL` ou `?urls=URL1,URL2`
- ✅ **Hash de Página**: `#page=5`
- ✅ **Zoom persistente**
- ✅ **Instruções animadas** (3s)
- ✅ **Navegação com teclado** (setas)
- ✅ **Swipe gestures** (mobile)
- ✅ **Carousel de múltiplos PDFs**
- ✅ **Responsivo** (desktop + mobile)

---

## 🎯 Comandos Rápidos

```bash
# Build local de desenvolvimento
npm start

# Build de produção (testa localmente)
npm run build:prod

# Deploy para GitHub Pages
npm run deploy

# Deploy com token específico
npm run deploy -- --token=SEU_TOKEN

# Limpar dist antes de build
rm -rf dist && npm run build:prod
```

---

## ✅ Status

✅ **Configuração**: Completa  
✅ **Scripts**: Adicionados  
✅ **Build**: Funcionando  
✅ **Deploy**: Pronto para usar  
✅ **URL**: `https://coletaneadigitalicm.github.io/leitor-pdf/`

---

## 🚀 Pronto para Deploy!

Execute agora:

```bash
npm run deploy
```

E seu projeto estará disponível no GitHub Pages! 🎉

---

**Configurado em:** 30/09/2025  
**Ferramenta:** angular-cli-ghpages@2.0.3  
**Angular:** 20.3.0  
**Compatibilidade:** Angular 17+ (novo builder)
