// グローバル変数
let products = [];
let cart = [];
let currentCategory = 'all';

// DOM要素の取得
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const categoryButtons = document.querySelectorAll('.category-btn');
const productsContainer = document.getElementById('productsContainer');
const cartIcon = document.getElementById('cartIcon');
const cartPanel = document.getElementById('cartPanel');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartBadge = document.getElementById('cartBadge');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const logo = document.getElementById('logo');
const logoLink = document.getElementById('logoLink');
const heroSection = document.getElementById('heroSection');
const mainContent = document.querySelector('.main-content');
const productModal = document.getElementById('productModal');
const productModalOverlay = document.getElementById('productModalOverlay');
const productModalClose = document.getElementById('productModalClose');
const productDetailImage = document.getElementById('productDetailImage');
const productDetailName = document.getElementById('productDetailName');
const productDetailDescription = document.getElementById('productDetailDescription');
const productDetailPrice = document.getElementById('productDetailPrice');
const productDetailStock = document.getElementById('productDetailStock');
const productDetailAddCart = document.getElementById('productDetailAddCart');
const productDetailDetailedDescription = document.getElementById('productDetailDetailedDescription');
const productDetailSizeSection = document.getElementById('productDetailSizeSection');
const productDetailSizes = document.getElementById('productDetailSizes');
const productImageThumbnails = document.getElementById('productImageThumbnails');
const productDetailImageMain = document.getElementById('productDetailImageMain');
const productImagePrev = document.getElementById('productImagePrev');
const productImageNext = document.getElementById('productImageNext');
const productImageLightbox = document.getElementById('productImageLightbox');
const productImageLightboxImg = document.getElementById('productImageLightboxImg');
const productImageLightboxClose = document.getElementById('productImageLightboxClose');
let currentDetailProduct = null;
let currentDetailImageCaptions = [];
let currentDetailImageIndex = 0;
let currentSelectedSize = null;
let swipeHandlersAttached = false; // スワイプハンドラーが既にアタッチされているか
let swipeHandlers = {
    touchstart: null,
    touchmove: null,
    touchend: null,
    touchcancel: null
};

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', () => {
    // iOS 最優先: 動画は fetch 待ちにせず、DOM 直後に初期化して load/play を開始
    initBackgroundVideo();

    setTimeout(() => {
        initializeApp();
    }, 200);

    (function setupIosVideoPlayOnInteraction() {
        var isIOS =
            /iPhone|iPad|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (!isIOS) return;

        var vid = document.getElementById('bgVideo');
        if (!vid) return;

        function tryPlayOnce() {
            if (!vid.paused) return;
            vid.play().catch(function () {});
        }

        document.addEventListener('touchstart', tryPlayOnce, { once: true });
        window.addEventListener('scroll', tryPlayOnce, { once: true });
        document.addEventListener('click', tryPlayOnce, { once: true });
    })();
});

// アプリケーションの初期化
async function initializeApp() {
    // スプラッシュスクリーンの表示（初回セッションのみ）
    showSplashScreen();
    
    // カートをローカルストレージから読み込み
    loadCart();
    
    // 商品データを取得（この中でdisplayProductsが呼ばれる）
    await fetchProducts();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // アニメーション開始
    startAnimations();
    
    // スクロールイベントの設定
    setupScrollAnimation();
}

// スプラッシュスクリーンを表示
function showSplashScreen() {
    // sessionStorageでセッション中にすでに表示したかチェック
    if (sessionStorage.getItem('splashShown')) {
        const splashScreen = document.getElementById('splashScreen');
        if (splashScreen) {
            splashScreen.style.display = 'none';
        }
        document.body.classList.add('splash-complete');
        // iOS: splash-complete のタイミングで play を試行（ユーザー操作に近いタイミングのことが多い）
        document.getElementById('bgVideo')?.play().catch(function () {});
        return;
    }

    const splashScreen = document.getElementById('splashScreen');
    if (!splashScreen) {
        document.body.classList.add('splash-complete');
        document.getElementById('bgVideo')?.play().catch(function () {});
        return;
    }

    sessionStorage.setItem('splashShown', 'true');

    // iOS: スプラッシュのタップを「ユーザー操作」として play に利用（確実に再生できるよう最優先）
    const onSplashTap = function () {
        splashScreen.removeEventListener('touchstart', onSplashTap);
        splashScreen.removeEventListener('click', onSplashTap);
        document.getElementById('bgVideo')?.play().catch(function () {});
    };
    splashScreen.addEventListener('touchstart', onSplashTap, { once: true, passive: true });
    splashScreen.addEventListener('click', onSplashTap, { once: true });

    // 3秒後にフェードアウト
    setTimeout(() => {
        splashScreen.classList.add('hide');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            document.body.classList.add('splash-complete');
            document.getElementById('bgVideo')?.play().catch(function () {});
        }, 500);
    }, 3000);
}

// 商品データを取得
async function fetchProducts() {
    try {
        // products.jsonから読み込む
        const response = await fetch('/products.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        products = data.products || [];
        
        if (products.length === 0) {
            if (productsContainer) {
                productsContainer.innerHTML = '<p class="loading">商品が見つかりませんでした</p>';
            }
            return;
        }
        
        // displayProductsは引数を受け取らないので、呼び出しのみ
        displayProducts();
    } catch (error) {
        console.error('Failed to fetch product data:', error);
        if (productsContainer) {
            productsContainer.innerHTML = '<p class="loading">商品の読み込みに失敗しました。ページを再読み込みしてください。</p>';
        }
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    // サイドバートグル
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // カテゴリボタン
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            selectCategory(category);
        });
    });
    
    // カートアイコン
    if (cartIcon) {
        cartIcon.addEventListener('click', openCart);
    }
    
    // カートを閉じる
    if (cartClose) {
        cartClose.addEventListener('click', closeCart);
    }
    
    if (cartOverlay) {
        cartOverlay.addEventListener('click', closeCart);
    }
    
    // 決済ボタン
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', goToCheckout);
    }
    
    // メインコンテンツをクリックしたらサイドバーを閉じる
    if (mainContent) {
        mainContent.addEventListener('click', (e) => {
            // サイドバーが開いていて、サイドバー自体をクリックしていない場合
            if (sidebar && sidebar.classList.contains('active')) {
                // サイドバー内の要素をクリックした場合は閉じない
                if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
                    closeSidebar();
                }
            }
        });
    }
    
    // タッチイベントも同様に処理（モバイル対応）
    if (mainContent) {
        mainContent.addEventListener('touchstart', (e) => {
            if (sidebar && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
                    closeSidebar();
                }
            }
        });
    }
    
    // 商品コンテナをクリック/タップしたらサイドバーを閉じる
    if (productsContainer) {
        productsContainer.addEventListener('click', (e) => {
            // サイドバーが開いていて、サイドバー自体やトグルボタンをクリックしていない場合
            if (sidebar && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
                    closeSidebar();
                }
            }
        });
        
        // スマホ対応: タッチイベント（商品カード以外の部分のみ）
        productsContainer.addEventListener('touchstart', (e) => {
            if (sidebar && sidebar.classList.contains('active')) {
                // 商品カードをタップした場合は商品カードのイベントで処理するので、ここでは処理しない
                if (e.target.closest('.product-card')) {
                    return;
                }
                if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
                    closeSidebar();
                }
            }
        });
    }
    
    // 要素選択機能（開発モード） - キーボードショートカットで有効化
    setupElementSelection();
    
    // 商品詳細モーダルのイベントリスナー
    if (productModalOverlay) {
        productModalOverlay.addEventListener('click', closeProductDetail);
    }
    
    if (productModalClose) {
        productModalClose.addEventListener('click', closeProductDetail);
    }
    
    if (productDetailImage) {
        productDetailImage.addEventListener('click', () => {
            const url = productDetailImage.dataset.fullUrl || productDetailImage.src;
            if (url) openImageLightbox(url, productDetailImage.alt);
        });
    }
    
    if (productDetailAddCart) {
        productDetailAddCart.addEventListener('click', () => {
            if (currentDetailProduct) {
                const stock = currentSelectedSize ? currentSelectedSize.stock : currentDetailProduct.stock;
                if (stock <= 0) return;
                const productToAdd = currentSelectedSize 
                    ? { ...currentDetailProduct, price: currentSelectedSize.price, selectedSize: currentSelectedSize.name }
                    : currentDetailProduct;
                addToCart(productToAdd);
                closeProductDetail();
            }
        });
    }
    
    // ESCキーでライトボックスまたはモーダルを閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (productImageLightbox && productImageLightbox.classList.contains('active')) {
            closeImageLightbox();
        } else if (productModal && productModal.classList.contains('active')) {
            closeProductDetail();
        }
    });
}

// 要素選択機能の変数
let selectionModeActive = false;
let highlightDiv = null;
let currentElement = null;
let selectionHandlers = {
    mouseover: null,
    mouseout: null,
    click: null,
    touch: null,
    touchmove: null
};

// 要素選択機能をセットアップ
function setupElementSelection() {
    document.addEventListener('keydown', (e) => {
        // Ctrl + Shift + E または Cmd + Shift + E で要素選択モードをトグル
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifierKey = isMac ? e.metaKey : e.ctrlKey;
        
        if (modifierKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
            e.preventDefault();
            e.stopPropagation();
            
            if (selectionModeActive) {
                disableElementSelection();
            } else {
                enableElementSelection();
            }
        }
    });
    
}

// 要素選択機能を無効化
function disableElementSelection() {
    selectionModeActive = false;
    document.body.classList.remove('element-selection-mode');
    
    if (highlightDiv) {
        highlightDiv.style.display = 'none';
    }
    
    // 編集パネルを非表示
    const editPanel = document.getElementById('element-edit-panel');
    if (editPanel) {
        editPanel.style.display = 'none';
    }
    
    // イベントリスナーを削除
    if (selectionHandlers.mouseover) {
        document.removeEventListener('mouseover', selectionHandlers.mouseover, true);
        document.removeEventListener('mouseout', selectionHandlers.mouseout, true);
        document.removeEventListener('click', selectionHandlers.click, true);
        document.removeEventListener('touchend', selectionHandlers.touch, true);
        if (selectionHandlers.touchmove) {
            document.removeEventListener('touchmove', selectionHandlers.touchmove, true);
        }
        selectionHandlers.mouseover = null;
        selectionHandlers.mouseout = null;
        selectionHandlers.click = null;
        selectionHandlers.touch = null;
        selectionHandlers.touchmove = null;
    }
    
    // console.log('要素編集モードが無効になりました');
}

// 要素選択機能を有効化（編集可能）
function enableElementSelection() {
    if (selectionModeActive) return;
    
    selectionModeActive = true;
    document.body.classList.add('element-selection-mode');
    
    // ハイライト用のdivを作成
    if (!highlightDiv) {
        highlightDiv = document.createElement('div');
        highlightDiv.id = 'element-highlight';
        highlightDiv.style.cssText = `
            position: absolute;
            pointer-events: none;
            border: 2px solid #ffd700;
            background: rgba(255, 215, 0, 0.1);
            z-index: 10000;
            display: none;
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        `;
        document.body.appendChild(highlightDiv);
    }
    
    // 編集パネルを作成
    let editPanel = document.getElementById('element-edit-panel');
    if (!editPanel) {
        editPanel = document.createElement('div');
        editPanel.id = 'element-edit-panel';
        editPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(15, 35, 28, 0.95);
            border: 2px solid #ffd700;
            border-radius: 8px;
            padding: 1.5rem;
            z-index: 10001;
            min-width: 300px;
            display: none;
            color: #fff;
            font-family: 'Noto Sans JP', sans-serif;
        `;
        editPanel.innerHTML = `
            <h3 style="margin: 0 0 1rem 0; color: #ffd700;">要素編集</h3>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem;">テキスト:</label>
                <textarea id="edit-text" style="width: 100%; min-height: 60px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,215,0,0.3); border-radius: 4px; padding: 0.5rem; color: #fff; font-family: inherit;"></textarea>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button id="edit-save" style="flex: 1; background: #ffd700; color: #000; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer; font-weight: bold;">保存</button>
                <button id="edit-cancel" style="flex: 1; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,215,0,0.3); padding: 0.5rem; border-radius: 4px; cursor: pointer;">キャンセル</button>
            </div>
        `;
        document.body.appendChild(editPanel);
        
        // 保存ボタン
        document.getElementById('edit-save').addEventListener('click', () => {
            if (currentElement) {
                const newText = document.getElementById('edit-text').value;
                if (currentElement.textContent !== undefined) {
                    currentElement.textContent = newText;
                } else if (currentElement.innerHTML !== undefined) {
                    currentElement.innerHTML = newText;
                }
            }
            editPanel.style.display = 'none';
            disableElementSelection();
        });
        
        // キャンセルボタン
        document.getElementById('edit-cancel').addEventListener('click', () => {
            editPanel.style.display = 'none';
            disableElementSelection();
        });
    }
    
    // マウスオーバー/タッチで要素をハイライト
    selectionHandlers.mouseover = (e) => {
        if (!selectionModeActive) return;
        const target = e.target || e.currentTarget;
        if (target === highlightDiv || target === document.body || target === document.documentElement || target.closest('#element-edit-panel')) return;
        
        currentElement = target;
        const rect = currentElement.getBoundingClientRect();
        
        highlightDiv.style.display = 'block';
        highlightDiv.style.left = rect.left + window.scrollX + 'px';
        highlightDiv.style.top = rect.top + window.scrollY + 'px';
        highlightDiv.style.width = rect.width + 'px';
        highlightDiv.style.height = rect.height + 'px';
    };
    
    // タッチでハイライト
    const touchMoveHandler = (e) => {
        if (!selectionModeActive) return;
        const touch = e.touches[0];
        if (!touch) return;
        
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element !== highlightDiv && element !== document.body && element !== document.documentElement && !element.closest('#element-edit-panel')) {
            currentElement = element;
            const rect = currentElement.getBoundingClientRect();
            
            highlightDiv.style.display = 'block';
            highlightDiv.style.left = rect.left + window.scrollX + 'px';
            highlightDiv.style.top = rect.top + window.scrollY + 'px';
            highlightDiv.style.width = rect.width + 'px';
            highlightDiv.style.height = rect.height + 'px';
        }
    };
    
    document.addEventListener('touchmove', touchMoveHandler, true);
    selectionHandlers.touchmove = touchMoveHandler;
    
    // マウスアウトでハイライトを非表示
    selectionHandlers.mouseout = (e) => {
        if (!selectionModeActive) return;
        if (e.target !== currentElement || e.target.closest('#element-edit-panel')) return;
        if (highlightDiv) highlightDiv.style.display = 'none';
    };
    
    // クリックで要素を編集
    selectionHandlers.click = (e) => {
        if (!selectionModeActive) {
            // console.log('要素編集モードが無効です');
            return;
        }
        
        const target = e.target;
        if (target === highlightDiv || target.closest('#element-edit-panel')) {
            return;
        }
        
        // 編集可能な要素のみ処理
        if (target === document.body || target === document.documentElement || 
            target === highlightDiv || target.id === 'element-edit-panel') {
            return;
        }
        
        // console.log('要素をクリック:', target);
        e.preventDefault();
        e.stopPropagation();
        
        currentElement = target;
        
        // 編集パネルを表示
        const textArea = document.getElementById('edit-text');
        const currentText = target.textContent?.trim() || target.innerText?.trim() || target.value || target.alt || target.title || '';
        textArea.value = currentText;
        editPanel.style.display = 'block';
        
        // テキストエリアにフォーカス
        setTimeout(() => {
            textArea.focus();
            textArea.select();
        }, 100);
    };
    
    // タッチイベントハンドラー（タップで要素を編集）
    selectionHandlers.touch = (e) => {
        if (!selectionModeActive) return;
        
        const touch = e.changedTouches[0];
        if (!touch) return;
        
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (!element || element === highlightDiv || element.closest('#element-edit-panel') || 
            element === document.body || element === document.documentElement) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        currentElement = element;
        
        // 編集パネルを表示
        const textArea = document.getElementById('edit-text');
        const currentText = element.textContent?.trim() || element.innerText?.trim() || element.value || element.alt || '';
        textArea.value = currentText;
        editPanel.style.display = 'block';
        
        setTimeout(() => {
            textArea.focus();
            textArea.select();
        }, 100);
    };
    
    document.addEventListener('mouseover', selectionHandlers.mouseover, true);
    document.addEventListener('mouseout', selectionHandlers.mouseout, true);
    document.addEventListener('click', selectionHandlers.click, true);
    document.addEventListener('touchend', selectionHandlers.touch, true);
    
    // console.log('要素編集モードが有効になりました (Ctrl+Shift+E で無効化)');
}

/**
 * iOS 確実再生のため全面再構築。
 * - DOMContentLoaded で最初に実行し、fetch 待ちなしで load 開始
 * - video にインラインスタイルは一切付けない（CSS のみ）。error 時のみ display:none
 * - 複数タイミングで play(): loadeddata/canplay/canplaythrough、setTimeout 100/300/800/2000
 * - スプラッシュのタップ・splash-complete・setupIosVideoPlayOnInteraction とも連携
 * - iOS で 2.5 秒後も paused なら「タップして再生」オーバーレイを表示
 */
function initBackgroundVideo() {
    var video = document.getElementById('bgVideo');
    var container = document.getElementById('videoBackground');
    if (!video || !container) return;

    video.muted = true;
    video.volume = 0;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x5-playsinline', '');
    video.setAttribute('preload', 'auto');
    if (typeof video.disableRemotePlayback !== 'undefined') video.disableRemotePlayback = true;
    if (typeof video.disablePictureInPicture !== 'undefined') video.disablePictureInPicture = true;

    var fallbackTimeoutId;

    function clearFallback() {
        if (fallbackTimeoutId) { clearTimeout(fallbackTimeoutId); fallbackTimeoutId = null; }
    }

    function tryPlay() {
        video.play().catch(function () {});
    }

    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('canplaythrough', tryPlay);
    video.addEventListener('play', clearFallback);
    video.addEventListener('error', function onErr() {
        video.removeEventListener('error', onErr);
        container.classList.add('video-fallback-active');
        video.style.display = 'none';
    }, { once: true });

    video.load();

    fallbackTimeoutId = setTimeout(function () {
        if (container.classList.contains('video-fallback-active')) return;
        if (video.readyState >= 2) return;
        container.classList.add('video-fallback-active');
        video.style.display = 'none';
    }, 12000);

    [100, 300, 800, 2000].forEach(function (ms) {
        setTimeout(tryPlay, ms);
    });

    // iOS のみ: 2.5 秒後も止まっていれば「タップして再生」を表示（最終手段）
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        setTimeout(function () {
            if (container.classList.contains('video-fallback-active')) return;
            if (!video.paused) return;
            var ov = document.createElement('div');
            ov.id = 'ios-tap-to-play';
            ov.setAttribute('aria-label', 'タップして再生');
            ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.1rem;font-family:inherit;';
            ov.textContent = 'タップして再生';
            document.body.appendChild(ov);
            function done() {
                ov.remove();
                tryPlay();
            }
            ov.addEventListener('touchstart', done, { once: true });
            ov.addEventListener('click', done, { once: true });
        }, 2500);
    }
}

// アニメーション開始
function startAnimations() {
    // ロゴのアニメーション
    if (logoLink) {
        setTimeout(() => {
            logoLink.style.opacity = '1';
        }, 500);
    }
    
    // ヒーローセクションのアニメーション
    if (heroSection) {
        const heroTitle = heroSection.querySelector('.hero-title');
        const heroSubtitle = heroSection.querySelector('.hero-subtitle');
        
        if (heroTitle) {
            setTimeout(() => {
                heroTitle.style.opacity = '1';
            }, 800);
        }
        
        if (heroSubtitle) {
            setTimeout(() => {
                heroSubtitle.style.opacity = '1';
            }, 1200);
        }
    }
    
}

// スクロールアニメーションの設定
function setupScrollAnimation() {
    const heroSection = document.getElementById('heroSection');
    const productsSection = document.querySelector('.products-section');
    
    if (!heroSection || !productsSection) return;
    
    let ticking = false;
    
    function handleScroll() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY || window.pageYOffset;
                const windowHeight = window.innerHeight;
                const heroHeight = heroSection.offsetHeight;
                
                // シンプルなフェード遷移（グラデーションなし）
                const fadeStartPoint = windowHeight * 0.3;
                const fadeEndPoint = windowHeight * 0.7;
                
                // Hero section を段階的にフェードアウト
                if (scrollY > fadeStartPoint) {
                    const fadeProgress = Math.min((scrollY - fadeStartPoint) / (fadeEndPoint - fadeStartPoint), 1);
                    heroSection.style.opacity = 1 - fadeProgress;
                    heroSection.style.transform = `translateY(${fadeProgress * 10}px)`;
                } else {
                    heroSection.style.opacity = 1;
                    heroSection.style.transform = 'translateY(0)';
                }
                
                // Products section を早めにフェードイン（最初の商品が見やすく）
                const productsFadeStart = windowHeight * 0.4;
                const productsFadeEnd = windowHeight * 0.75;
                
                if (scrollY > productsFadeStart) {
                    const productsFadeProgress = Math.min((scrollY - productsFadeStart) / (productsFadeEnd - productsFadeStart), 1);
                    productsSection.style.opacity = productsFadeProgress;
                    productsSection.style.transform = `translateY(${(1 - productsFadeProgress) * 10}px)`;
                } else {
                    productsSection.style.opacity = 0;
                    productsSection.style.transform = 'translateY(10px)';
                }
                
                ticking = false;
            });
            
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // 初回チェック
    handleScroll();
}

// サイドバーの開閉
function toggleSidebar() {
    if (sidebar) {
        const wasActive = sidebar.classList.contains('active');
        sidebar.classList.toggle('active');
        const isActive = sidebar.classList.contains('active');
        // デスクトップ用: bodyにクラスを追加してメインコンテンツのマージンを制御
        document.body.classList.toggle('sidebar-open', isActive);
        // サイドバーを開いた時だけ商品一覧タイトルが見える位置までスクロール
        if (isActive && !wasActive) {
            setTimeout(() => {
                const productsSectionTitle = document.getElementById('productsSectionTitle');
                if (productsSectionTitle) {
                    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                    const titlePosition = productsSectionTitle.getBoundingClientRect().top + window.pageYOffset;
                    const scrollPosition = titlePosition - headerHeight - 20; // 20pxの余白
                    window.scrollTo({
                        top: Math.max(0, scrollPosition),
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    }
}

// サイドバーを閉じる
function closeSidebar() {
    if (sidebar) {
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }
}

// カテゴリ名を表示用ラベルに変換
const categoryLabels = { all: 'All', bracelet: 'Bracelet', necklace: 'Necklace', earrings: 'Earrings' };

function updateProductsSectionTitle() {
    const el = document.getElementById('productsSectionTitle');
    if (el) el.textContent = categoryLabels[currentCategory] || 'All';
}

// カテゴリ選択
function selectCategory(category) {
    currentCategory = category;
    
    // ボタンのアクティブ状態を更新
    categoryButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    // セクション上部のタイトルを更新（All または選択カテゴリ）
    updateProductsSectionTitle();
    
    // サイドバーを閉じる（全画面サイズ）
    closeSidebar();
    
    // 商品を再表示
    displayProducts();
    
    // 商品一覧セクションのタイトルが見えるようにスクロール
    setTimeout(() => {
        const productsSectionTitle = document.getElementById('productsSectionTitle');
        if (productsSectionTitle) {
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const titlePosition = productsSectionTitle.getBoundingClientRect().top + window.pageYOffset;
            const scrollPosition = titlePosition - headerHeight - 20; // 20pxの余白
            window.scrollTo({
                top: Math.max(0, scrollPosition),
                behavior: 'smooth'
            });
        }
    }, 100);
}

// 商品を表示（選択カテゴリに応じて All / Earrings / Necklace / Bracelet のいずれかで表示）
function displayProducts() {
    if (!productsContainer) return;
    
    updateProductsSectionTitle();
    
    // フィルタリング
    const filteredProducts = currentCategory === 'all' 
        ? products 
        : products.filter(p => p.category === currentCategory);
    
    if (filteredProducts.length === 0) {
        productsContainer.innerHTML = '<p class="loading">商品が見つかりません</p>';
        return;
    }
    
    // 既存の商品カードをフェードアウト（アニメーションを防ぐため）
    const existingCards = productsContainer.querySelectorAll('.product-card');
    if (existingCards.length > 0) {
        // 2回目以降の表示
        displayProductsCallCount++;
        productsContainer.style.opacity = '0';
        setTimeout(() => {
            // 商品カードを生成（アニメーションなし）
            productsContainer.innerHTML = filteredProducts.map((product, index) => {
                return createProductCard(product, index);
            }).join('');
            productsContainer.style.opacity = '1';
            attachProductCardListeners();
        }, 150);
    } else {
        // 初回表示時のみアニメーションあり
        displayProductsCallCount = 0;
        productsContainer.innerHTML = filteredProducts.map((product, index) => {
            return createProductCard(product, index);
        }).join('');
        attachProductCardListeners();
        displayProductsCallCount = 1; // 次回からはアニメーションなし
    }
}

// 商品カードのイベントリスナーを設定（重複を防ぐため別関数に）
function attachProductCardListeners() {
    // コンテナ内の全ての.product-cardを取得（横スライド形式でもグリッド形式でも対応）
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach((card) => {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        let isScrolling = false;
        
        // 商品カードをクリック/タップした時の処理
        const handleCardInteraction = (e) => {
            // カート追加ボタンをクリック/タップした場合は詳細表示しない
            if (e.target.closest('.add-to-cart-btn')) {
                return;
            }
            // サイドバーが開いている場合は、サイドバーを閉じるだけにして商品詳細は開かない
            if (sidebar && sidebar.classList.contains('active')) {
                closeSidebar();
                e.stopPropagation();
                e.preventDefault();
                return;
            }
            // スクロール中は商品詳細を開かない
            if (isScrolling) {
                return;
            }
            const productId = card.dataset.productId;
            const product = products.find(p => p.id === productId);
            if (product) {
                showProductDetail(product);
            }
        };
        
        // タッチ開始（スマホ）
        card.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isScrolling = false;
        }, { passive: true });
        
        // タッチ移動（スクロール検知）
        card.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - touchStartX);
            const deltaY = Math.abs(touch.clientY - touchStartY);
            // 5px以上移動したらスクロールとみなす
            if (deltaX > 5 || deltaY > 5) {
                isScrolling = true;
            }
        }, { passive: true });
        
        // タッチ終了（スマホ）
        card.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - touchStartTime;
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - touchStartX);
            const deltaY = Math.abs(touch.clientY - touchStartY);
            
            // スクロールでない、かつ短時間のタップの場合のみ商品詳細を開く
            if (!isScrolling && touchDuration < 300 && deltaX < 10 && deltaY < 10) {
                handleCardInteraction(e);
            }
            isScrolling = false;
        }, { passive: false });
        
        // クリックイベント（デスクトップ）
        card.addEventListener('click', handleCardInteraction);
        
        // カーソルをポインターに変更
        card.style.cursor = 'pointer';
    });
    
    // カート追加ボタンのイベントリスナーを設定
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // カードクリックイベントの伝播を防ぐ
            const productId = btn.dataset.productId;
            const product = products.find(p => p.id === productId);
            if (product) {
                // サイズがある商品の場合は商品詳細モーダルを開く
                if (product.sizes && product.sizes.length > 0) {
                    showProductDetail(product);
                } else {
                    // サイズがない商品の場合は直接カートに追加
                    addToCart(product);
                }
            }
        });
    });
}

// 商品を表示した回数を追跡
let displayProductsCallCount = 0;

// スクロール位置を保存する変数
let savedScrollPosition = 0;

// 商品カードの生成
function createProductCard(product, index) {
    // 初回のみアニメーション遅延を適用、2回目以降は即座に表示
    const delay = displayProductsCallCount === 0 ? index * 0.1 : 0;
    const animationStyle = displayProductsCallCount === 0 
        ? `animation: fadeInUp 0.6s ease ${delay}s forwards;` 
        : `opacity: 1; animation: none;`;
    
    // 画像URLが無効な場合（via.placeholder.comなど）は画像を表示しないが、スペースは確保
    const imageUrl = product.image || '';
    // 空文字列やplaceholder.comを含むURLは無効とみなす
    const shouldShowImage = imageUrl && 
                          imageUrl.trim() !== '' && 
                          !imageUrl.includes('via.placeholder.com') && 
                          !imageUrl.includes('placeholder.com');
    
    const imageHtml = shouldShowImage 
        ? `<img src="${imageUrl}" alt="${product.name}" class="product-image" onerror="this.style.display='none'; this.onerror=null;">`
        : '<div class="product-image product-image-placeholder"></div>';
    const captionHtml = '';
    
    // 在庫チェック（サイズがある場合はすべてのサイズの在庫を確認）
    let isSoldOut = false;
    if (product.sizes && product.sizes.length > 0) {
        isSoldOut = product.sizes.every(size => (size.stock || 0) <= 0);
    } else {
        isSoldOut = (product.stock || 0) <= 0;
    }
    
    // カートに入っている商品の個数を確認（同じ商品の異なるサイズも合計）
    const cartItemsForProduct = cart.filter(item => item.id === product.id);
    const cartQuantity = cartItemsForProduct.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadgeHtml = cartQuantity > 0 ? `<span class="product-cart-badge">${cartQuantity}</span>` : '';
    
    const soldOutBadge = isSoldOut ? '<span class="product-soldout-badge">売り切れ</span>' : '';
    const soldOutClass = isSoldOut ? 'product-card-soldout' : '';
    
    return `
        <div class="product-card ${soldOutClass}" style="${animationStyle}" data-product-id="${product.id}">
            <div class="product-card-image-wrap">
                ${imageHtml}
                ${captionHtml}
            </div>
            ${soldOutBadge}
            ${cartBadgeHtml}
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-footer">
                    <div class="product-price-wrapper">
                        ${product.originalPrice && product.originalPrice > product.price 
                            ? `<span class="product-original-price">¥${product.originalPrice.toLocaleString()}</span>` 
                            : ''}
                        <span class="product-price">¥${product.price.toLocaleString()}</span>
                    </div>
                    <button class="add-to-cart-btn" data-product-id="${product.id}" aria-label="カートに追加">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 商品詳細を表示
function showProductDetail(product) {
    if (!productModal || !product) return;
    
    // 現在のスクロール位置を保存
    savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    currentDetailProduct = product;
    currentDetailImageIndex = 0;
    currentSelectedSize = null;
    
    // 画像の設定（複数画像対応）。{ url, caption } または url 文字列の配列に対応
    const rawImages = product.images && product.images.length > 0 
        ? product.images 
        : [product.image];
    const normalized = rawImages.map(item => {
        if (typeof item === 'object' && item !== null && item.url) {
            return { url: item.url, caption: item.caption || '' };
        }
        return { url: item, caption: '' };
    }).filter(item => item.url && !item.url.includes('via.placeholder.com') && !item.url.includes('placeholder.com'));
    const images = normalized.map(n => n.url);
    currentDetailImageCaptions = normalized.map(n => n.caption || '');
    
    updateProductImages(images, currentDetailImageCaptions);
    
    // 商品情報を設定
    if (productDetailName) {
        productDetailName.textContent = product.name;
    }
    
    // 説明文は非表示
    if (productDetailDescription) {
        productDetailDescription.style.display = 'none';
    }
    
    // 詳細説明を表示（products.json の detailedDescription）
    if (productDetailDetailedDescription) {
        const text = product.detailedDescription || '';
        if (text) {
            productDetailDetailedDescription.innerHTML = text.replace(/\n/g, '<br>');
            productDetailDetailedDescription.style.display = 'block';
        } else {
            productDetailDetailedDescription.textContent = '';
            productDetailDetailedDescription.style.display = 'none';
        }
    }
    
    // サイズ選択の設定（インチがある商品のみサイズ欄を表示）
    const hasInchSizes = product.sizes && product.sizes.length > 0 && product.sizes.some(s => (s.name || '').includes('インチ'));
    if (hasInchSizes) {
        renderSizeOptions(product.sizes);
        if (productDetailSizeSection) {
            productDetailSizeSection.style.display = 'block';
        }
    } else {
        if (productDetailSizeSection) {
            productDetailSizeSection.style.display = 'none';
        }
    }
    
    updateProductPrice(product);
    updateProductStock(product);
    
    // モーダルを表示
    productModal.classList.add('active');
    // スクロールを無効化（モバイル対応）
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollPosition}px`;
    document.body.style.width = '100%';
}

// ライトボックスを開く（画像タップで元画像を表示）
function openImageLightbox(imageUrl, alt) {
    if (!productImageLightbox || !productImageLightboxImg) return;
    productImageLightboxImg.src = imageUrl;
    productImageLightboxImg.alt = alt || '';
    productImageLightbox.setAttribute('aria-hidden', 'false');
    productImageLightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeImageLightbox() {
    if (!productImageLightbox) return;
    productImageLightbox.classList.remove('active');
    productImageLightbox.setAttribute('aria-hidden', 'true');
    if (!productModal || !productModal.classList.contains('active')) {
        document.body.style.overflow = '';
    }
}

// 商品画像を更新：1枚表示＋サムネイル、クリックでライトボックス
function updateProductImages(images, captions) {
    if (!productDetailImage || !productImageThumbnails || images.length === 0) return;
    
    const validImages = images.filter(img => img && !img.includes('via.placeholder.com') && !img.includes('placeholder.com'));
    const validCaptions = (captions && captions.length >= validImages.length) ? captions.slice(0, validImages.length) : validImages.map(() => '');
    
    if (validImages.length === 0) {
        if (productDetailImageMain) productDetailImageMain.style.display = 'none';
        return;
    }
    if (productDetailImageMain) productDetailImageMain.style.display = 'flex';
    
    currentDetailImageIndex = 0;
    
    function setMainImage(index) {
        currentDetailImageIndex = index;
        const url = validImages[index];
        productDetailImage.src = url;
        productDetailImage.alt = (currentDetailProduct?.name || '') + ' ' + (index + 1);
        productDetailImage.dataset.fullUrl = url;
        productDetailImage.onerror = function() { this.style.display = 'none'; this.onerror = null; };
        const thumbnails = productImageThumbnails.querySelectorAll('.product-image-thumbnail');
        thumbnails.forEach((t, i) => t.classList.toggle('active', i === index));
    }
    
    productDetailImage.src = validImages[0];
    productDetailImage.alt = (currentDetailProduct?.name || '') + ' 1';
    productDetailImage.dataset.fullUrl = validImages[0];
    productDetailImage.style.display = '';
    productDetailImage.onerror = function() { this.style.display = 'none'; this.onerror = null; };
    
    productImageThumbnails.innerHTML = validImages.map((img, index) => `
        <div class="product-image-thumbnail ${index === 0 ? 'active' : ''}" data-image-index="${index}" role="tab">
            <img src="${img}" alt="" onerror="this.style.display='none'; this.onerror=null;">
        </div>
    `).join('');
    
    const thumbnails = productImageThumbnails.querySelectorAll('.product-image-thumbnail');
    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', () => setMainImage(index));
    });
    
    if (productImagePrev) {
        productImagePrev.style.display = validImages.length > 1 ? 'flex' : 'none';
        productImagePrev.onclick = () => setMainImage((currentDetailImageIndex - 1 + validImages.length) % validImages.length);
    }
    if (productImageNext) {
        productImageNext.style.display = validImages.length > 1 ? 'flex' : 'none';
        productImageNext.onclick = () => setMainImage((currentDetailImageIndex + 1) % validImages.length);
    }
    
    // スマホでスワイプできるようにする（完璧な実装）
    if (productDetailImageMain && validImages.length > 1) {
        // 既存のイベントリスナーを削除（重複を防ぐ）
        if (swipeHandlersAttached && productDetailImageMain) {
            if (swipeHandlers.touchstart) {
                productDetailImageMain.removeEventListener('touchstart', swipeHandlers.touchstart);
            }
            if (swipeHandlers.touchmove) {
                productDetailImageMain.removeEventListener('touchmove', swipeHandlers.touchmove);
            }
            if (swipeHandlers.touchend) {
                productDetailImageMain.removeEventListener('touchend', swipeHandlers.touchend);
            }
            if (swipeHandlers.touchcancel) {
                productDetailImageMain.removeEventListener('touchcancel', swipeHandlers.touchcancel);
            }
        }
        
        // スワイプ状態を管理する変数
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        let isSwiping = false;
        let hasMoved = false;
        
        // touchstart: タッチ開始
        swipeHandlers.touchstart = (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                isSwiping = false;
                hasMoved = false;
            }
        };
        
        // touchmove: スワイプ中（画像クリックを防ぐ）
        swipeHandlers.touchmove = (e) => {
            if (e.touches.length === 1) {
                const currentX = e.touches[0].clientX;
                const currentY = e.touches[0].clientY;
                const deltaX = Math.abs(currentX - touchStartX);
                const deltaY = Math.abs(currentY - touchStartY);
                
                // 横方向の移動が縦方向より大きい場合、スワイプと判定
                if (deltaX > 10 && deltaX > deltaY) {
                    hasMoved = true;
                    isSwiping = true;
                    // スワイプ中は画像クリックイベントを無効化
                    if (productDetailImage) {
                        productDetailImage.style.pointerEvents = 'none';
                    }
                }
            }
        };
        
        // touchend: タッチ終了
        swipeHandlers.touchend = (e) => {
            if (e.changedTouches.length === 1 && hasMoved) {
                touchEndX = e.changedTouches[0].clientX;
                touchEndY = e.changedTouches[0].clientY;
                
                const deltaX = touchStartX - touchEndX;
                const deltaY = Math.abs(touchStartY - touchEndY);
                const swipeThreshold = 50; // 最小スワイプ距離
                
                // 横方向の移動が縦方向より大きく、閾値を超えた場合のみスワイプ処理
                if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > deltaY) {
                    e.preventDefault(); // 画像クリックを防ぐ
                    e.stopPropagation(); // イベント伝播を停止
                    
                    if (deltaX > 0) {
                        // 左にスワイプ（次の画像）
                        setMainImage((currentDetailImageIndex + 1) % validImages.length);
                    } else {
                        // 右にスワイプ（前の画像）
                        setMainImage((currentDetailImageIndex - 1 + validImages.length) % validImages.length);
                    }
                }
            }
            
            // スワイプ終了後、画像クリックを再有効化
            setTimeout(() => {
                if (productDetailImage) {
                    productDetailImage.style.pointerEvents = '';
                }
                isSwiping = false;
                hasMoved = false;
            }, 100);
        };
        
        // touchcancel: タッチキャンセル
        swipeHandlers.touchcancel = () => {
            if (productDetailImage) {
                productDetailImage.style.pointerEvents = '';
            }
            isSwiping = false;
            hasMoved = false;
        };
        
        // イベントリスナーを追加
        productDetailImageMain.addEventListener('touchstart', swipeHandlers.touchstart, { passive: true });
        productDetailImageMain.addEventListener('touchmove', swipeHandlers.touchmove, { passive: true });
        productDetailImageMain.addEventListener('touchend', swipeHandlers.touchend, { passive: false });
        productDetailImageMain.addEventListener('touchcancel', swipeHandlers.touchcancel, { passive: true });
        
        swipeHandlersAttached = true;
    } else {
        swipeHandlersAttached = false;
    }
}

// ライトボックス用イベント
if (productImageLightbox) {
    productImageLightbox.addEventListener('click', (e) => {
        if (e.target === productImageLightbox || e.target === productImageLightboxClose) closeImageLightbox();
    });
}
if (productImageLightboxClose) {
    productImageLightboxClose.addEventListener('click', closeImageLightbox);
}

// サイズ名を「mm」と「インチ」に分割（例: "2mm · 16インチ" → { mm: "2mm", in: "16インチ" }）
function parseSizeName(name) {
    const sep = name.indexOf(' · ');
    if (sep >= 0) {
        return { mm: name.slice(0, sep).trim(), in: name.slice(sep + 3).trim() };
    }
    const mmMatch = name.match(/(\d+(?:\.\d+)?mm)/i);
    if (mmMatch) return { mm: mmMatch[1], in: name.replace(mmMatch[1], '').trim() || '—' };
    return { mm: name, in: '' };
}

// 表示用サイズ名（インチがある場合はインチのみ表記）
function getDisplaySizeName(name) {
    if (!name) return '';
    const { in: inLabel } = parseSizeName(name);
    if (inLabel && inLabel !== '—') return inLabel;
    return name;
}

// サイズ選択オプションをレンダリング（インチあり商品のみ呼ばれる。表記はインチのみ）
function renderSizeOptions(sizes) {
    if (!productDetailSizes) return;
    
    // mmごとにグループ化（例: 2mm, 3mm, 4mm）
    const groups = new Map();
    sizes.forEach((size, index) => {
        const { mm } = parseSizeName(size.name);
        if (!groups.has(mm)) groups.set(mm, []);
        groups.set(mm, [...groups.get(mm), { size, index }]);
    });
    
    const groupOrder = ['2mm', '3mm', '4mm'];
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
        const i = groupOrder.indexOf(a[0]);
        const j = groupOrder.indexOf(b[0]);
        if (i >= 0 && j >= 0) return i - j;
        if (i >= 0) return -1;
        if (j >= 0) return 1;
        return a[0].localeCompare(b[0]);
    });
    
    let html = '';
    sortedGroups.forEach(([mmLabel, items]) => {
        const optionsHtml = items.map(({ size, index }) => {
            const { in: inLabel } = parseSizeName(size.name);
            const displayLabel = (inLabel && inLabel !== '—') ? inLabel : size.name;
            const hasOriginalPrice = size.originalPrice && size.originalPrice > size.price;
            const stock = size.stock || 0;
            const stockHtml = ''; // ネックレスとブレスレットの在庫表示を削除
            const priceHtml = size.price !== currentDetailProduct?.price || hasOriginalPrice
                ? `<div class="product-size-price-wrapper">
                    ${hasOriginalPrice ? `<span class="product-size-original-price">¥${size.originalPrice.toLocaleString()}</span>` : ''}
                    <span class="product-size-price">¥${size.price.toLocaleString()}</span>
                   </div>`
                : '';
            return `
            <div class="product-size-option" 
                 data-size-index="${index}" 
                 data-size-price="${size.price}"
                 data-size-stock="${size.stock}">
                <span class="product-size-name">${displayLabel}</span>
                ${priceHtml}
                ${stockHtml}
            </div>`;
        }).join('');
        html += `<div class="product-size-group"><span class="product-size-group-label">${mmLabel}</span><div class="product-size-group-options">${optionsHtml}</div></div>`;
    });
    
    productDetailSizes.innerHTML = html;
    
    const sizeOptions = productDetailSizes.querySelectorAll('.product-size-option');
    sizeOptions.forEach((option) => {
        const index = parseInt(option.dataset.sizeIndex, 10);
        option.addEventListener('click', () => {
            sizeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            currentSelectedSize = sizes[index];
            updateProductPrice(currentDetailProduct, sizes[index]);
            updateProductStock(currentDetailProduct, sizes[index]);
        });
    });
    
    if (sizes.length > 0) {
        sizeOptions[0]?.classList.add('active');
        currentSelectedSize = sizes[0];
        updateProductPrice(currentDetailProduct, sizes[0]);
        updateProductStock(currentDetailProduct, sizes[0]);
    }
}

// 商品価格を更新
function updateProductPrice(product, selectedSize = null) {
    if (!productDetailPrice) return;
    
    const price = selectedSize ? selectedSize.price : product.price;
    const originalPrice = selectedSize ? (selectedSize.originalPrice || null) : (product.originalPrice || null);
    
    if (originalPrice && originalPrice > price) {
        productDetailPrice.innerHTML = `
            <span class="product-detail-original-price">¥${originalPrice.toLocaleString()}</span>
            <span class="product-detail-sale-badge">発売記念SALE</span>
            <span class="product-detail-sale-price">¥${price.toLocaleString()}</span>
        `;
    } else {
        productDetailPrice.innerHTML = `<span class="product-detail-sale-price">¥${price.toLocaleString()}</span>`;
    }
}

// 商品在庫を更新
function updateProductStock(product, selectedSize = null) {
    if (!productDetailStock) return;
    
    const stock = selectedSize ? selectedSize.stock : product.stock;
    let stockText = '';
    let stockColor = '';
    
    if (stock > 0) {
        stockText = '在庫あり';
        stockColor = 'rgba(255, 255, 255, 0.8)';
    } else {
        stockText = '売り切れ';
        stockColor = 'rgba(255, 68, 68, 0.9)';
    }
    
    productDetailStock.innerHTML = stockText;
    productDetailStock.style.color = stockColor;
    
    if (productDetailAddCart) {
        if (stock <= 0) {
            productDetailAddCart.disabled = true;
            productDetailAddCart.style.opacity = '0.4';
            productDetailAddCart.style.cursor = 'not-allowed';
            productDetailAddCart.textContent = '売り切れ';
        } else {
            productDetailAddCart.disabled = false;
            productDetailAddCart.style.opacity = '1';
            productDetailAddCart.style.cursor = 'pointer';
            productDetailAddCart.textContent = 'カートに追加';
        }
    }
}

// 商品詳細を閉じる
function closeProductDetail() {
    if (!productModal) return;
    closeImageLightbox();
    productModal.classList.remove('active');
    // スクロールを再有効化（モバイル対応）
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    // スクロール位置を復元
    window.scrollTo(0, savedScrollPosition);
    currentDetailProduct = null;
}

// カートに追加
function addToCart(product) {
    // サイズ情報を取得（selectedSizeがあれば使用、なければnull）
    const sizeName = product.selectedSize || product.size_name || null;
    
    // 商品IDとサイズ名の組み合わせで一意のキーを生成
    const cartKey = sizeName ? `${product.id}_${sizeName}` : product.id;
    
    // 同じ商品かつ同じサイズのアイテムを検索
    const existingItem = cart.find(item => {
        const itemSizeName = item.size_name || null;
        const itemCartKey = itemSizeName ? `${item.id}_${itemSizeName}` : item.id;
        return itemCartKey === cartKey;
    });
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        // カートに追加する際に、無効な画像URLは保存しない
        const imageUrl = product.image || '';
        const validImage = imageUrl && !imageUrl.includes('via.placeholder.com') && !imageUrl.includes('placeholder.com') 
            ? imageUrl 
            : '';
        
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: validImage,
            quantity: 1,
            size_name: sizeName || undefined
        });
    }
    
    saveCart();
    updateCartUI();
    
    // カートパネルを開く（モバイル用）
    if (window.innerWidth <= 768) {
        openCart();
    }
}

// カートから削除
function removeFromCart(cartKey) {
    // cartKeyは商品IDまたは商品ID_サイズ名の形式
    cart = cart.filter(item => {
        const itemSizeName = item.size_name || null;
        const itemCartKey = itemSizeName ? `${item.id}_${itemSizeName}` : item.id;
        return itemCartKey !== cartKey;
    });
    saveCart();
    updateCartUI();
    renderCartItems();
}

// 数量を更新
function updateQuantity(cartKey, change) {
    // cartKeyは商品IDまたは商品ID_サイズ名の形式
    const item = cart.find(item => {
        const itemSizeName = item.size_name || null;
        const itemCartKey = itemSizeName ? `${item.id}_${itemSizeName}` : item.id;
        return itemCartKey === cartKey;
    });
    
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(cartKey);
        } else {
            saveCart();
            updateCartUI();
            renderCartItems();
        }
    }
}

// カートを保存
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// カートを読み込み
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    updateCartUI();
}

// カートUIを更新
function updateCartUI() {
    // バッジを更新
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    // 合計金額を更新
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotal) {
        cartTotal.textContent = `¥${total.toLocaleString()}`;
    }
    
    // 決済ボタンの有効/無効
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
    }
    
    // カートアイテムを再描画
    renderCartItems();
    
    // 商品一覧のカートバッジを更新
    updateProductCartBadges();
}

// 商品一覧のカートバッジを更新
function updateProductCartBadges() {
    if (!productsContainer) return;
    
    const productCards = productsContainer.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const productId = card.dataset.productId;
        
        // 同じ商品IDのすべてのカートアイテム（異なるサイズ含む）の数量を合計
        const cartItemsForProduct = cart.filter(item => item.id === productId);
        const cartQuantity = cartItemsForProduct.reduce((sum, item) => sum + item.quantity, 0);
        
        // 既存のカートバッジを削除
        const existingBadge = card.querySelector('.product-cart-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // カートに入っている場合はバッジを追加
        if (cartQuantity > 0) {
            const badge = document.createElement('span');
            badge.className = 'product-cart-badge';
            badge.textContent = cartQuantity.toString();
            card.appendChild(badge);
        }
    });
}

// カートアイテムを描画
function renderCartItems() {
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="cart-empty">カートは空です</p>';
        return;
    }
    
    cartItems.innerHTML = cart.map(item => {
        // 画像URLが無効な場合（via.placeholder.comなど）は画像を表示しない
        const imageUrl = item.image || '';
        const shouldShowImage = imageUrl && !imageUrl.includes('via.placeholder.com') && !imageUrl.includes('placeholder.com');
        const imageHtml = shouldShowImage 
            ? `<img src="${imageUrl}" alt="${item.name}" class="cart-item-image" onerror="this.style.display='none'; this.onerror=null;">`
            : '';
        
        // 商品データを取得して詳細表示に遷移できるようにする
        const product = products.find(p => p.id === item.id);
        
        // カートキーを生成（商品IDとサイズ名の組み合わせ）
        const itemSizeName = item.size_name || null;
        const cartKey = itemSizeName ? `${item.id}_${itemSizeName}` : item.id;
        
        return `
            <div class="cart-item" data-cart-product-id="${item.id}" data-cart-key="${cartKey}" style="cursor: pointer;">
                ${imageHtml}
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.name}</h4>
                    ${item.size_name && getDisplaySizeName(item.size_name) ? `<p class="cart-item-size">サイズ: ${getDisplaySizeName(item.size_name)}</p>` : ''}
                    <p class="cart-item-price">¥${(item.price * item.quantity).toLocaleString()}</p>
                    <div class="cart-item-quantity" onclick="event.stopPropagation();">
                        <button class="quantity-btn" onclick="updateQuantity('${cartKey}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity('${cartKey}', 1)">+</button>
                    </div>
                    <button class="cart-item-remove" onclick="event.stopPropagation(); removeFromCart('${cartKey}')" aria-label="削除">×</button>
                </div>
            </div>
        `;
    }).join('');
    
    // カートアイテムのクリックイベントを設定
    const cartItemElements = cartItems.querySelectorAll('.cart-item');
    cartItemElements.forEach(cartItem => {
        cartItem.addEventListener('click', (e) => {
            // 数量変更ボタンや削除ボタンをクリックした場合は詳細表示しない
            if (e.target.closest('.quantity-btn') || e.target.closest('.cart-item-remove')) {
                return;
            }
            
            const productId = cartItem.dataset.cartProductId;
            const product = products.find(p => p.id === productId);
            if (product) {
                closeCart();
                showProductDetail(product);
            }
        });
    });
}

// カートを開く
function openCart() {
    renderCartItems();
    if (cartPanel) cartPanel.classList.add('active');
    if (cartOverlay) cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// カートを閉じる
function closeCart() {
    if (cartPanel) cartPanel.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// 決済ページに遷移
function goToCheckout() {
    if (cart.length === 0) return;
    window.location.href = '/checkout.html';
}

// グローバル関数として公開（HTMLから呼び出し可能にするため）
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;

