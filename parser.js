/**
 * PubMed Parser with Llama 3 8B Only
 * Supports single parse and batch TXT file processing
 */

const PubMedParser = {
    // Configuration
    config: {
        API_BASE_URL: 'https://openrouter.ai/api/v1',
        MODEL: 'meta-llama/llama-3-8b-instruct',
        MODEL_NAME: 'Llama 3 8B',
        
        // Pricing (per 1K tokens)
        INPUT_PRICE: 0.0002,
        OUTPUT_PRICE: 0.0002,
        
        // Storage keys
        STORAGE_KEYS: {
            API_KEY: 'pubmed_api_key',
            STATS: 'pubmed_stats',
            SINGLE_HISTORY: 'pubmed_single_history',
            BATCH_HISTORY: 'pubmed_batch_history'
        },
        
        // Batch settings
        MAX_BATCH_SIZE: 10,
        PARALLEL_LIMIT: 3
    },
    
    // State
    state: {
        apiKey: null,
        stats: {
            totalParsed: 0,
            totalCost: 0,
            totalTokens: 0,
            singleParsed: 0,
            batchParsed: 0
        },
        currentMode: 'single',
        isParsing: false,
        batchData: null,
        batchResults: [],
        currentResult: null
    },
    
    // Initialize
    async init() {
        console.log('🦙 Initializing PubMed Parser...');
        
        // Load saved data
        this.loadSavedData();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update UI
        this.updateUI();
        
        console.log('✅ Parser initialized');
    },
    
    // Load saved data
    loadSavedData() {
        try {
            // Load API key
            this.state.apiKey = localStorage.getItem(this.config.STORAGE_KEYS.API_KEY);
            
            // Load stats
            const savedStats = localStorage.getItem(this.config.STORAGE_KEYS.STATS);
            if (savedStats) {
                this.state.stats = JSON.parse(savedStats);
            }
            
            // Load batch history
            const savedBatchHistory = localStorage.getItem(this.config.STORAGE_KEYS.BATCH_HISTORY);
            if (savedBatchHistory) {
                this.state.batchResults = JSON.parse(savedBatchHistory);
                this.updateBatchResultsTable();
            }
            
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    },
    
    // Save data
    saveData() {
        try {
            if (this.state.apiKey) {
                localStorage.setItem(this.config.STORAGE_KEYS.API_KEY, this.state.apiKey);
            }
            localStorage.setItem(this.config.STORAGE_KEYS.STATS, JSON.stringify(this.state.stats));
            localStorage.setItem(this.config.STORAGE_KEYS.BATCH_HISTORY, JSON.stringify(this.state.batchResults));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    },
    
    // Set up event listeners
    setupEventListeners() {
        // API key input
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput && this.state.apiKey) {
            apiKeyInput.value = this.state.apiKey;
        }
        
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', (e) => {
                this.state.apiKey = e.target.value.trim();
                this.saveData();
                this.updateAPIStatus();
            });
        }
        
        // Citation input
        const citationInput = document.getElementById('citationInput');
        if (citationInput) {
            citationInput.addEventListener('input', () => {
                this.updateInputMeta();
            });
        }
        
        // Update input meta on load
        this.updateInputMeta();
        this.updateAPIStatus();
    },
    
    // Update UI
    updateUI() {
        this.updateAPIStatus();
        this.updateParsedCount();
        this.updateOutputTabs(this.state.currentMode);
    },
    
    // Update API status
    updateAPIStatus() {
        const apiStatus = document.getElementById('apiStatus');
        if (!apiStatus) return;
        
        if (this.state.apiKey) {
            apiStatus.innerHTML = '<i class="fas fa-check-circle"></i> API: Configured';
            apiStatus.style.color = '#10b981';
        } else {
            apiStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> API: Not configured';
            apiStatus.style.color = '#f59e0b';
        }
    },
    
    // Update parsed count
    updateParsedCount() {
        const parsedCount = document.getElementById('parsedCount');
        if (parsedCount) {
            parsedCount.textContent = `${this.state.stats.totalParsed} parsed`;
        }
    },
    
    // Update input metadata
    updateInputMeta() {
        const input = document.getElementById('citationInput');
        const charCount = document.getElementById('charCount');
        const lineCount = document.getElementById('lineCount');
        
        if (input && charCount && lineCount) {
            const text = input.value;
            const chars = text.length;
            const lines = text.split('\n').length;
            
            charCount.textContent = `${chars.toLocaleString()} characters`;
            lineCount.textContent = `${lines} lines`;
        }
    },
    
    // Update output tabs based on mode
    updateOutputTabs(mode) {
        this.state.currentMode = mode;
        const outputTabs = document.getElementById('outputTabs');
        if (!outputTabs) return;
        
        if (mode === 'single') {
            outputTabs.innerHTML = `
                <button class="output-tab active" onclick="PubMedParser.switchOutput('single')">
                    <i class="fas fa-file-code"></i> JSON Output
                </button>
            `;
            this.switchOutput('single');
        } else {
            outputTabs.innerHTML = `
                <button class="output-tab active" onclick="PubMedParser.switchOutput('batch')">
                    <i class="fas fa-table"></i> Batch Results
                </button>
                <button class="output-tab" onclick="PubMedParser.switchOutput('batchJson')" style="display: none;">
                    <i class="fas fa-code"></i> Batch JSON
                </button>
            `;
            this.switchOutput('batch');
        }
    },
    
    // Switch output view
    switchOutput(view) {
        // Hide all output content
        document.querySelectorAll('.output-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Update tabs
        document.querySelectorAll('.output-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected view
        if (view === 'single') {
            document.getElementById('singleOutput').classList.add('active');
            document.querySelector('.output-tab[onclick="PubMedParser.switchOutput(\'single\')"]').classList.add('active');
        } else if (view === 'batch') {
            document.getElementById('batchOutput').classList.add('active');
            document.querySelector('.output-tab[onclick="PubMedParser.switchOutput(\'batch\')"]').classList.add('active');
            this.updateBatchResultsTable();
        } else if (view === 'batchJson') {
            // For showing full batch JSON
            document.getElementById('singleOutput').classList.add('active');
            document.querySelector('.output-tab[onclick="PubMedParser.switchOutput(\'batchJson\')"]').classList.add('active');
        }
    },
    
    // ===== SINGLE PARSE METHODS =====
    
    // Parse single citation
    async parseSingle() {
        if (this.state.isParsing) {
            this.showToast('Already processing, please wait...', 'warning');
            return;
        }
        
        const input = document.getElementById('citationInput');
        if (!input || !input.value.trim()) {
            this.showToast('Please enter a PubMed citation', 'warning');
            return;
        }
        
        if (!this.state.apiKey) {
            this.showToast('Please enter your OpenRouter API key', 'error');
            return;
        }
        
        const citationText = input.value.trim();
        this.state.isParsing = true;
        
        // Update UI
        this.showLoading('Parsing with Llama 3 8B...');
        this.updateParseButton(true, 'single');
        
        try {
            const result = await this.parseCitationWithAI(citationText);
            
            if (result.success) {
                // Update stats
                this.state.stats.totalParsed++;
                this.state.stats.singleParsed++;
                this.state.stats.totalTokens += result.usage.total_tokens;
                this.state.stats.totalCost += parseFloat(result.cost);
                
                // Display results
                this.displaySingleResult(result.data, result);
                
                // Save data
                this.saveData();
                this.updateUI();
                
                this.showToast(`Parsed successfully! Cost: $${result.cost}`, 'success');
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Parsing error:', error);
            this.showToast(`Error: ${error.message}`, 'error');
            this.displayError(error);
        } finally {
            this.state.isParsing = false;
            this.hideLoading();
            this.updateParseButton(false, 'single');
        }
    },
    
    // Parse citation with AI
    async parseCitationWithAI(citationText) {
        const startTime = Date.now();
        
        try {
            const prompt = this.createExtractionPrompt(citationText);
            
            const response = await fetch(`${this.config.API_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.state.apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'PubMed Parser'
                },
                body: JSON.stringify({
                    model: this.config.MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a PubMed data extraction expert. Extract structured JSON from citations. Always return valid JSON.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1000,
                    top_p: 0.9,
                    response_format: { type: 'json_object' }
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            const endTime = Date.now();
            
            // Parse response
            const parsedData = this.parseAIResponse(data.choices[0].message.content);
            
            // Calculate cost
            const usage = data.usage;
            const inputCost = (usage.prompt_tokens / 1000) * this.config.INPUT_PRICE;
            const outputCost = (usage.completion_tokens / 1000) * this.config.OUTPUT_PRICE;
            const totalCost = (inputCost + outputCost).toFixed(6);
            
            return {
                success: true,
                data: parsedData,
                usage: usage,
                cost: totalCost,
                time: endTime - startTime
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Create extraction prompt
    createExtractionPrompt(citationText) {
        return `Extract structured JSON from this PubMed citation:

${citationText}

Extract these fields:
1. authors: array of author names (preserve exact formatting)
2. title: string (full title including RETRACTED/WITHDRAWN if present)
3. journal: string (journal name)
4. publication_date: string in YYYY-MM-DD format
5. volume: string or null
6. issue: string or null
7. pages: string or null
8. doi: string or null
9. pmid: string or null
10. pmcid: string or null
11. epub_date: string or null (YYYY-MM-DD format)
12. retraction: object with is_retracted (boolean), retraction_date, retraction_journal, retraction_doi, retraction_reason
13. abstract: string or null (if available)
14. keywords: array of strings or null
15. article_type: string or null

Rules:
- Return ONLY valid JSON
- Use null for missing fields
- For authors: format as array even if single author
- For dates: use YYYY-MM-DD format
- For retraction: only include if citation mentions retraction

JSON:`;
    },
    
    // Parse AI response
    parseAIResponse(response) {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Validate required fields
            if (!parsed.authors || !parsed.title || !parsed.journal) {
                throw new Error('Missing required fields');
            }
            
            // Clean and normalize data
            this.normalizeParsedData(parsed);
            
            return parsed;
            
        } catch (error) {
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    },
    
    // Normalize parsed data
    normalizeParsedData(data) {
        // Ensure arrays
        if (data.authors && !Array.isArray(data.authors)) {
            data.authors = [data.authors];
        }
        
        if (data.keywords && !Array.isArray(data.keywords)) {
            if (typeof data.keywords === 'string') {
                data.keywords = data.keywords.split(/[;,]/).map(k => k.trim()).filter(k => k);
            } else {
                data.keywords = [];
            }
        }
        
        // Ensure retraction object
        if (!data.retraction) {
            data.retraction = {
                is_retracted: false,
                retraction_date: null,
                retraction_journal: null,
                retraction_doi: null,
                retraction_reason: null
            };
        }
        
        // Clean strings
        const stringFields = ['title', 'journal', 'abstract', 'article_type'];
        stringFields.forEach(field => {
            if (data[field] && typeof data[field] === 'string') {
                data[field] = data[field].trim();
            }
        });
        
        // Ensure authors are strings
        if (Array.isArray(data.authors)) {
            data.authors = data.authors.map(author => {
                if (typeof author === 'string') {
                    return author.trim();
                }
                return String(author);
            });
        }
    },
    
    // Display single result
    displaySingleResult(data, apiResult) {
        this.state.currentResult = data;
        
        // Display JSON
        const jsonOutput = document.getElementById('jsonOutput');
        if (jsonOutput) {
            const formattedJSON = JSON.stringify(data, null, 2);
            jsonOutput.textContent = formattedJSON;
            hljs.highlightElement(jsonOutput);
        }
        
        // Display fields
        this.displayFields(data);
        
        // Show CSV download button
        document.getElementById('downloadCSVBtn').style.display = 'block';
        
        // Update status
        const status = document.getElementById('status');
        if (status) {
            status.innerHTML = `
                <div class="status-success show">
                    <i class="fas fa-check-circle"></i>
                    Parsed in ${apiResult.time}ms | Cost: $${apiResult.cost} | Tokens: ${apiResult.usage.total_tokens}
                </div>
            `;
        }
    },
    
    // Display fields in grid
    displayFields(data) {
        const fieldsGrid = document.getElementById('fieldsGrid');
        if (!fieldsGrid) return;
        
        const fields = [
            { key: 'authors', label: 'Authors', icon: 'fas fa-users' },
            { key: 'title', label: 'Title', icon: 'fas fa-heading' },
            { key: 'journal', label: 'Journal', icon: 'fas fa-book' },
            { key: 'publication_date', label: 'Publication Date', icon: 'fas fa-calendar' },
            { key: 'volume', label: 'Volume', icon: 'fas fa-hashtag' },
            { key: 'issue', label: 'Issue', icon: 'fas fa-hashtag' },
            { key: 'pages', label: 'Pages', icon: 'fas fa-file-alt' },
            { key: 'doi', label: 'DOI', icon: 'fas fa-link' },
            { key: 'pmid', label: 'PMID', icon: 'fas fa-id-card' },
            { key: 'pmcid', label: 'PMCID', icon: 'fas fa-id-card-alt' },
            { key: 'article_type', label: 'Article Type', icon: 'fas fa-tag' }
        ];
        
        fieldsGrid.innerHTML = fields.map(field => {
            let value = data[field.key];
            if (value === null || value === undefined) value = '';
            
            if (field.key === 'authors' && Array.isArray(value)) {
                value = value.join(', ');
            }
            
            if (field.key === 'keywords' && Array.isArray(value)) {
                value = value.join(', ');
            }
            
            return `
                <div class="field-card">
                    <div class="field-label">
                        <i class="${field.icon}"></i> ${field.label}
                    </div>
                    <div class="field-value">
                        ${value || '<em>Not found</em>'}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // ===== BATCH PROCESSING METHODS =====
    
    // Handle file selection
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.txt')) {
            this.showToast('Please upload a .txt file', 'error');
            return;
        }
        
        // Read file
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.processFileContent(file, content);
        };
        reader.readAsText(file);
    },
    
    // Process file content
    processFileContent(file, content) {
        // Parse citations from file
        const citations = this.parseCitationsFromText(content);
        
        if (citations.length === 0) {
            this.showToast('No citations found in the file', 'warning');
            return;
        }
        
        // Store batch data
        this.state.batchData = {
            fileName: file.name,
            fileSize: (file.size / 1024).toFixed(2),
            citations: citations,
            total: citations.length,
            processed: 0,
            successful: 0,
            failed: 0
        };
        
        // Update file info display
        this.updateFileInfo(file, citations.length);
        
        // Enable parse button
        document.getElementById('parseBatchBtn').disabled = false;
        
        this.showToast(`Found ${citations.length} citations in file`, 'success');
    },
    
    // Parse citations from text
    parseCitationsFromText(text) {
        // Split by empty lines or numbered entries
        const lines = text.split('\n');
        const citations = [];
        let currentCitation = [];
        let inCitation = false;
        
        for (let line of lines) {
            line = line.trim();
            
            // Skip empty lines at start
            if (!inCitation && line === '') continue;
            
            // Check if this is a new citation (starts with number: or is author line)
            if (line.match(/^\d+:/) || (line.match(/^[A-Z][a-z]+.*?,.*?\./) && !inCitation)) {
                // Save previous citation if exists
                if (currentCitation.length > 0) {
                    const citationText = currentCitation.join(' ').trim();
                    if (citationText.length > 50) {
                        citations.push(citationText);
                    }
                    currentCitation = [];
                }
                inCitation = true;
                
                // Remove number prefix if present
                line = line.replace(/^\d+:\s*/, '');
            }
            
            // Add line to current citation
            if (inCitation && line !== '') {
                currentCitation.push(line);
            } else if (line === '' && inCitation) {
                // Empty line might indicate end of citation
                if (currentCitation.length > 0) {
                    const citationText = currentCitation.join(' ').trim();
                    if (citationText.length > 50) {
                        citations.push(citationText);
                    }
                    currentCitation = [];
                    inCitation = false;
                }
            }
        }
        
        // Add last citation if exists
        if (currentCitation.length > 0) {
            const citationText = currentCitation.join(' ').trim();
            if (citationText.length > 50) {
                citations.push(citationText);
            }
        }
        
        return citations;
    },
    
    // Update file info display
    updateFileInfo(file, citationCount) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const citationCountEl = document.getElementById('citationCount');
        const fileLines = document.getElementById('fileLines');
        
        if (fileInfo && fileName && fileSize && citationCountEl && fileLines) {
            fileInfo.classList.add('show');
            fileName.textContent = file.name;
            fileSize.textContent = `${(file.size / 1024).toFixed(2)} KB`;
            citationCountEl.textContent = `${citationCount} citations`;
            fileLines.textContent = `${file.name.split('\n').length} lines`;
        }
    },
    
    // Parse batch file
    async parseBatch() {
        if (!this.state.batchData || this.state.batchData.citations.length === 0) {
            this.showToast('Please upload a file first', 'warning');
            return;
        }
        
        if (!this.state.apiKey) {
            this.showToast('Please enter your OpenRouter API key', 'error');
            return;
        }
        
        if (this.state.isParsing) {
            this.showToast('Already processing, please wait...', 'warning');
            return;
        }
        
        this.state.isParsing = true;
        
        // Get batch options
        const parallelProcessing = document.getElementById('parallelProcessing').checked;
        const batchSize = parseInt(document.getElementById('batchSize').value) || 3;
        
        // Initialize results
        this.state.batchResults = [];
        
        // Show loading
        this.showLoading(`Processing ${this.state.batchData.total} citations...`);
        this.updateParseButton(true, 'batch');
        
        try {
            const citations = this.state.batchData.citations;
            
            if (parallelProcessing) {
                // Process in parallel batches
                await this.processBatchParallel(citations, batchSize);
            } else {
                // Process sequentially
                await this.processBatchSequential(citations);
            }
            
            // Update stats
            this.state.stats.totalParsed += this.state.batchData.successful;
            this.state.stats.batchParsed += this.state.batchData.successful;
            this.saveData();
            this.updateUI();
            
            // Update batch results table
            this.updateBatchResultsTable();
            this.updateBatchStats();
            
            this.showToast(`Batch completed! ${this.state.batchData.successful} successful, ${this.state.batchData.failed} failed`, 'success');
            
        } catch (error) {
            console.error('Batch processing error:', error);
            this.showToast(`Batch error: ${error.message}`, 'error');
        } finally {
            this.state.isParsing = false;
            this.hideLoading();
            this.updateParseButton(false, 'batch');
        }
    },
    
    // Process batch sequentially
    async processBatchSequential(citations) {
        for (let i = 0; i < citations.length; i++) {
            if (!this.state.isParsing) break;
            
            const citation = citations[i];
            
            // Update progress
            this.updateProgress(i + 1, citations.length, `Parsing citation ${i + 1} of ${citations.length}`);
            
            try {
                const result = await this.parseCitationWithAI(citation);
                
                if (result.success) {
                    this.state.batchData.successful++;
                    this.state.batchData.processed++;
                    
                    // Add to results
                    this.state.batchResults.push({
                        id: Date.now() + i,
                        citation: citation.substring(0, 100) + (citation.length > 100 ? '...' : ''),
                        data: result.data,
                        status: 'success',
                        cost: result.cost,
                        tokens: result.usage.total_tokens,
                        time: result.time,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Update stats
                    this.state.stats.totalTokens += result.usage.total_tokens;
                    this.state.stats.totalCost += parseFloat(result.cost);
                    
                } else {
                    throw new Error(result.error);
                }
                
            } catch (error) {
                this.state.batchData.failed++;
                this.state.batchData.processed++;
                
                this.state.batchResults.push({
                    id: Date.now() + i,
                    citation: citation.substring(0, 100) + (citation.length > 100 ? '...' : ''),
                    error: error.message,
                    status: 'error',
                    timestamp: new Date().toISOString()
                });
                
                console.error(`Failed to parse citation ${i + 1}:`, error.message);
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    },
    
    // Process batch in parallel
    async processBatchParallel(citations, batchSize) {
        const parallelLimit = Math.min(batchSize, this.config.PARALLEL_LIMIT);
        
        for (let i = 0; i < citations.length; i += parallelLimit) {
            if (!this.state.isParsing) break;
            
            const batch = citations.slice(i, i + parallelLimit);
            const batchPromises = batch.map((citation, index) => 
                this.processSingleBatchItem(citation, i + index + 1, citations.length)
            );
            
            await Promise.allSettled(batchPromises);
            
            // Update progress
            const processed = Math.min(i + parallelLimit, citations.length);
            this.updateProgress(processed, citations.length, `Processed ${processed} of ${citations.length} citations`);
            
            // Delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    },
    
    // Process single batch item
    async processSingleBatchItem(citation, index, total) {
        try {
            const result = await this.parseCitationWithAI(citation);
            
            if (result.success) {
                this.state.batchData.successful++;
                this.state.batchData.processed++;
                
                this.state.batchResults.push({
                    id: Date.now() + index,
                    citation: citation.substring(0, 100) + (citation.length > 100 ? '...' : ''),
                    data: result.data,
                    status: 'success',
                    cost: result.cost,
                    tokens: result.usage.total_tokens,
                    time: result.time,
                    timestamp: new Date().toISOString()
                });
                
                this.state.stats.totalTokens += result.usage.total_tokens;
                this.state.stats.totalCost += parseFloat(result.cost);
                
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            this.state.batchData.failed++;
            this.state.batchData.processed++;
            
            this.state.batchResults.push({
                id: Date.now() + index,
                citation: citation.substring(0, 100) + (citation.length > 100 ? '...' : ''),
                error: error.message,
                status: 'error',
                timestamp: new Date().toISOString()
            });
        }
    },
    
    // Update batch results table
    updateBatchResultsTable() {
        const resultsBody = document.getElementById('resultsBody');
        const resultsCount = document.getElementById('resultsCount');
        
        if (!resultsBody || !resultsCount) return;
        
        if (this.state.batchResults.length === 0) {
            resultsBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-tertiary);">
                        <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        <p>No batch results yet</p>
                        <p style="font-size: 0.9rem;">Upload a TXT file and parse to see results here</p>
                    </td>
                </tr>
            `;
            resultsCount.textContent = '(0 items)';
            return;
        }
        
        let html = '';
        let successful = 0;
        let totalCost = 0;
        
        this.state.batchResults.forEach((result, index) => {
            if (result.status === 'success') {
                successful++;
                totalCost += parseFloat(result.cost || 0);
            }
            
            const title = result.data?.title || result.citation || 'Unknown';
            const authors = result.data?.authors ? 
                (Array.isArray(result.data.authors) ? result.data.authors.slice(0, 2).join(', ') : result.data.authors) : 
                'Unknown';
            const journal = result.data?.journal || 'Unknown';
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div style="font-weight: 500; margin-bottom: 0.25rem;">${title.substring(0, 80)}${title.length > 80 ? '...' : ''}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${result.citation.substring(0, 60)}...</div>
                    </td>
                    <td>${authors.substring(0, 40)}${authors.length > 40 ? '...' : ''}</td>
                    <td>${journal.substring(0, 30)}${journal.length > 30 ? '...' : ''}</td>
                    <td>
                        <span class="result-status status-${result.status}">
                            <i class="fas fa-${result.status === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                            ${result.status === 'success' ? 'Success' : 'Failed'}
                        </span>
                    </td>
                    <td>
                        <div class="result-actions">
                            <button class="btn-icon" onclick="PubMedParser.viewResult(${index})" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon" onclick="PubMedParser.copyResult(${index})" title="Copy JSON">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        resultsBody.innerHTML = html;
        resultsCount.textContent = `(${this.state.batchResults.length} items, ${successful} successful)`;
        
        // Update batch stats
        const batchStats = document.getElementById('batchStats');
        if (batchStats) {
            batchStats.textContent = `${successful} successful, ${this.state.batchResults.length - successful} failed | Total cost: $${totalCost.toFixed(6)}`;
        }
    },
    
    // Update batch stats
    updateBatchStats() {
        const batchStats = document.getElementById('batchStats');
        if (!batchStats || !this.state.batchData) return;
        
        const successful = this.state.batchResults.filter(r => r.status === 'success').length;
        const failed = this.state.batchResults.filter(r => r.status === 'error').length;
        const totalCost = this.state.batchResults.reduce((sum, result) => {
            return sum + parseFloat(result.cost || 0);
        }, 0);
        
        batchStats.textContent = `${successful} successful, ${failed} failed | Total cost: $${totalCost.toFixed(6)}`;
    },
    
    // View individual result
    viewResult(index) {
        const result = this.state.batchResults[index];
        if (!result || result.status !== 'success') return;
        
        // Switch to single mode and display result
        switchMode('single');
        this.displaySingleResult(result.data, {
            cost: result.cost,
            time: result.time,
            usage: { total_tokens: result.tokens }
        });
        
        this.showToast(`Viewing result ${index + 1}`, 'info');
    },
    
    // Copy result to clipboard
    copyResult(index) {
        const result = this.state.batchResults[index];
        if (!result || result.status !== 'success') return;
        
        const jsonStr = JSON.stringify(result.data, null, 2);
        navigator.clipboard.writeText(jsonStr)
            .then(() => this.showToast('Result copied to clipboard', 'success'))
            .catch(() => this.showToast('Failed to copy', 'error'));
    },
    
    // ===== UTILITY METHODS =====
    
    // Update progress
    updateProgress(current, total, message) {
        const progressText = document.getElementById('progressText');
        const progressDetail = document.getElementById('progressDetail');
        const progressFill = document.getElementById('progressFill');
        
        if (progressText && progressDetail && progressFill) {
            const percent = Math.round((current / total) * 100);
            progressText.textContent = `${percent}%`;
            progressDetail.textContent = message;
            progressFill.style.width = `${percent}%`;
        }
    },
    
    // Show loading overlay
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (overlay) overlay.classList.add('show');
        if (loadingText) loadingText.textContent = message;
    },
    
    // Hide loading overlay
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('show');
    },
    
    // Update parse button state
    updateParseButton(isLoading, mode) {
        const parseBtn = mode === 'single' ? 
            document.getElementById('parseSingleBtn') : 
            document.getElementById('parseBatchBtn');
        
        if (!parseBtn) return;
        
        if (isLoading) {
            parseBtn.classList.add('loading');
            parseBtn.disabled = true;
            parseBtn.querySelector('span').textContent = mode === 'single' ? 'Parsing...' : 'Processing...';
        } else {
            parseBtn.classList.remove('loading');
            parseBtn.disabled = false;
            parseBtn.querySelector('span').textContent = mode === 'single' ? 'Parse Single Citation' : 'Parse Batch File';
        }
    },
    
    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `<i class="${icons[type] || icons.info}"></i> ${message}`;
        toast.className = `toast ${type} show`;
        
        // Auto-hide
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },
    
    // Display error
    displayError(error) {
        const jsonOutput = document.getElementById('jsonOutput');
        if (jsonOutput) {
            jsonOutput.textContent = JSON.stringify({
                error: error.message,
                timestamp: new Date().toISOString()
            }, null, 2);
            hljs.highlightElement(jsonOutput);
        }
        
        const status = document.getElementById('status');
        if (status) {
            status.innerHTML = `
                <div class="status-error show">
                    <i class="fas fa-exclamation-circle"></i>
                    Error: ${error.message}
                </div>
            `;
        }
    },
    
    // ===== EXPORT METHODS =====
    
    // Copy JSON to clipboard
    copyJSON() {
        const jsonOutput = document.getElementById('jsonOutput');
        if (!jsonOutput) return;
        
        navigator.clipboard.writeText(jsonOutput.textContent)
            .then(() => this.showToast('JSON copied to clipboard', 'success'))
            .catch(() => this.showToast('Failed to copy', 'error'));
    },
    
    // Download single JSON
    downloadJSON() {
        const jsonOutput = document.getElementById('jsonOutput');
        if (!jsonOutput) return;
        
        const blob = new Blob([jsonOutput.textContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pubmed_single_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('JSON downloaded', 'success');
    },
    
    // Download single CSV
    downloadCSV() {
        if (!this.state.currentResult) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        const csv = this.convertToCSV([this.state.currentResult]);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pubmed_single_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('CSV downloaded', 'success');
    },
    
    // Export batch JSON
    exportBatchJSON() {
        if (this.state.batchResults.length === 0) {
            this.showToast('No batch results to export', 'warning');
            return;
        }
        
        const successfulResults = this.state.batchResults
            .filter(r => r.status === 'success')
            .map(r => r.data);
        
        const exportData = {
            export_date: new Date().toISOString(),
            total: successfulResults.length,
            data: successfulResults
        };
        
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pubmed_batch_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Batch JSON exported', 'success');
    },
    
    // Export batch CSV
    exportBatchCSV() {
        if (this.state.batchResults.length === 0) {
            this.showToast('No batch results to export', 'warning');
            return;
        }
        
        const successfulResults = this.state.batchResults
            .filter(r => r.status === 'success')
            .map(r => r.data);
        
        if (successfulResults.length === 0) {
            this.showToast('No successful results to export', 'warning');
            return;
        }
        
        const csv = this.convertToCSV(successfulResults);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pubmed_batch_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Batch CSV exported', 'success');
    },
    
    // Convert data to CSV
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        // Get all possible fields
        const fields = new Set();
        data.forEach(item => {
            Object.keys(item).forEach(key => fields.add(key));
        });
        
        const fieldList = Array.from(fields);
        
        // Build CSV header
        let csv = fieldList.map(field => `"${field}"`).join(',') + '\n';
        
        // Build CSV rows
        data.forEach(item => {
            const row = fieldList.map(field => {
                let value = item[field];
                
                if (value === null || value === undefined) {
                    return '';
                }
                
                if (Array.isArray(value)) {
                    value = value.join('; ');
                } else if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
                
                // Escape quotes and wrap in quotes
                value = String(value).replace(/"/g, '""');
                return `"${value}"`;
            });
            
            csv += row.join(',') + '\n';
        });
        
        return csv;
    },
    
    // ===== UI UTILITY METHODS =====
    
    loadExample() {
        const example = `Liang WW, Müller S, Hart SK, Wessels HH, Méndez-Mancilla A, Sookdeo A, Choi O, Caragine CM, Corman A, Lu L, Kolumba O, Williams B, Sanjana NE. RETRACTED: Transcriptome-scale RNA-targeting CRISPR screens reveal essential lncRNAs in human cells. Cell. 2024 Dec 26;187(26):7637-7654.e29. doi: 10.1016/j.cell.2024.10.021. Epub 2024 Nov 11. Retraction in: Cell. 2025 Dec 24;188(26):7629. doi: 10.1016/j.cell.2025.11.032. PMID: 39532094; PMCID: PMC11682925.`;
        
        const input = document.getElementById('citationInput');
        if (input) {
            input.value = example;
            this.updateInputMeta();
            this.showToast('Example loaded', 'info');
        }
    },
    
    clearSingleInput() {
        const input = document.getElementById('citationInput');
        if (input) {
            input.value = '';
            this.updateInputMeta();
            this.showToast('Input cleared', 'info');
        }
        
        // Clear output
        const jsonOutput = document.getElementById('jsonOutput');
        if (jsonOutput) {
            jsonOutput.textContent = '{\n  "status": "Ready",\n  "message": "Parse a citation to see results here"\n}';
        }
        
        const fieldsGrid = document.getElementById('fieldsGrid');
        if (fieldsGrid) {
            fieldsGrid.innerHTML = '';
        }
        
        document.getElementById('downloadCSVBtn').style.display = 'none';
    },
    
    clearBatchInput() {
        // Clear file input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
        
        // Clear file info
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo) fileInfo.classList.remove('show');
        
        // Clear batch data
        this.state.batchData = null;
        
        // Disable parse button
        document.getElementById('parseBatchBtn').disabled = true;
        
        this.showToast('File cleared', 'info');
    },
    
    clearBatchResults() {
        if (this.state.batchResults.length === 0) {
            this.showToast('No results to clear', 'info');
            return;
        }
        
        if (confirm('Clear all batch results? This cannot be undone.')) {
            this.state.batchResults = [];
            this.saveData();
            this.updateBatchResultsTable();
            this.showToast('Batch results cleared', 'success');
        }
    },
    
    clearAllData() {
        if (confirm('Clear all data including API key, stats, and results? This cannot be undone.')) {
            // Clear localStorage
            localStorage.clear();
            
            // Reset state
            this.state.apiKey = null;
            this.state.stats = {
                totalParsed: 0,
                totalCost: 0,
                totalTokens: 0,
                singleParsed: 0,
                batchParsed: 0
            };
            this.state.batchData = null;
            this.state.batchResults = [];
            this.state.currentResult = null;
            
            // Clear UI
            const apiKeyInput = document.getElementById('apiKey');
            if (apiKeyInput) apiKeyInput.value = '';
            
            this.clearSingleInput();
            this.clearBatchInput();
            this.updateBatchResultsTable();
            this.updateUI();
            
            this.showToast('All data cleared', 'success');
        }
    },
    
    showAbout() {
        alert(`PubMed Parser v2.0\n\nFeatures:\n• Single citation parsing\n• Batch processing from TXT files\n• Uses Llama 3 8B via OpenRouter API\n• Export to JSON and CSV\n• Cost: ~$0.0002 per parse\n\nInstructions:\n1. Get API key from openrouter.ai/keys\n2. Add credits (as low as $1)\n3. Paste citation or upload TXT file\n4. Parse and export results\n\nPrivacy: Your API key stays in browser only`);
    }
};