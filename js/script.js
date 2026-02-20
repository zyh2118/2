document.addEventListener('DOMContentLoaded', function() {
    const selectMemeBtn = document.getElementById('selectMemeBtn');
    const memeModal = document.getElementById('memeModal');
    const closeModal = document.getElementById('closeModal');
    const memeListEl = document.getElementById('memeList');
    const searchInput = document.getElementById('searchInput');
    const selectedMemeContainer = document.getElementById('selectedMemeContainer');
    const selectedMemePreview = document.getElementById('selectedMemePreview');
    const selectedMemeName = document.getElementById('selectedMemeName');
    const selectedMemeType = document.getElementById('selectedMemeType');
    const formFieldsEl = document.getElementById('formFields');
    const memeForm = document.getElementById('memeForm');
    const resultContainer = document.getElementById('resultContainer');
    const resultImage = document.getElementById('resultImage');
    const downloadBtn = document.getElementById('downloadBtn');
    const regenerateBtn = document.getElementById('regenerateBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const imageLoadingTip = document.getElementById('imageLoadingTip');
    
    let selectedMeme = null;
    let memeData = [];
    
    // 将API返回的对象格式转换为数组
    function convertApiDataToArray(data) {
        const result = [];
        for (const key in data) {
            if (data.hasOwnProperty(key) && !isNaN(parseInt(key))) {
                const item = data[key];
                if (item && item.data && item.data.name) {
                    result.push({
                        id: key,
                        tisp: item.tisp || '',
                        data: item.data
                    });
                }
            }
        }
        return result;
    }
    
    function loadMemeData() {
        memeListEl.innerHTML = `
            <div class="loading">
                <div class="loading__spinner"></div>
                <p>加载中...</p>
            </div>
        `;
        
        fetch('https://api.lolimi.cn/API/preview/api?action=meme_info')
            .then(response => response.json())
            .then(data => {
                memeData = convertApiDataToArray(data);
                renderMemeList(memeData);
            })
            .catch(error => {
                console.error('加载失败:', error);
                memeListEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>加载失败，请刷新重试</p>
                    </div>
                `;
            });
    }
    
    // 渲染列表 - 只显示名称，不显示图片
    function renderMemeList(memes) {
        if (!memes || memes.length === 0) {
            memeListEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>没有找到表情包</p>
                </div>
            `;
            return;
        }
        
        memeListEl.innerHTML = '';
        
        memes.forEach(meme => {
            const item = document.createElement('div');
            item.className = 'meme-item';
            item.innerHTML = `
                <span class="meme-item__name">${meme.data.name}</span>
                <span class="meme-item__type">#${meme.data.type}</span>
            `;
            
            item.addEventListener('click', function() {
                selectMeme(meme);
                memeModal.style.display = 'none';
            });
            
            memeListEl.appendChild(item);
        });
    }
    
    function selectMeme(meme) {
        selectedMeme = meme;
        selectedMemeContainer.classList.remove('hidden');
        selectedMemeName.textContent = meme.data.name;
        selectedMemeType.textContent = '#' + meme.data.type;
        selectedMemePreview.src = meme.data.url || '';
        
        renderFormFields(meme);
        resultContainer.classList.add('hidden');
    }
    
    function renderFormFields(meme) {
        formFieldsEl.innerHTML = '';
        
        if (!meme.data.params || meme.data.params.length === 0) {
            formFieldsEl.innerHTML = `<p style="color:#888;font-size:13px;">此模板无需输入参数</p>`;
            return;
        }
        
        meme.data.params.forEach((param, index) => {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            let defaultValue = '';
            if (meme.data.default_texts && meme.data.default_texts[index]) {
                const dt = meme.data.default_texts[index];
                defaultValue = Array.isArray(dt) ? dt[0] || '' : dt;
            }
            
            let label = param.toUpperCase();
            let placeholder = '';
            
            if (param.startsWith('qq')) {
                label = 'QQ号';
                placeholder = '输入QQ号';
            } else if (param === 'msg' || param.startsWith('msg')) {
                const num = param.replace('msg', '') || '';
                label = '文本' + (num || '');
                placeholder = defaultValue || '输入文本';
            }
            
            formGroup.innerHTML = `
                <label for="${param}">${label}</label>
                <input type="text" id="${param}" name="${param}" class="form-control" placeholder="${placeholder}" value="${defaultValue}">
            `;
            
            formFieldsEl.appendChild(formGroup);
        });
    }
    
    function generateMeme() {
        if (!selectedMeme) return;
        
        loadingIndicator.classList.remove('hidden');
        resultContainer.classList.remove('hidden');
        resultImage.classList.add('hidden');
        imageLoadingTip.classList.remove('hidden');
        imageLoadingTip.textContent = '生成中...';
        
        let apiUrl = `https://api.lolimi.cn/API/preview/api.php?action=create_meme&type=${selectedMeme.data.type}`;
        
        const formData = new FormData(memeForm);
        for (const [key, value] of formData.entries()) {
            if (value.trim()) {
                apiUrl += `&${key}=${encodeURIComponent(value)}`;
            }
        }
        
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = function() {
            loadingIndicator.classList.add('hidden');
            imageLoadingTip.classList.add('hidden');
            resultImage.classList.remove('hidden');
            resultImage.src = apiUrl;
            downloadBtn.href = apiUrl;
            
            addToRecentMemes(selectedMeme.data.name, apiUrl);
        };
        
        img.onerror = function() {
            loadingIndicator.classList.add('hidden');
            imageLoadingTip.textContent = '生成失败，请重试';
            resultImage.classList.add('hidden');
        };
        
        img.src = apiUrl;
    }
    
    function addToRecentMemes(name, url) {
        const recentMemesEl = document.getElementById('recentMemes');
        
        // 检查是否已存在
        const existing = recentMemesEl.querySelectorAll('.meme-item');
        for (let item of existing) {
            if (item.dataset.url === url) return;
        }
        
        // 最多保留6个
        if (existing.length >= 6) {
            recentMemesEl.removeChild(existing[existing.length - 1]);
        }
        
        const item = document.createElement('div');
        item.className = 'meme-item';
        item.dataset.url = url;
        item.innerHTML = `
            <img class="meme-item__img" src="${url}" alt="${name}">
            <span class="meme-item__name">${name}</span>
        `;
        
        item.addEventListener('click', function() {
            resultImage.src = url;
            resultImage.classList.remove('hidden');
            resultContainer.classList.remove('hidden');
            downloadBtn.href = url;
        });
        
        recentMemesEl.insertBefore(item, recentMemesEl.firstChild);
        
        // 移除空状态
        const empty = recentMemesEl.querySelector('.empty-state');
        if (empty) empty.remove();
    }

    // 事件绑定
    selectMemeBtn.addEventListener('click', function() {
        memeModal.style.display = 'block';
        if (memeData.length === 0) {
            loadMemeData();
        }
    });
    
    closeModal.addEventListener('click', () => memeModal.style.display = 'none');
    
    window.addEventListener('click', function(e) {
        if (e.target === memeModal) memeModal.style.display = 'none';
    });
    
    searchInput.addEventListener('input', function() {
        const term = this.value.toLowerCase().trim();
        if (!term) {
            renderMemeList(memeData);
            return;
        }
        const filtered = memeData.filter(m => 
            m.data.name.toLowerCase().includes(term) || 
            String(m.data.type).includes(term)
        );
        renderMemeList(filtered);
    });
    
    memeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        generateMeme();
    });
    
    regenerateBtn.addEventListener('click', generateMeme);
    
    downloadBtn.addEventListener('click', function(e) {
        if (!resultImage.src || resultImage.classList.contains('hidden')) {
            e.preventDefault();
            alert('请先生成表情包');
        }
    });
});
