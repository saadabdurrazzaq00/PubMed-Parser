# PubMed Parser with Llama 3 8B

Parse PubMed citations using **Llama 3 8B** via OpenRouter API. Supports single citations or batch processing from TXT files.

## Features

- 🦙 **Llama 3 8B Only**: Fast and affordable AI parsing
- 📄 **Single Parse**: Paste individual citations
- 📁 **Batch Processing**: Upload TXT files with multiple citations
- 📊 **Export Options**: Download results as JSON or CSV
- 💰 **Cost Effective**: ~$0.0002 per parse ($1 = ~5000 parses)
- 🔐 **Privacy**: API key stored in browser only

## Quick Start

1. **Get OpenRouter API Key**:
   - Visit [openrouter.ai/keys](https://openrouter.ai/keys)
   - Sign up and get API key (starts with `sk-or-v1-`)
   - Add at least $1 credit

2. **Run the App**:
   ```bash
   # Create folder and copy all files
   mkdir pubmed-parser && cd pubmed-parser
   
   # Run local server
   python -m http.server 8000
   
   # Open http://localhost:8000
   ```

3. **Configure**:
   - Enter your OpenRouter API key
   - Choose parsing mode (Single or Batch)
   - Parse citations

## File Format for Batch Processing

Create a TXT file with citations separated by empty lines:

```
1: Author1, Author2. Title. Journal. 2024 Dec;10(2):100-110. doi: ... PMID: ...

2: Author3, Author4. Another Title. Another Journal. 2025 Jan;...

[empty line between citations]
```

The parser automatically detects citations even with numbers (1:, 2:, etc.).

## Cost Calculation

With Llama 3 8B:
- ~200 input tokens per citation
- ~300 output tokens per citation
- Cost: ~$0.0002 per citation
- **$1 credit = ~5,000 citations**

## Export Formats

### JSON Export
```json
{
  "authors": ["Author 1", "Author 2"],
  "title": "Paper Title",
  "journal": "Journal Name",
  ...
}
```

### CSV Export
```
authors,title,journal,publication_date,doi,pmid
"Author1; Author2","Title","Journal","2024-12-01","10.xxxx/xxxx","12345678"
```

## Deployment

### Static Hosting
Upload all files to:
- GitHub Pages
- Netlify
- Vercel
- Any web server

### Local Use
Just open `index.html` in browser!

## Privacy & Security

- API key stored in `localStorage` only
- No data sent to any server except OpenRouter
- Can clear all data anytime
- Works entirely client-side

## Support

- OpenRouter API: https://openrouter.ai
- Issues: Contact developer
```

## 🚀 **How to Use:**

1. **Get API Key:**
   ```bash
   # Visit: https://openrouter.ai/keys
   # Sign up → Get API key → Add $1 credit
   ```

2. **Run:**
   ```bash
   # Save all files in folder
   python -m http.server 8000
   # Open: http://localhost:8000
   ```

3. **Single Parse:**
   - Paste citation in text area
   - Click "Parse Single Citation"
   - View JSON/download CSV

4. **Batch Parse:**
   - Switch to "Batch Parse" tab
   - Upload TXT file with multiple citations
   - Configure batch options
   - Click "Parse Batch File"
   - Download all results as JSON/CSV

## 📊 **Example TXT File Format:**
```txt
1: Liang WW, Müller S, Hart SK. RETRACTED: Study. Cell. 2024 Dec 26;187(26):7637-7654.e29. doi: 10.1016/j.cell.2024.10.021. PMID: 39532094.

2: Romani P, Benedetti G. Another Study. Nat Cell Biol. 2024 Dec;26(12):2046-2060. doi: 10.1038/s41556-024-01527-3. PMID: 39433949.

[empty line]
3: Third study here...
```

**Perfect for your use case!** You get:
1. ✅ **Only Llama 3 8B** (as requested)
2. ✅ **Single parse** (paste text)
3. ✅ **Batch parse** (upload .txt file)
4. ✅ **JSON export** (single & batch)
5. ✅ **CSV export** (single & batch)
6. ✅ **Very cheap** ($0.0002 per parse)
7. ✅ **No downloads** (instant setup)

The batch processing will parse your entire TXT file and give you options to download all results as JSON or CSV! 🎯
