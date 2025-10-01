# ⚠️ AÇÃO NECESSÁRIA: Ativar GitHub Pages

## 🎯 O que você precisa fazer AGORA:

### 1️⃣ Acesse o Repositório
```
https://github.com/coletaneadigitalicm/leitor-pdf
```

### 2️⃣ Clique em "Settings" (⚙️)
No topo da página do repositório

### 3️⃣ Clique em "Pages" no Menu Lateral
Procure no menu à esquerda

### 4️⃣ Configure a Source (Origem)

**Em "Build and deployment":**

📌 **Source:** Deploy from a branch

📌 **Branch:** 
- Selecione: `gh-pages` 
- Pasta: `/ (root)`

📌 Clique em **"Save"**

### 5️⃣ Aguarde 1-2 Minutos

GitHub vai processar e fazer deploy automaticamente.

### 6️⃣ Acesse o Site

```
https://coletaneadigitalicm.github.io/leitor-pdf/
```

---

## ✅ Como Saber se Funcionou?

### Opção 1: Mensagem Verde no GitHub Pages
Na mesma página de Settings → Pages, você verá:

```
✅ Your site is live at https://coletaneadigitalicm.github.io/leitor-pdf/
```

### Opção 2: Verificar Actions
1. Vá na aba **"Actions"** do repositório
2. Procure por **"pages build and deployment"**
3. Status deve estar: ✅ **verde** (sucesso)

---

## 🚨 Está Dando Erro 404?

### Causas Comuns:

1. **GitHub Pages não foi ativado**
   - Solução: Siga os passos acima

2. **Branch errada selecionada**
   - Deve ser: `gh-pages` (não `main`)
   - Solução: Mude em Settings → Pages → Branch

3. **Deploy ainda está processando**
   - Solução: Aguarde 1-2 minutos

4. **Esqueceu a barra final na URL**
   - ❌ Errado: `https://coletaneadigitalicm.github.io/leitor-pdf`
   - ✅ Certo: `https://coletaneadigitalicm.github.io/leitor-pdf/`

---

## 🔄 Após Configurar (Futuras Atualizações)

Para atualizar o site depois de fazer mudanças:

```bash
# 1. Commit suas mudanças
git add .
git commit -m "Descrição das mudanças"
git push

# 2. Deploy
npm run deploy
```

Pronto! O site será atualizado automaticamente em 1-2 minutos.

---

## 📞 Ainda com Dúvida?

Leia o guia completo em: [`GITHUB_PAGES_DEPLOY.md`](GITHUB_PAGES_DEPLOY.md)

---

**🎯 RESUMO:**
1. Settings → Pages
2. Branch: `gh-pages`
3. Save
4. Aguarde 1-2 min
5. Acesse: https://coletaneadigitalicm.github.io/leitor-pdf/
