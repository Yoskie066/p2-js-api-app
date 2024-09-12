document.addEventListener('DOMContentLoaded', () => {
    const btnReadMore = document.querySelector('.btn-read-more');
    const btnReadLess = document.querySelector('.btn-read-less');
    const moreText = document.querySelector('.more-text');

    btnReadMore.addEventListener('click', () => {
        moreText.style.display = 'block';
        btnReadMore.style.display = 'none';
        btnReadLess.style.display = 'inline';
    });

    btnReadLess.addEventListener('click', () => {
        moreText.style.display = 'none';
        btnReadMore.style.display = 'inline';
        btnReadLess.style.display = 'none';
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Select elements
    const startButton = document.querySelector('.btn-Start');
    const aboutButton = document.querySelector('.btn-About');
    const exitButton = document.querySelector('.exit-btn');
    const continueButton = document.querySelector('.continue-btn');
    const enterButton = document.querySelector('.btn-enter');
    const exitBtn = document.querySelector('.btn-exit'); 
    const btnSubmit = document.querySelector('.submit');
    const btnRestart = document.querySelector('.btn-restart');

    const main = document.querySelector('.main');
    const quizInfo = document.querySelector('.Quiz-Info');
    const aboutSection = document.querySelector('#about');
    const container = document.querySelector('.container');
    const quizScreen = document.querySelector('.quiz');
    const startScreen = document.querySelector('.start-screen');
    const endScreen = document.querySelector('.end-screen');

    const numQuestionsSelect = document.getElementById('num-questions');
    const difficultySelect = document.getElementById('difficulty');
    const timeSelect = document.getElementById('time');

    let currentQuestionIndex = 0;
    let score = 0;
    let questions = [];
    let timer;
    let timeLimit;
    let hasAnswered = false;

    // Event listeners
    startButton.addEventListener('click', () => toggleVisibility(main, quizInfo));
    aboutButton.addEventListener('click', () => aboutSection.scrollIntoView({ behavior: 'smooth' }));
    exitButton.addEventListener('click', () => toggleVisibility(quizInfo, main));
    continueButton.addEventListener('click', () => toggleVisibility(quizInfo, container));
    enterButton.addEventListener('click', startQuiz);
    exitBtn.addEventListener('click', () => toggleVisibility(container, main));
    btnSubmit.addEventListener('click', submitAnswer);
    btnRestart.addEventListener('click', restartQuiz);
    difficultySelect.addEventListener('change', updateNumQuestionsOptions);

    // Start the quiz
    function startQuiz() {
        toggleVisibility(startScreen, quizScreen);
        fetchQuizQuestions();
    }

    // Fetch quiz questions with selected difficulty and number
    async function fetchQuizQuestions(retryCount = 0) {
        const numQuestions = numQuestionsSelect.value;
        let difficulty = difficultySelect.value;
        const category = '19'; // Default to Mathematics
        let url = `https://opentdb.com/api.php?amount=${numQuestions}&category=${category}&difficulty=${difficulty}&type=multiple&encode=base64`;
        
        try {
            console.log(`Fetching questions from URL: ${url}`);
            let response = await fetch(url);

            if (response.status === 429 && retryCount < 3) { 
                console.warn('Rate limit exceeded. Retrying in 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000)); 
                return fetchQuizQuestions(retryCount + 1); 
            }

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
            const data = await response.json();
            validateData(data);

            // Decode base64 encoded content
            questions = data.results.map(question => ({
                question: formatEquation(decodeBase64(question.question)),
                correct_answer: decodeBase64(question.correct_answer),
                incorrect_answers: question.incorrect_answers.map(decodeBase64)
            }));
        
            loadQuestion();
        
        } catch (error) {
            console.error('Error fetching quiz questions:', error);
            alert('There was an error fetching the quiz questions. Please try again.');
        }
    }

    // Validate API data
    function validateData(data) {
        if (!Array.isArray(data.results)) throw new Error('Invalid data format received from the API.');
        if (data.results.length < numQuestionsSelect.value) {
            handleFallback();
        }
    }

    // Handle fallback if not enough questions are available
    async function handleFallback() {
        let difficulty = difficultySelect.value === 'easy' ? 'medium' : 'hard';
        let url = `https://opentdb.com/api.php?amount=${numQuestionsSelect.value}&category=19&difficulty=${difficulty}&type=multiple&encode=base64`;
        console.log(`Fallback to ${difficulty} difficulty: ${url}`);

        try {
            let response = await fetch(url);
            const fallbackData = await response.json();

            if (!Array.isArray(fallbackData.results) || fallbackData.results.length < numQuestionsSelect.value) {
                alert('Not enough questions available for the selected settings. Please try different options.');
                return;
            }
            questions = fallbackData.results.map(question => ({
                question: formatEquation(decodeBase64(question.question)),
                correct_answer: decodeBase64(question.correct_answer),
                incorrect_answers: question.incorrect_answers.map(decodeBase64)
            }));
        
        } catch (error) {
            console.error('Error fetching fallback questions:', error);
            alert('There was an error fetching fallback questions. Please try again.');
        }
    }

    // Load a single question
    function loadQuestion() {
        if (currentQuestionIndex < questions.length) {
            showQuestion(questions[currentQuestionIndex]);
            startTimer();
        } else {
            showEndScreen();
        }
    }

    // Display question and answers
    function showQuestion(question) {
        const questionElem = document.querySelector('.question');
        const answerWrapper = document.querySelector('.answer-wrapper');
        const questionNumber = document.querySelector('.number');

        questionElem.innerHTML = question.question;
        questionNumber.innerHTML = `Question <span class="current">${currentQuestionIndex + 1}</span> <span class="total">/${questions.length}</span>`;

        // Use a short timeout to ensure MathJax renders the LaTeX
        setTimeout(() => MathJax.Hub.Queue(["Typeset", MathJax.Hub, questionElem]), 100);

        // Prepare answers
        answerWrapper.innerHTML = '';
        const answers = [...question.incorrect_answers, question.correct_answer].sort(() => Math.random() - 0);

        answers.forEach(answer => {
            const div = document.createElement('div');
            div.classList.add('answer');
            div.innerHTML = `<span class="text">${answer}</span>`;
            div.addEventListener('click', () => selectAnswer(div, answer));
            answerWrapper.appendChild(div);
        });

        // Disable submit button until an answer is selected
        btnSubmit.disabled = true;
    }

    // Start the timer for each question
    function startTimer() {
        clearInterval(timer);
        timeLimit = parseInt(timeSelect.value, 10);
        const progressText = document.querySelector('.progress-text');
        const progressBar = document.querySelector('.progress-bar');
        let timeLeft = timeLimit;

        hasAnswered = false; // Reset to false for each question

        progressText.textContent = `${timeLeft}s`;
        progressBar.style.width = '100%';
    
        timer = setInterval(() => {
            timeLeft--;
            progressText.textContent = `${timeLeft}s`;
            progressBar.style.width = `${(timeLeft / timeLimit) * 100}%`;
    
            if (timeLeft <= 0) {
                clearInterval(timer);
                handleAnswer();  // Timeout scenario
            }
        }, 1000);
    }
    
    // Handle answer selection
    function selectAnswer(selectedAnswer, answer) {
        // Only allow selecting if the question has not been answered and time hasn't run out
        if (hasAnswered) return;
    
        clearInterval(timer); // Stop the timer since the user answered
    
        const correctAnswer = questions[currentQuestionIndex].correct_answer;
    
        // Add correct or incorrect class to the selected answer
        selectedAnswer.classList.add(answer === correctAnswer ? 'correct' : 'incorrect');
    
        // Highlight the correct answer and disable all answer buttons
        document.querySelectorAll('.answer').forEach(el => {
            if (el.innerText === correctAnswer) el.classList.add('correct');
            el.classList.add('disabled');
        });
    
        // Update score only if the user answered correctly and before the timeout
        if (answer === correctAnswer && !hasAnswered) {
            score += 1;
        }
    
        hasAnswered = true; // Mark the question as answered
        btnSubmit.disabled = false; // Enable the submit button
    }
    
    // Handle answer submission or timeout
    function handleAnswer() {
        const correctAnswer = questions[currentQuestionIndex].correct_answer;
    
        // Highlight the correct answer and disable all answer buttons
        document.querySelectorAll('.answer').forEach(el => {
            if (el.innerText === correctAnswer) el.classList.add('correct');
            el.classList.add('disabled');
        });
    
        // Mark the question as answered after the timeout
        hasAnswered = true;
    
        btnSubmit.disabled = false; // Enable the submit button
    }
    
    // Submit the answer and load the next question
    function submitAnswer() {
        handleAnswer();  
        currentQuestionIndex++;
        loadQuestion();
    }
    
    // Display the end screen
    function showEndScreen() {
        toggleVisibility(quizScreen, endScreen);
        document.querySelector('.final-score').textContent = `Your score: ${score} / ${numQuestionsSelect.value}`;
        document.querySelector('.difficulty').textContent = `Difficulty: ${difficultySelect.value}`;
        document.querySelector('.time').textContent = `Time: ${timeSelect.value}s`;
    }
    
    // Restart the quiz
    function restartQuiz() {
        score = 0;
        currentQuestionIndex = 0;
        toggleVisibility(endScreen, startScreen);
    }
    
    // Utility function to toggle visibility between two elements
    function toggleVisibility(hideElement, showElement) {
        hideElement.classList.remove('active');
        hideElement.classList.add('hide');
        showElement.classList.remove('hide');
        showElement.classList.add('active');
    }
    
    // Function to format equation text with LaTeX
    function formatEquation(equation) {
        return equation
        .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')  
        .replace(/(\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}') 
        .replace(/(\d+)\s*\^\s*(\d+)/g, '{$1}^{$2}')  
        .replace(/atto-/g, '10^{-18}')  
        .replace(/am/g, 'attometers'); 
    }
    
    // Decode base64 encoded content
    function decodeBase64(str) {
        return atob(str).replace(/\s+/g, ' ');
    }
    
    // Update number of questions options based on difficulty
    function updateNumQuestionsOptions() {
        const difficulty = difficultySelect.value;
        const numQuestions = numQuestionsSelect.value;

        // Reset and populate options based on difficulty
        numQuestionsSelect.innerHTML = '';

        let options = [];
        if (difficulty === 'easy') {
            options = ['5'];
        } else if (difficulty === 'medium') {
            options = ['5', '10'];
        } else if (difficulty === 'hard') {
            options = ['10'];
        }

        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            numQuestionsSelect.appendChild(opt);
        });

        // Set default value if current value is not available
        if (!options.includes(numQuestions)) {
            numQuestionsSelect.value = options[0];
        }
    }
    
    updateNumQuestionsOptions();
});


