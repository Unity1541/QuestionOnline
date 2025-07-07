// --- IMPORTANT: Firebase Configuration ---
// Replace with your Firebase project's configuration object.
// You can find this in your Firebase project settings (Project Overview > Project settings > General > Your apps > SDK setup and configuration).
const firebaseConfig = {
  apiKey: "AIzaSyBTWj_SpVOECBKRyjJNEeBwn0GfrmA1CNs", // 已替換為您提供的 apiKey
  authDomain: "questionapp-10616.firebaseapp.com",
  projectId: "questionapp-10616",
  storageBucket: "questionapp-10616.appspot.com",
  messagingSenderId: "702076644201",
  appId: "1:702076644201:web:a2f8925e19d60ace392bf8",
  measurementId: "G-2NYGTX6HVJ" // 這個通常是可選的
};

// ================================
// 全域變數
// ================================
let db;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timeLeft = 120;
let timer = null;
let selectedAnswer = null;
let isFirebaseConfigured = false;
let userAnswers = []; // 儲存使用者的答案

// DOM 元素引用
const bgAnimation = document.getElementById('bgAnimation');
const firebaseConfigDiv = document.getElementById('firebaseConfig');
const statsBar = document.getElementById('statsBar');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const levelBadge = document.getElementById('level');
const progressDisplay = document.getElementById('progress');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const questionContainer = document.getElementById('questionContainer');
const questionNumberDisplay = document.getElementById('questionNumber');
const questionTextDisplay = document.getElementById('questionText');
const optionsContainer = document.getElementById('options');
const controlsDiv = document.getElementById('controls');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const restartBtn = document.getElementById('restartBtn');
const resultDiv = document.getElementById('result');
const finalScoreDisplay = document.getElementById('finalScore');
const resultMessageDisplay = document.getElementById('resultMessage');
const finalLevelDisplay = document.getElementById('finalLevel');
const toggleAnswersBtn = document.getElementById('toggleAnswersBtn');
const restartQuizBtn2 = document.getElementById('restartQuizBtn2'); // 新增第二個重新開始按鈕
const answersReview = document.getElementById('answersReview');
const answersContent = document.getElementById('answersContent');


// 等級系統
const levels = [
    { name: "初心者", minScore: 0, color: "#9ca3af" },
    { name: "見習生", minScore: 20, color: "#10b981" },
    { name: "中級者", minScore: 40, color: "#3b82f6" },
    { name: "上級者", minScore: 60, color: "#8b5cf6" },
    { name: "專家", minScore: 80, color: "#f59e0b" },
    { name: "大師", minScore: 95, color: "#ef4444" }
];

// 範例題目（當 Firebase 無法使用時的後備）
const sampleQuestions = [
    {
        text: "以下哪部動畫是宮崎駿執導的作品？",
        options: {A: "龍貓", B: "你的名字", C: "鬼滅之刃", D: "進擊的巨人"},
        answer: "A", 
        explanation: "《龍貓》是宮崎駿在1988年執導的經典動畫電影，是吉卜力工作室的代表作品之一。"
    },
    {
        text: "《火影忍者》中主角的名字是？",
        options: {A: "漩渦鳴人", B: "宇智波佐助", C: "春野櫻", D: "旗木卡卡西"},
        answer: "A", 
        explanation: "漩渦鳴人是《火影忍者》的主角，夢想成為火影，擁有九尾妖狐的力量。"
    },
    {
        text: "《航海王》的作者是誰？",
        options: {A: "鳥山明", B: "尾田榮一郎", C: "岸本齊史", D: "久保帶人"},
        answer: "B",
        explanation: "尾田榮一郎是《航海王》(One Piece)的作者，這部作品自1997年開始連載至今。"
    },
    {
        text: "以下哪部作品不是吉卜力工作室製作的？",
        options: {A: "天空之城", B: "魔女宅急便", C: "你的名字", D: "風之谷"},
        answer: "C",
        explanation: "《你的名字》是由新海誠執導的作品，由CoMix Wave Films製作，不是吉卜力工作室的作品。"
    },
    {
        text: "《鬼滅之刃》中炭治郎使用的呼吸法是？",
        options: {A: "水之呼吸", B: "火之呼吸", C: "風之呼吸", D: "日之呼吸"},
        answer: "A",
        explanation: "炭治郎最初學習的是水之呼吸，後來覺醒了日之呼吸，但水之呼吸是他的基礎招式。"
    }
];

// 將 Firebase 的答案字母 (A, B, C, D) 轉換為索引 (0, 1, 2, 3)
const answerMap = {
    "A": 0,
    "B": 1,
    "C": 2,
    "D": 3
};

// ================================
// 事件監聽器 (當 DOM 內容載入完成後)
// ================================
document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    createBackgroundAnimation();
    checkFirebaseConfig();

    // 為按鈕添加事件監聽器，而不是直接在 HTML 中使用 onclick
    startBtn.addEventListener('click', startQuiz);
    nextBtn.addEventListener('click', nextQuestion);
    restartBtn.addEventListener('click', restartQuiz);
    toggleAnswersBtn.addEventListener('click', toggleAnswersReview);
    restartQuizBtn2.addEventListener('click', restartQuiz);
});

// ================================
// 初始化 Firebase
// ================================
function initFirebase() {
    try {
        if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && 
            firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            isFirebaseConfigured = true;
            console.log("Firebase 初始化成功");
        } else {
            console.log("Firebase 配置不完整或為預設值，將使用範例題目模式");
        }
    } catch (error) {
        console.error("Firebase 初始化失敗:", error);
        showError("Firebase 連接失敗，將使用範例題目。請檢查 console 獲取更多資訊。");
    }
}

// 檢查 Firebase 配置狀態並更新 UI
function checkFirebaseConfig() {
    if (isFirebaseConfigured) {
        firebaseConfigDiv.style.display = 'none';
        controlsDiv.style.display = 'flex';
        loadingDiv.style.display = 'none';
    } else {
        firebaseConfigDiv.style.display = 'block'; // 保持顯示配置提示
        controlsDiv.style.display = 'flex';
        loadingDiv.style.display = 'none';
    }
}

// ================================
// 背景動畫
// ================================
function createBackgroundAnimation() {
    const sakuraSymbols = ['🌸', '🌺', '🎋', '🌿', '🍃'];
    
    setInterval(() => {
        if (bgAnimation.querySelectorAll('.sakura').length < 10) {
            const sakura = document.createElement('div');
            sakura.className = 'sakura';
            sakura.textContent = sakuraSymbols[Math.floor(Math.random() * sakuraSymbols.length)];
            sakura.style.left = Math.random() * 100 + '%';
            sakura.style.animationDuration = (Math.random() * 5 + 5) + 's';
            sakura.style.animationDelay = Math.random() * 2 + 's';
            bgAnimation.appendChild(sakura);
            
            setTimeout(() => {
                if (sakura.parentNode) {
                    sakura.parentNode.removeChild(sakura);
                }
            }, 12000);
        }
    }, 1000);
}

// ================================
// 測驗邏輯
// ================================
async function startQuiz() {
    try {
        loadingDiv.style.display = 'block';
        controlsDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        firebaseConfigDiv.style.display = 'none';
        
        await loadQuestions();
        
        if (questions.length === 0) {
            throw new Error("沒有找到題目。請確保 Firebase 配置正確且 Firestore 'Questions' 集合中有資料。");
        }
        
        currentQuestionIndex = 0;
        score = 0;
        timeLeft = 120;
        selectedAnswer = null;
        userAnswers = [];
        
        loadingDiv.style.display = 'none';
        statsBar.style.display = 'flex';
        questionContainer.style.display = 'block';
        controlsDiv.style.display = 'flex';
        nextBtn.style.display = 'inline-block';
        startBtn.style.display = 'none';
        restartBtn.style.display = 'none'; // 確保重新開始按鈕隱藏

        startTimer();
        showQuestion();
        
    } catch (error) {
        console.error("開始測驗失敗:", error);
        showError("載入題目失敗: " + error.message + "，將使用內建範例題目。");
        loadingDiv.style.display = 'none';
        controlsDiv.style.display = 'flex';
        startBtn.style.display = 'inline-block';
        nextBtn.style.display = 'none';
        restartBtn.style.display = 'none';
    }
}

async function loadQuestions() {
    const processedQuestions = [];
    if (isFirebaseConfigured) {
        try {
            const snapshot = await db.collection('Questions').get();
            const optionKeys = ['A', 'B', 'C', 'D']; // 定義選項順序

            snapshot.forEach(doc => {
                const data = doc.data();
                const questionOptions = [];
                const firestoreOptions = data.options;
                
                // 將物件形式的 options 轉換為陣列，並確保順序
                optionKeys.forEach(key => {
                    if (firestoreOptions && firestoreOptions[key]) {
                        questionOptions.push(firestoreOptions[key]);
                    }
                });

                // 找到正確答案的索引
                let correctIndex = -1;
                const correctAnswerKey = data.answer;
                if (correctAnswerKey && answerMap.hasOwnProperty(correctAnswerKey)) {
                    correctIndex = answerMap[correctAnswerKey];
                }

                // 確保題目、選項和正確答案都有效才加入
                if (data.text && questionOptions.length === 4 && correctIndex !== -1) { // 假設每題有4個選項
                    processedQuestions.push({
                        question: data.text,
                        options: questionOptions,
                        correct: correctIndex,
                        explanation: data.explanation || "暫無解析"
                    });
                } else {
                    console.warn(`跳過無效題目 (ID: ${doc.id}): `, data);
                }
            });
            
            if (processedQuestions.length === 0) {
                console.log("Firestore 中沒有有效題目，使用範例題目。");
                // 處理範例題目以匹配預期格式
                questions = sampleQuestions.map(q => ({
                    question: q.text,
                    options: optionKeys.map(key => q.options[key]),
                    correct: answerMap[q.answer],
                    explanation: q.explanation
                }));
            } else {
                questions = processedQuestions;
            }
        } catch (error) {
            console.error("從 Firestore 載入題目失敗:", error);
            showError("從 Firebase 載入題目失敗，正在使用內建範例題目。");
            // 處理範例題目以匹配預期格式
            questions = sampleQuestions.map(q => ({
                question: q.text,
                options: optionKeys.map(key => q.options[key]),
                correct: answerMap[q.answer],
                explanation: q.explanation
            }));
        }
    } else {
        // 如果 Firebase 未配置，直接使用範例題目
        const optionKeys = ['A', 'B', 'C', 'D'];
        questions = sampleQuestions.map(q => ({
            question: q.text,
            options: optionKeys.map(key => q.options[key]),
            correct: answerMap[q.answer],
            explanation: q.explanation
        }));
    }
    
    questions = shuffleArray(questions);
}


function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function showQuestion() {
    if (currentQuestionIndex >= questions.length) {
        endQuiz();
        return;
    }
    
    const question = questions[currentQuestionIndex];
    
    questionNumberDisplay.textContent = 
        `題目 ${currentQuestionIndex + 1} / ${questions.length}`;
    questionTextDisplay.textContent = question.question;
    progressDisplay.textContent = 
        `${currentQuestionIndex + 1}/${questions.length}`;
    
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = option;
        optionDiv.dataset.index = index; // 設置 data-index 以便判斷
        optionDiv.addEventListener('click', () => selectAnswer(index));
        optionsContainer.appendChild(optionDiv);
    });
    
    selectedAnswer = null;
    nextBtn.disabled = true;
}

function selectAnswer(answerIndex) {
    document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // 透過 data-index 找到對應的選項並標記
    const selectedOptionDiv = optionsContainer.querySelector(`[data-index="${answerIndex}"]`);
    if (selectedOptionDiv) {
        selectedOptionDiv.classList.add('selected');
    }
    selectedAnswer = answerIndex;
    nextBtn.disabled = false;
}

function nextQuestion() {
    if (selectedAnswer === null) return;
    
    const question = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correct;
    
    userAnswers.push({
        questionIndex: currentQuestionIndex,
        question: question.question,
        options: question.options,
        userAnswer: selectedAnswer,
        correctAnswer: question.correct,
        isCorrect: isCorrect,
        explanation: question.explanation || "暫無解析"
    });
    
    // 顯示答案反饋
    document.querySelectorAll('.option').forEach((optionDiv, index) => {
        optionDiv.removeEventListener('click', () => selectAnswer(index)); // 禁用點擊
        if (index === question.correct) {
            optionDiv.classList.add('correct');
        } else if (index === selectedAnswer && !isCorrect) {
            optionDiv.classList.add('incorrect');
        }
    });
    
    if (isCorrect) {
        score += 20;
        updateScore();
    }
    
    setTimeout(() => {
        currentQuestionIndex++;
        showQuestion();
    }, 1500);
}

function updateScore() {
    scoreDisplay.textContent = score;
    
    const currentLevel = getCurrentLevel();
    levelBadge.textContent = currentLevel.name;
    levelBadge.style.background = `linear-gradient(45deg, ${currentLevel.color}, #4ecdc4)`;
}

function getCurrentLevel() {
    for (let i = levels.length - 1; i >= 0; i--) {
        if (score >= levels[i].minScore) {
            return levels[i];
        }
    }
    return levels[0];
}

function startTimer() {
    clearInterval(timer);
    timerDisplay.textContent = timeLeft; // 初始化顯示時間
    timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            endQuiz();
        }
    }, 1000);
}

function endQuiz() {
    clearInterval(timer);
    
    // 將所有未回答的題目也記錄下來
    while (currentQuestionIndex < questions.length) {
        const question = questions[currentQuestionIndex];
        userAnswers.push({
            questionIndex: currentQuestionIndex,
            question: question.question,
            options: question.options,
            userAnswer: -1, // -1 表示未回答
            correctAnswer: question.correct,
            isCorrect: false,
            explanation: question.explanation || "暫無解析"
        });
        currentQuestionIndex++;
    }
    
    statsBar.style.display = 'none';
    questionContainer.style.display = 'none';
    controlsDiv.style.display = 'none';
    
    const finalLevel = getCurrentLevel();
    finalScoreDisplay.textContent = score + '分';
    finalLevelDisplay.textContent = finalLevel.name;
    finalLevelDisplay.style.background = 
        `linear-gradient(45deg, ${finalLevel.color}, #4ecdc4)`;
    
    let message = "";
    if (score >= 80) {
        message = "太厲害了！大師級人物！🎉";
    } else if (score >= 60) {
        message = "很不錯！有複習！👏";
    } else if (score >= 40) {
        message = "還可以！繼續努力學習吧！📚";
    } else {
        message = "加油！再努力！💪";
    }
    
    resultMessageDisplay.textContent = message;
    resultDiv.style.display = 'block';
    
    generateAnswersReview();
}

function restartQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    timeLeft = 120;
    selectedAnswer = null;
    userAnswers = [];
    clearInterval(timer); 
    
    resultDiv.style.display = 'none';
    answersReview.style.display = 'none';
    toggleAnswersBtn.textContent = '查看解答';
    
    controlsDiv.style.display = 'flex';
    startBtn.style.display = 'inline-block';
    nextBtn.style.display = 'none';
    restartBtn.style.display = 'none';

    checkFirebaseConfig(); // 重新檢查 Firebase 配置，顯示或隱藏提示
}

function generateAnswersReview() {
    answersContent.innerHTML = '';
    
    userAnswers.forEach((answer, index) => {
        const answerDiv = document.createElement('div');
        answerDiv.className = `answer-item ${answer.isCorrect ? 'correct-answer' : 'wrong-answer'}`;
        
        let optionsHtml = '';
        const optionLetters = ['A', 'B', 'C', 'D']; // 用於顯示選項字母

        // 轉換題目中儲存的 options 陣列為物件形式，方便按字母訪問
        const currentQuestionOptions = {};
        answer.options.forEach((opt, i) => {
            currentQuestionOptions[optionLetters[i]] = opt;
        });

        optionLetters.forEach((letter, optionIndex) => {
            let optionText = currentQuestionOptions[letter];
            let optionClass = 'review-option';
            let prefix = '';
            
            // 如果當前選項是正確答案
            if (optionIndex === answer.correctAnswer) {
                optionClass += ' correct-choice';
                prefix = '✅ ';
            }
            
            // 如果當前選項是使用者選擇的答案
            if (optionIndex === answer.userAnswer) {
                if (answer.isCorrect) {
                    optionClass += ' user-correct';
                    prefix = '✅ ';
                } else if (answer.userAnswer !== -1) { // 答錯且不是未回答
                    optionClass += ' user-choice';
                    prefix = '❌ ';
                }
            }
            
            // 如果未回答，但該選項是正確答案，仍然標記為正確（不顯示❌）
            if (answer.userAnswer === -1 && optionIndex === answer.correctAnswer) {
                prefix = '✅ ';
            }
            
            optionsHtml += `<div class="${optionClass}">${prefix}${letter}. ${optionText}</div>`;
        });
        
        let statusText = '';
        let statusClass = '';
        if (answer.userAnswer === -1) {
            statusText = '⏰ 未回答';
            statusClass = 'incorrect';
        } else if (answer.isCorrect) {
            statusText = '🎉 回答正確！';
            statusClass = 'correct';
        } else {
            statusText = '💪 答錯了，繼續加油！';
            statusClass = 'incorrect';
        }
        
        answerDiv.innerHTML = `
            <div class="review-question">第${index + 1}題：${answer.question}</div>
            <div class="review-options">${optionsHtml}</div>
            <div class="answer-status ${statusClass}">${statusText}</div>
            ${answer.explanation ? `<div style="margin-top: 10px; color: #4a5568; font-style: italic;">💡 ${answer.explanation}</div>` : ''}
        `;
        
        answersContent.appendChild(answerDiv);
    });
}

function toggleAnswersReview() {
    if (answersReview.style.display === 'none' || answersReview.style.display === '') {
        answersReview.style.display = 'block';
        toggleAnswersBtn.textContent = '隱藏解答';
    } else {
        answersReview.style.display = 'none';
        toggleAnswersBtn.textContent = '查看解答';
    }
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// ================================
// Firebase Firestore 數據結構參考
// ================================
/*
根據您提供的截圖，Firestore 中 'Questions' 集合的每個文檔應包含：
{
    answer: "C",  // 正確答案的字母 (A, B, C, D)
    explanation: "答案解析說明", // 可選的解析文字
    options: {    // 選項物件，包含 A, B, C, D 屬性
        A: "選項A文字",
        B: "選項B文字",
        C: "選項C文字",
        D: "選項D文字"
    },
    text: "問題文字", // 題目文字
    type: "multiple_choice" // 題目類型 (如果有的話)
}
*/