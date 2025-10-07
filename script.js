 <script>
        // Firebase Configuration
        const firebaseConfig = {
            apiKey: "AIzaSyDVSA8ip1vBTs_HFZGkXAPct0v-gU6CzG0",
            authDomain: "testingpp-935bc.firebaseapp.com",
            databaseURL: "https://testingpp-935bc-default-rtdb.firebaseio.com",
            projectId: "testingpp-935bc",
            storageBucket: "testingpp-935bc.firebasestorage.app",
            messagingSenderId: "303082886262",
            appId: "1:303082886262:web:0be011a2659985c3a1bb57",
            measurementId: "G-TVG8YCF2N1"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        // Telegram Web App
        const tg = window.Telegram.WebApp;
        let userData = null;
        let allTransactions = [];
        let filteredTransactions = [];

        // Initialize Telegram Web App
        tg.expand();
        tg.ready();

        // DOM Elements
        const themeToggle = document.getElementById('themeToggle');
        const transferBtn = document.getElementById('transferBtn');
        const depositBtn = document.getElementById('depositBtn');
        const withdrawBtn = document.getElementById('withdrawBtn');
        const transferModal = document.getElementById('transferModal');
        const closeTransferModal = document.getElementById('closeTransferModal');
        const transferFriendBtn = document.getElementById('transferFriendBtn');
        const transferAgentBtn = document.getElementById('transferAgentBtn');
        const balanceAmount = document.getElementById('balanceAmount');
        const totalEarning = document.getElementById('totalEarning');
        const totalWithdraw = document.getElementById('totalWithdraw');
        const transactionsList = document.getElementById('transactionsList');
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const transactionModal = document.getElementById('transactionModal');
        const closeTransactionModal = document.getElementById('closeTransactionModal');
        const copyTransactionId = document.getElementById('copyTransactionId');
        const searchInput = document.getElementById('searchInput');
        const dateFilterBtn = document.getElementById('dateFilterBtn');
        const dateFilterModal = document.getElementById('dateFilterModal');
        const closeDateFilterModal = document.getElementById('closeDateFilterModal');
        const dateOptionBtns = document.querySelectorAll('.date-option-btn');
        const customDateInput = document.getElementById('customDateInput');
        const applyDateFilter = document.getElementById('applyDateFilter');

        // Get user data from Telegram and initialize
        if (tg.initDataUnsafe.user) {
            userData = tg.initDataUnsafe.user;
            saveUserProfile(userData);
            updateUserProfile(userData);
            loadUserData(userData.id);
        } else {
            // Fallback for development
            userData = {
                id: 123456789,
                first_name: "Demo",
                last_name: "User",
                username: "demo_user",
                photo_url: null
            };
            saveUserProfile(userData);
            updateUserProfile(userData);
            loadUserData(userData.id);
        }

        // ১. প্রোফাইল সেভ এবং আপডেট ফাংশন
        function saveUserProfile(user) {
            const userRef = db.collection('users').doc(user.id.toString());
            
            const userData = {
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                username: user.username || '',
                photoUrl: user.photo_url || '',
                joinDate: new Date(),
                lastUpdated: new Date()
            };
            
            userRef.set(userData, { merge: true })
                .then(() => {
                    console.log("User profile saved successfully");
                })
                .catch((error) => {
                    console.error("Error saving user profile:", error);
                });
        }

        function updateUserProfile(user) {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            document.getElementById('profileName').textContent = fullName || 'User';
            document.getElementById('userName').textContent = '@' + (user.username || 'username');
            document.getElementById('userId').textContent = 'ID: ' + user.id;
            
            const profilePic = document.getElementById('profilePic');
            if (user.photo_url) {
                profilePic.style.backgroundImage = `url(${user.photo_url})`;
                profilePic.style.backgroundSize = 'cover';
                profilePic.textContent = '';
            } else {
                const initials = (user.first_name ? user.first_name.charAt(0).toUpperCase() : '') + 
                               (user.last_name ? user.last_name.charAt(0).toUpperCase() : '');
                profilePic.textContent = initials || 'U';
            }
        }

        // ২. ব্যালেন্স লোড ফাংশন
        function loadUserData(userId) {
            // Load balance data
            db.collection('userBalance').doc(userId.toString()).get()
                .then((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        balanceAmount.textContent = '$' + (data.mainBalance || '0.00');
                        totalEarning.textContent = '$' + (data.totalEarning || '0.00');
                        totalWithdraw.textContent = '$' + (data.totalWithdraw || '0.00');
                    } else {
                        // Create initial balance record
                        db.collection('userBalance').doc(userId.toString()).set({
                            mainBalance: 0.00,
                            totalEarning: 0.00,
                            totalWithdraw: 0.00,
                            lastUpdated: new Date()
                        });
                    }
                })
                .catch((error) => {
                    console.error("Error loading balance:", error);
                    showToast('Error loading balance');
                });

            // Load transactions
            loadTransactions(userId);
        }

        // ৪. ট্রানজেকশন লোড ফাংশন
        function loadTransactions(userId) {
            db.collection('userTransaction')
                .where('userId', '==', userId.toString())
                .orderBy('date', 'desc')
                .get()
                .then((querySnapshot) => {
                    allTransactions = [];
                    querySnapshot.forEach((doc) => {
                        const transaction = doc.data();
                        transaction.id = doc.id;
                        allTransactions.push(transaction);
                    });
                    
                    filteredTransactions = [...allTransactions];
                    displayTransactions(filteredTransactions);
                })
                .catch((error) => {
                    console.error("Error loading transactions:", error);
                    transactionsList.innerHTML = '<div class="loading">Error loading transactions</div>';
                });
        }

        function displayTransactions(transactions) {
            transactionsList.innerHTML = '';
            
            if (transactions.length === 0) {
                transactionsList.innerHTML = `
                    <div class="no-transactions">
                        <i class="fas fa-receipt"></i>
                        <div>No transactions found</div>
                    </div>
                `;
                return;
            }

            transactions.forEach((transaction) => {
                const transactionItem = createTransactionElement(transaction);
                transactionsList.appendChild(transactionItem);
            });
        }

        function createTransactionElement(transaction) {
            const div = document.createElement('div');
            div.className = 'transaction-item';
            
            const isIncome = transaction.amount > 0;
            const iconClass = isIncome ? 'income' : 'expense';
            const icon = isIncome ? 'fa-plus' : 'fa-minus';
            const amountPrefix = isIncome ? '+' : '-';
            const amount = Math.abs(transaction.amount);
            
            div.innerHTML = `
                <div class="transaction-icon ${iconClass}">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-amount ${iconClass}">${amountPrefix}$${amount.toFixed(2)}</div>
                    <div class="transaction-date">${transaction.date.toDate().toLocaleDateString()}</div>
                </div>
                <div class="transaction-status">
                    <i class="fas fa-info-circle"></i>
                </div>
            `;
            
            // Add click event for transaction details
            div.addEventListener('click', () => {
                showTransactionDetails(transaction);
            });
            
            return div;
        }

        function showTransactionDetails(transaction) {
            const isIncome = transaction.amount > 0;
            const amountPrefix = isIncome ? '+' : '-';
            const amount = Math.abs(transaction.amount);
            
            document.getElementById('transactionDetailAmount').textContent = 
                `${amountPrefix}$${amount.toFixed(2)}`;
            document.getElementById('transactionDetailAmount').style.color = 
                isIncome ? 'var(--accent)' : '#ef4444';
            
            document.getElementById('transactionDetailId').textContent = 
                transaction.transactionId || transaction.id;
            document.getElementById('transactionDetailDate').textContent = 
                transaction.date.toDate().toLocaleString();
            document.getElementById('transactionDetailStatus').textContent = 
                transaction.status || 'Completed';
            document.getElementById('transactionDetailFee').textContent = 
                `$${(transaction.fee || 0).toFixed(2)}`;
            
            transactionModal.classList.add('show');
        }

        // সার্চ ফাংশনালিটি
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            filterTransactions(searchTerm);
        });

        function filterTransactions(searchTerm = '', dateFilter = 'all') {
            let filtered = allTransactions;

            // Transaction ID দ্বারা সার্চ
            if (searchTerm) {
                filtered = filtered.filter(transaction => 
                    (transaction.transactionId && transaction.transactionId.toLowerCase().includes(searchTerm)) ||
                    (transaction.id && transaction.id.toLowerCase().includes(searchTerm))
                );
            }

            // তারিখ দ্বারা ফিল্টার
            if (dateFilter !== 'all') {
                const filterDate = new Date();
                filterDate.setDate(filterDate.getDate() - parseInt(dateFilter));
                
                filtered = filtered.filter(transaction => {
                    const transactionDate = transaction.date.toDate();
                    return transactionDate >= filterDate;
                });
            }

            filteredTransactions = filtered;
            displayTransactions(filteredTransactions);
        }

        // তারিখ ফিল্টার ফাংশনালিটি
        dateFilterBtn.addEventListener('click', function() {
            dateFilterModal.style.display = 'block';
            setTimeout(() => {
                dateFilterModal.classList.add('show');
            }, 10);
        });

        closeDateFilterModal.addEventListener('click', function() {
            dateFilterModal.classList.remove('show');
            setTimeout(() => {
                dateFilterModal.style.display = 'none';
            }, 300);
        });

        dateOptionBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                dateOptionBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });

        applyDateFilter.addEventListener('click', function() {
            const activeFilter = document.querySelector('.date-option-btn.active');
            const filterDays = activeFilter.getAttribute('data-days');
            
            dateFilterModal.classList.remove('show');
            setTimeout(() => {
                dateFilterModal.style.display = 'none';
            }, 300);

            filterTransactions(searchInput.value.toLowerCase().trim(), filterDays);
        });

        // Theme Toggle
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            
            const themeIcon = themeToggle.querySelector('i');
            themeIcon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        });

        // Check for saved theme preference
        window.addEventListener('DOMContentLoaded', () => {
            const savedDarkMode = localStorage.getItem('darkMode') === 'true';
            if (savedDarkMode) {
                document.body.classList.add('dark-mode');
                const themeIcon = themeToggle.querySelector('i');
                themeIcon.className = 'fas fa-sun';
            }
        });

        // Transfer Button Click - Modal Open
        transferBtn.addEventListener('click', function() {
            transferModal.style.display = 'block';
            setTimeout(() => {
                transferModal.classList.add('show');
            }, 10);
        });

        // Close Transfer Modal
        closeTransferModal.addEventListener('click', function() {
            transferModal.classList.remove('show');
            setTimeout(() => {
                transferModal.style.display = 'none';
            }, 300);
        });

        // Transfer Friend Button - একইভাবে তথ্য পাঠানো
        transferFriendBtn.addEventListener('click', function() {
            openTransferPage('friend');
        });

        // Transfer Agent Button - একইভাবে তথ্য পাঠানো
        transferAgentBtn.addEventListener('click', function() {
            openTransferPage('agent');
        });

        // Deposit Button - নতুন পেজে redirect
        depositBtn.addEventListener('click', function() {
            openActionPage('deposit');
        });

        // Withdraw Button - নতুন পেজে redirect
        withdrawBtn.addEventListener('click', function() {
            openActionPage('withdraw');
        });

        // Close Transaction Modal
        closeTransactionModal.addEventListener('click', function() {
            transactionModal.classList.remove('show');
        });

        // Copy Transaction ID
        copyTransactionId.addEventListener('click', function() {
            const transactionId = document.getElementById('transactionDetailId').textContent;
            navigator.clipboard.writeText(transactionId).then(() => {
                showToast('Transaction ID copied!');
            });
        });

        // Functions for page redirection - সবগুলোতেই একইভাবে তথ্য পাঠানো
        function openTransferPage(type) {
            const baseUrl = 'https://yourdomain.com';
            const params = new URLSearchParams({
                userId: userData.id,
                userName: userData.username || '',
                firstName: userData.first_name || '',
                lastName: userData.last_name || '',
                type: type
            });
            
            window.location.href = `${baseUrl}/transfer.html?${params.toString()}`;
        }

        function openActionPage(action) {
            const baseUrl = 'https://yourdomain.com';
            const params = new URLSearchParams({
                userId: userData.id,
                userName: userData.username || '',
                firstName: userData.first_name || '',
                lastName: userData.last_name || '',
                action: action
            });
            
            window.location.href = `${baseUrl}/${action}.html?${params.toString()}`;
        }

        function showToast(message) {
            toastMessage.textContent = message;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // Show welcome toast
        setTimeout(() => {
            showToast('Welcome to NexaWallet!');
        }, 1000);
    </script>
