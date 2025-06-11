// --- IMPORTANT: Firebase Configuration ---
// Replace with your Firebase project's configuration object.
// You can find this in your Firebase project settings (Project Overview > Project settings > General > Your apps > SDK setup and configuration).
const firebaseConfig = {
  apiKey: "AIzaSyBTWj_SpVOECBKRyjJNEeBwn0GfrmA1CNs", // 這是範例，您應該用您自己的
  authDomain: "questionapp-10616.firebaseapp.com",
  projectId: "questionapp-10616",
  storageBucket: "questionapp-10616.appspot.com",
  messagingSenderId: "702076644201",
  appId: "1:702076644201:web:a2f8925e19d60ace392bf8",
  measurementId: "G-2NYGTX6HVJ" // 這個通常是可選的
};

// SVG Icons (as strings) - remain the same
const CheckCircleIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2 flex-shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
const XCircleIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2 flex-shrink-0"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

let questions = [];
let currentQuestionIndex = 0;
let userAnswers = new Map();
let score = 0;
let db; // Firebase Firestore instance

// DOM Elements - remain the same
let loadingStateEl, questionSectionEl, resultsSectionEl;
let progressTextEl, progressBarEl;
let questionDisplayAreaEl, questionTextEl, optionsContainerEl;
let prevBtn, nextBtn, finishBtn, restartBtn;
let feedbackMessageEl, scoreDisplayEl, percentageDisplayEl, detailedResultsContainerEl;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize DOM Elements
  loadingStateEl = document.getElementById('loading-state');
  questionSectionEl = document.getElementById('question-section');
  resultsSectionEl = document.getElementById('results-section');
  
  progressTextEl = document.getElementById('progress-text');
  progressBarEl = document.getElementById('progress-bar');
  
  questionDisplayAreaEl = document.getElementById('question-display-area');
  questionTextEl = document.getElementById('question-text');
  optionsContainerEl = document.getElementById('options-container');
  
  prevBtn = document.getElementById('prev-btn');
  nextBtn = document.getElementById('next-btn');
  finishBtn = document.getElementById('finish-btn');
  restartBtn = document.getElementById('restart-btn');
  
  feedbackMessageEl = document.getElementById('feedback-message');
  scoreDisplayEl = document.getElementById('score-display');
  percentageDisplayEl = document.getElementById('percentage-display');
  detailedResultsContainerEl = document.getElementById('detailed-results-container');

  document.getElementById('current-year').textContent = new Date().getFullYear();

  // Add event listeners
  prevBtn.addEventListener('click', handlePreviousQuestion);
  nextBtn.addEventListener('click', handleNextQuestion);
  finishBtn.addEventListener('click', handleSubmitQuiz);
  restartBtn.addEventListener('click', handleRestartQuiz);

  // Initialize Firebase and fetch questions
  try {
    loadingStateEl.innerHTML = '<p class="text-purple-600 text-2xl">Initializing Firebase & Fetching quiz...</p>';
    
    // Check if Firebase config placeholder is still there
    if (firebaseConfig.apiKey === "YOUR_API_KEY" || !firebaseConfig.projectId) {
        throw new Error("Firebase configuration is missing or incomplete in script.js. Please replace placeholder values with your actual Firebase project config.");
    }

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore(); // Get Firestore instance

    questions = await fetchQuestionsFromFirebase();
    
    if (questions.length > 0) {
      loadingStateEl.classList.add('hidden');
      questionSectionEl.classList.remove('hidden');
      questionSectionEl.classList.add('animate-fadeIn');
      startQuiz();
    } else {
      loadingStateEl.innerHTML = '<p class="text-red-500 text-2xl">No questions found in Firebase.</p><p class="text-gray-600 text-sm mt-2">This could be due to an empty "questions" collection in Firestore, incorrect data structure, or all question documents having issues (e.g., missing fields, correct answer not matching any option).</p><p class="text-gray-500 text-sm mt-1">Please check your Firestore "questions" collection, ensure documents have "text", "options" (array), and "correctAnswer" fields, and that the correctAnswer exactly matches an option.</p>';
    }
  } catch (error) {
    console.error("Error initializing quiz with Firebase:", error);
    loadingStateEl.innerHTML = `<p class="text-red-500 text-2xl">Failed to load quiz from Firebase.</p><p class="text-gray-600 text-sm mt-2">${error.message}</p><p class="text-gray-500 text-sm mt-1">Please ensure your Firebase configuration in script.js is correct, Firestore is set up, and the "questions" collection exists with the correct data structure and security rules allowing reads.</p>`;
  }
});


async function fetchQuestionsFromFirebase() {
  if (!db) {
    throw new Error("Firestore is not initialized.");
  }
  const snapshot = await db.collection('Questions').orderBy('id').get();

  if (snapshot.empty) {
    console.warn('No documents in Firestore "questions" collection.');
    return [];
  }

  const questionsArray = [];
  snapshot.forEach(doc => {
    const data = doc.data();

    // --- 彈性處理欄位 ---
    // 1. 題目文字
    const text = data.text ?? data.question ?? "";
    // 2. 選項：允許字串或真正的陣列
    let options = [];
    if (Array.isArray(data.options)) {
      options = data.options;
    } else if (typeof data.options === 'string') {
      // 逗號、分號皆可，用正則拆分並去除空白
      options = data.options.split(/[;,]/).map(s => s.trim()).filter(Boolean);
    }
    // 3. 正確答案：接受 correctAnswer / answer / Answer
    const correctAnswer = data.correctAnswer ?? data.answer ?? data.answer ?? "";

    // 驗證
    if (typeof text !== 'string' || text === "") {
      console.warn(`Document ${doc.id} skipped: 無有效題目文字 (text).`);
      return;
    }
    if (options.length === 0) {
      console.warn(`Document ${doc.id} skipped: options 空或格式不符。`);
      return;
    }
    if (typeof correctAnswer !== 'string' || !options.includes(correctAnswer)) {
      console.warn(`Document ${doc.id} skipped: correctAnswer "${correctAnswer}" 不在 options 範圍內。`);
      return;
    }

    questionsArray.push({
      id: doc.id,
      text,
      options,
      correctAnswer,
    });
  });
  return questionsArray;
}


// --- Rest of the quiz logic remains largely the same ---

function startQuiz() {
  currentQuestionIndex = 0;
  userAnswers.clear();
  score = 0;
  resultsSectionEl.classList.add('hidden');
  questionSectionEl.classList.remove('hidden');
  questionSectionEl.classList.remove('animate-fadeIn'); 
  void questionSectionEl.offsetWidth; 
  questionSectionEl.classList.add('animate-fadeIn');
  displayQuestion();
}

function displayQuestion() {
  if (currentQuestionIndex >= questions.length) return;

  const question = questions[currentQuestionIndex];
  questionTextEl.textContent = question.text;
  optionsContainerEl.innerHTML = ''; 

  question.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = `
      w-full text-left p-4 rounded-lg border-2 transition-all duration-150 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-purple-400
      bg-white border-gray-300 text-gray-700 hover:bg-purple-50 hover:border-purple-400
    `;
    const optionTextNode = document.createTextNode(option);
    const charPrefix = String.fromCharCode(65 + index);
    button.innerHTML = `<span class="font-medium">${charPrefix}. </span>`;
    button.appendChild(optionTextNode);
    
    button.onclick = () => handleAnswerSelect(question.id, option);

    if (userAnswers.get(question.id) === option) {
      button.classList.remove('bg-white', 'border-gray-300', 'text-gray-700', 'hover:bg-purple-50', 'hover:border-purple-400');
      button.classList.add('bg-purple-500', 'border-purple-600', 'text-white', 'shadow-md', 'transform', 'scale-105');
    }
    optionsContainerEl.appendChild(button);
  });
  
  questionDisplayAreaEl.classList.remove('animate-fadeIn');
  void questionDisplayAreaEl.offsetWidth; 
  questionDisplayAreaEl.classList.add('animate-fadeIn');

  updateProgress();
  updateNavigationButtons();
}

function handleAnswerSelect(questionId, selectedOption) {
  userAnswers.set(questionId, selectedOption);
  displayQuestion(); 
}

function updateProgress() {
  progressTextEl.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
  const progressPercentage = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  progressBarEl.style.width = `${progressPercentage}%`;
}

function updateNavigationButtons() {
  prevBtn.disabled = currentQuestionIndex === 0;
  
  if (currentQuestionIndex === questions.length - 1) {
    nextBtn.classList.add('hidden');
    finishBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.remove('hidden');
    finishBtn.classList.add('hidden');
  }
}

function handleNextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    displayQuestion();
  }
}

function handlePreviousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    displayQuestion();
  }
}

function handleSubmitQuiz() {
  score = 0;
  questions.forEach(question => {
    if (userAnswers.get(question.id) === question.correctAnswer) {
      score++;
    }
  });
  displayResults();
}

function displayResults() {
  questionSectionEl.classList.add('hidden');
  resultsSectionEl.classList.remove('hidden');
  resultsSectionEl.classList.remove('animate-fadeIn'); 
  void resultsSectionEl.offsetWidth; 
  resultsSectionEl.classList.add('animate-fadeIn'); 

  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  
  let feedbackMsg = '';
  let feedbackColorClass = 'text-gray-700';

  if (percentage === 100) {
    feedbackMsg = "Perfect Score! You're a genius!";
    feedbackColorClass = 'text-green-600';
  } else if (percentage >= 75) {
    feedbackMsg = "Great Job! You really know your stuff!";
    feedbackColorClass = 'text-blue-600';
  } else if (percentage >= 50) {
    feedbackMsg = "Good Effort! Keep learning!";
    feedbackColorClass = 'text-yellow-600';
  } else {
    feedbackMsg = "Keep trying! Practice makes perfect.";
    feedbackColorClass = 'text-red-600';
  }

  feedbackMessageEl.textContent = feedbackMsg;
  feedbackMessageEl.className = `text-xl font-semibold mb-2 ${feedbackColorClass}`; 
  scoreDisplayEl.textContent = `${score} / ${totalQuestions}`;
  percentageDisplayEl.textContent = `(${percentage}%)`;

  detailedResultsContainerEl.innerHTML = ''; 
  questions.forEach((question, index) => {
    const userAnswer = userAnswers.get(question.id);
    const isCorrect = userAnswer === question.correctAnswer;
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'p-4 border border-gray-200 rounded-lg bg-gray-50 animate-fadeIn';
    resultDiv.style.animationDelay = `${index * 0.05}s`;
    
    const questionTextNode = document.createTextNode(`${index + 1}. ${question.text}`);
    const userAnswerText = userAnswer || 'Not answered';
    const correctAnswerText = question.correctAnswer;

    let answerHtml = `
      <p class="font-semibold text-gray-700 mb-2"></p>
      <p class="flex items-center mb-1 ${isCorrect ? 'text-green-600' : 'text-red-600'}">
        ${isCorrect ? CheckCircleIconSVG : XCircleIconSVG}
        Your answer: <span class="font-medium ml-1"></span>
      </p>
    `;
    if (!isCorrect) {
      answerHtml += `<p class="text-blue-600">Correct answer: <span class="font-medium"></span></p>`;
    }
    resultDiv.innerHTML = answerHtml;
    
    resultDiv.querySelector('.font-semibold.text-gray-700').appendChild(questionTextNode);
    resultDiv.querySelector(`.${isCorrect ? 'text-green-600' : 'text-red-600'} .font-medium`).textContent = userAnswerText;
    if (!isCorrect) {
      resultDiv.querySelector('.text-blue-600 .font-medium').textContent = correctAnswerText;
    }

    detailedResultsContainerEl.appendChild(resultDiv);
  });
}

function handleRestartQuiz() {
  resultsSectionEl.classList.add('hidden');
  resultsSectionEl.classList.remove('animate-fadeIn'); 
  
  questionSectionEl.classList.remove('hidden');
  questionSectionEl.classList.remove('animate-fadeIn');
  void questionSectionEl.offsetWidth; 
  questionSectionEl.classList.add('animate-fadeIn');
  
  startQuiz();
}